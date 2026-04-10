import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { OAuthConfig } from "next-auth/providers";
import { fetchPersonByEmail, checkIsStaff } from "./fetch-all";
import { createPage, DB } from "./notion";

// LINE Login provider（NextAuth 沒有內建，自定義）
function LINE(): OAuthConfig<any> {
  return {
    id: "line",
    name: "LINE",
    type: "oauth",
    clientId: process.env.AUTH_LINE_ID,
    clientSecret: process.env.AUTH_LINE_SECRET,
    checks: ["none"],
    authorization: {
      url: "https://access.line.me/oauth2/v2.1/authorize",
      params: {
        scope: "profile openid email",
        response_type: "code",
      },
    },
    token: {
      url: "https://api.line.me/oauth2/v2.1/token",
      async request(context: any) {
        // 從 context 中取得所需資訊
        const { params, provider } = context;
        const code = params?.code ?? params?.get?.("code");
        const callbackUrl = provider?.callbackUrl ?? provider?.redirect_uri;
        const clientId = provider?.clientId ?? provider?.client_id;
        const clientSecret = provider?.clientSecret ?? provider?.client_secret;

        // 記錄 debug 資訊（可透過 /api/debug-line?check=token 查看）
        const debugInfo = {
          hasCode: !!code,
          codePrefix: code ? String(code).slice(0, 8) + "..." : "MISSING",
          callbackUrl: callbackUrl ?? "MISSING",
          clientId: clientId ? String(clientId).slice(0, 6) + "..." : "MISSING",
          hasClientSecret: !!clientSecret,
          paramsType: typeof params,
          paramsKeys: params ? Object.keys(params).slice(0, 10) : [],
          providerKeys: provider ? Object.keys(provider).filter((k: string) => !k.startsWith("_")).slice(0, 15) : [],
        };
        (globalThis as any).__lineDebug = debugInfo;

        if (!code || !callbackUrl || !clientId || !clientSecret) {
          throw new Error(`LINE token exchange missing params: ${JSON.stringify(debugInfo)}`);
        }

        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: String(callbackUrl),
          client_id: String(clientId),
          client_secret: String(clientSecret),
        });

        const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        const json = await res.json();
        (globalThis as any).__lineTokenResponse = {
          status: res.status,
          hasAccessToken: !!json.access_token,
          error: json.error,
          errorDescription: json.error_description,
        };

        if (!res.ok || json.error) {
          throw new Error(`LINE token error: ${json.error} - ${json.error_description}`);
        }

        return { tokens: json };
      },
    },
    userinfo: {
      url: "https://api.line.me/v2/profile",
      async request({ tokens }: any) {
        const res = await fetch("https://api.line.me/v2/profile", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await res.json();

        // Get email from id_token
        let email = null;
        if (tokens.id_token) {
          try {
            const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `id_token=${tokens.id_token}&client_id=${process.env.AUTH_LINE_ID}`,
            });
            const verified = await verifyRes.json();
            email = verified.email || null;
          } catch {}
        }

        return { id: profile.userId, name: profile.displayName, email, image: profile.pictureUrl };
      },
    },
    profile(profile: any) {
      return { id: profile.id, name: profile.name, email: profile.email, image: profile.image };
    },
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    LINE(),
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

  // 暫時開啟 debug 看 Vercel log 中的詳細錯誤
  debug: true,
});
