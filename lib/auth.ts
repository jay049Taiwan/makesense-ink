import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LINE from "next-auth/providers/line";
import { fetchPersonByEmail, fetchPersonByLineUid, checkIsStaff, checkIsVendor, checkMemberStatus } from "./fetch-all";
import { createPage, updatePage, DB } from "./notion";
import { normalizeEmail } from "./email";
import { supabaseAdmin } from "./supabase";

// 登入時把會員資料 upsert 到 Supabase members（以正規化 email 為鍵）
async function upsertSupabaseMember(email: string, name: string, lineUid: string | null) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("members")
      .select("id, name, line_uid")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      const updates: Record<string, any> = {};
      if (lineUid && !existing.line_uid) updates.line_uid = lineUid;
      if (name && !existing.name) updates.name = name;
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("members").update(updates).eq("id", existing.id);
      }
    } else {
      await supabaseAdmin.from("members").insert({ email, name, line_uid: lineUid });
    }
  } catch (e) {
    console.error("upsertSupabaseMember error:", e);
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Vercel 自訂網域需要 trustHost 才會放行 session cookie
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    LINE({
      clientId: process.env.AUTH_LINE_ID!,
      clientSecret: process.env.AUTH_LINE_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      const rawEmail = user.email;
      const email = normalizeEmail(rawEmail);
      const lineUid = account?.provider === "line" ? account.providerAccountId : null;
      const displayName = user.name || email || lineUid || "會員";

      // 有 email → 用正規化 email 比對 DB08
      if (email) {
        // 同步寫入 Supabase members（不阻擋登入）
        upsertSupabaseMember(email, user.name || "", lineUid).catch(() => {});

        // 傳入 rawEmail 讓 fetchPersonByEmail 可同時 fallback 查舊的帶點 email
        const person = await fetchPersonByEmail(rawEmail || email);
        if (!person) {
          try {
            const props: any = {
              "經營名稱": { title: [{ text: { content: displayName } }] },
              "Email": { rich_text: [{ text: { content: email } }] },   // 永遠寫 normalized
              "會員狀態": { status: { name: "會員" } },
              "關係選項": { select: { name: "個人" } },
            };
            if (lineUid) {
              props["LINE_UID"] = { rich_text: [{ text: { content: lineUid } }] };
            }
            await createPage(DB.DB08_RELATIONSHIP, props);
          } catch (e) {
            console.error("Failed to create DB08 entry:", e);
          }
        } else {
          // 已存在：確保 會員狀態=會員 + 補 LINE_UID；若 rawEmail 帶點則順手 normalize Notion email
          try {
            const updates: any = {
              "會員狀態": { status: { name: "會員" } },
            };
            // rawEmail 與 normalized 不同（如 Gmail 帶點）→ 更新 Notion 為 normalized 版本
            if (rawEmail && rawEmail !== email) {
              updates["Email"] = { rich_text: [{ text: { content: email } }] };
            }
            if (lineUid) {
              updates["LINE_UID"] = { rich_text: [{ text: { content: lineUid } }] };
            }
            await updatePage(person.id, updates);
          } catch (e) {
            console.error("Failed to update DB08 entry:", e);
          }
        }
        return true;
      }

      // 沒有 email（LINE 用戶未提供）→ 用 LINE_UID 比對
      if (lineUid) {
        const existingPerson = await fetchPersonByLineUid(lineUid);
        if (!existingPerson) {
          try {
            await createPage(DB.DB08_RELATIONSHIP, {
              "經營名稱": { title: [{ text: { content: displayName } }] },
              "LINE_UID": { rich_text: [{ text: { content: lineUid } }] },
            });
          } catch (e) {
            console.error("Failed to create DB08 entry for LINE user:", e);
          }
        }
        return true;
      }

      // 既沒有 email 也沒有 LINE UID → 不允許登入
      return false;
    },

    // 把身份資訊寫進 JWT，避免每次 request 都打 Notion API。
    // - signIn 時抓一次寫進 token
    // - 每 30 分鐘 stale 時自動 refresh
    // - 之後 session() 只從 token 讀，幾乎 0ms
    async jwt({ token, trigger }) {
      const REFRESH_MS = 30 * 60 * 1000; // 30 分鐘
      const lastChecked = (token as any).rolesCheckedAt || 0;
      const stale = Date.now() - lastChecked > REFRESH_MS;
      const shouldRefresh = trigger === "signIn" || trigger === "update" || stale || !(token as any).role;

      if (token.email && shouldRefresh) {
        const lookupEmail = token.email as string;
        try {
          const [person, isStaff, isVendor, memberStatus] = await Promise.all([
            fetchPersonByEmail(lookupEmail),
            checkIsStaff(lookupEmail),
            checkIsVendor(lookupEmail),
            checkMemberStatus(lookupEmail),
          ]);
          (token as any).role = isStaff ? "staff" : isVendor ? "vendor" : "member";
          (token as any).memberStatus = memberStatus || null;
          (token as any).notionId = person?.id || null;
          (token as any).displayName = person?.name || null;
          (token as any).rolesCheckedAt = Date.now();
        } catch (e) {
          console.error("[auth/jwt] role refresh failed:", e);
          // 失敗不擋登入，保留舊 token 值
        }
      }
      return token;
    },

    async session({ session, token }) {
      // 全部從 token 讀，不打 Notion
      if (session.user?.email) {
        (session as any).role = (token as any).role || "member";
        (session as any).memberStatus = (token as any).memberStatus || null;
        (session as any).notionId = (token as any).notionId || null;
        (session as any).displayName = (token as any).displayName || session.user?.name;
      } else {
        // 沒有 email（LINE 用戶）→ 預設一般會員
        (session as any).role = "member";
        (session as any).memberStatus = "會員";
        (session as any).notionId = null;
        (session as any).displayName = session.user?.name || "LINE 會員";
      }
      return session;
    },
  },

  // 不覆寫 cookies — 讓 NextAuth v5 用預設（__Secure-authjs.session-token），
  // 自訂成 v4 的 next-auth.session-token 會跟 v5 讀取時命名不符導致 session 讀不到。

  pages: {
    signIn: "/login",
  },

});
