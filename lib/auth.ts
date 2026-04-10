import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { fetchPersonByEmail, checkIsStaff } from "./fetch-all";
import { createPage, DB } from "./notion";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // LINE provider 之後加
  ],

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // 查 DB08：這個 email 存在嗎？
      const person = await fetchPersonByEmail(user.email);

      if (!person) {
        // 不存在 → 自動在 DB08 建立新頁面（一般會員）
        try {
          await createPage(DB.DB08_RELATIONSHIP, {
            "經營名稱": {
              title: [{ text: { content: user.name || user.email } }],
            },
            "Email": {
              rich_text: [{ text: { content: user.email } }],
            },
          });
        } catch (e) {
          console.error("Failed to create DB08 entry:", e);
          // 建立失敗也允許登入
        }
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      // 查角色
      const person = await fetchPersonByEmail(session.user.email);
      const isStaff = await checkIsStaff(session.user.email);

      // 附加角色資訊到 session
      (session as any).role = isStaff ? "staff" : (person ? "member" : "member");
      (session as any).notionId = person?.id || null;
      (session as any).displayName = person?.name || session.user.name;

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
