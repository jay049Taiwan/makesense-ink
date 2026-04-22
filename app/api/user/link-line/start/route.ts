import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomBytes, createHmac } from "crypto";

// 產生附 HMAC 的 state，callback 時驗證避免 CSRF
function signState(raw: string, secret: string) {
  const sig = createHmac("sha256", secret).update(raw).digest("hex").slice(0, 16);
  return `${raw}.${sig}`;
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));

  const clientId = process.env.AUTH_LINE_ID!;
  const secret = process.env.NEXTAUTH_SECRET!;
  const siteUrl = process.env.NEXTAUTH_URL!;
  const redirectUri = `${siteUrl}/api/user/link-line/callback`;

  const nonce = randomBytes(12).toString("hex");
  const raw = Buffer.from(JSON.stringify({ e: email, n: nonce, t: Date.now() })).toString("base64url");
  const state = signState(raw, secret);

  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "profile openid");

  return NextResponse.redirect(authUrl.toString());
}
