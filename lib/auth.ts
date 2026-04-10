import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LINE from "next-auth/providers/line";
import { fetchPersonByEmail, checkIsStaff } from "./fetch-all";
import { createPage, DB } from "./notion";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
      const email = user.email;
      const lineUid = account?.provider === "line" ? account.providerAccountId : null;
      const displayName = user.name || email || lineUid || "會員";

      // 有 email → 用 email 比對 DB08
      if (email) {
        const person = await fetchPersonByEmail(email);
        if (!person) {
          try {
            const props: any = {
              "經營名稱": { title: [{ text: { content: displayName } }] },
              "Email": { rich_text: [{ text: { content: email } }] },
            };
            // LINE 登入同時存 LINE_UID
            if (lineUid) {
              props["LINE_UID"] = { rich_text: [{ text: { content: lineUid } }] };
            }
            await createPage(DB.DB08_RELATIONSHIP, props);
          } catch (e) {
            console.error("Failed to create DB08 entry:", e);
          }
        } else if (lineUid) {
          // 已存在的用戶，補上 LINE_UID（如果還沒有的話）
          // TODO: updatePage 補寫 LINE_UID
        }
        return true;
      }

      // 沒有 email（LINE 用戶未提供）→ 用 LINE_UID 比對
      if (lineUid) {
        // TODO: 查 DB08 的 LINE_UID 欄位
        // 目前先直接建立新用戶
        try {
          await createPage(DB.DB08_RELATIONSHIP, {
            "經營名稱": { title: [{ text: { content: displayName } }] },
            "LINE_UID": { rich_text: [{ text: { content: lineUid } }] },
          });
        } catch (e) {
          console.error("Failed to create DB08 entry for LINE user:", e);
        }
        return true;
      }

      // 既沒有 email 也沒有 LINE UID → 不允許登入
      return false;
    },

    async session({ session }) {
      const email = session.user?.email;

      if (email) {
        // 有 email → 用 email 查角色
        const person = await fetchPersonByEmail(email);
        const isStaff = await checkIsStaff(email);
        (session as any).role = isStaff ? "staff" : "member";
        (session as any).notionId = person?.id || null;
        (session as any).displayName = person?.name || session.user?.name;
      } else {
        // 沒有 email（LINE 用戶）→ 預設一般會員
        (session as any).role = "member";
        (session as any).notionId = null;
        (session as any).displayName = session.user?.name || "LINE 會員";
      }

      return session;
    },
  },

  // Cookie 設在 .makesense.ink，所有子網域共用登入狀態
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".makesense.ink" : undefined,
      },
    },
  },

  pages: {
    signIn: "/login",
  },

});
