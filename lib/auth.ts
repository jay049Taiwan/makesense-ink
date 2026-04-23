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

        const person = await fetchPersonByEmail(email);
        if (!person) {
          try {
            const props: any = {
              "經營名稱": { title: [{ text: { content: displayName } }] },
              "Email": { rich_text: [{ text: { content: email } }] },
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
          // 已存在：確保 會員狀態=會員 + 關係選項=個人（如果為空）+ 補 LINE_UID
          try {
            const updates: any = {
              "會員狀態": { status: { name: "會員" } },
            };
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

    async session({ session }) {
      const email = normalizeEmail(session.user?.email);

      if (email) {
        // 有 email → 用 email 查角色（staff > vendor > member）
        const person = await fetchPersonByEmail(email);
        const isStaff = await checkIsStaff(email);
        const isVendor = !isStaff && await checkIsVendor(email);
        const memberStatus = await checkMemberStatus(email);
        (session as any).role = isStaff ? "staff" : isVendor ? "vendor" : "member";
        (session as any).memberStatus = memberStatus; // "會員" | "非會員" | "無會員" | null
        (session as any).notionId = person?.id || null;
        (session as any).displayName = person?.name || session.user?.name;
      } else {
        // 沒有 email（LINE 用戶）→ 預設一般會員
        (session as any).role = "member";
        (session as any).memberStatus = "會員"; // LINE 登入自動為會員
        (session as any).notionId = null;
        (session as any).displayName = session.user?.name || "LINE 會員";
      }

      return session;
    },
  },

  // Cookie 預設跟著當前 host（makesense.ink 或 Vercel preview URL 都吃得到）
  // 若未來要跨子網域共用登入，再用環境變數 AUTH_COOKIE_DOMAIN 指定
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
      },
    },
  },

  pages: {
    signIn: "/login",
  },

});
