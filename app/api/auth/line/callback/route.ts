import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchPersonByEmail } from "@/lib/fetch-all";
import { createPage, DB } from "@/lib/notion";

const LINE_CLIENT_ID = process.env.AUTH_LINE_ID || "";
const LINE_CLIENT_SECRET = process.env.AUTH_LINE_SECRET || "";
const REDIRECT_URI = process.env.NODE_ENV === "production"
  ? "https://makesense.ink/api/auth/line/callback"
  : "http://localhost:3000/api/auth/line/callback";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=line_denied", request.url));
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("LINE token error:", err);
      return NextResponse.redirect(new URL("/login?error=line_token", request.url));
    }

    const tokens = await tokenRes.json();

    // 2. Get profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // 3. Get email from id_token
    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `id_token=${tokens.id_token}&client_id=${LINE_CLIENT_ID}`,
        });
        const verified = await verifyRes.json();
        email = verified.email || null;
      } catch {}
    }

    const lineUid = profile.userId;
    const displayName = profile.displayName || "LINE 會員";

    // 4. Check/create DB08 entry
    if (email) {
      const person = await fetchPersonByEmail(email);
      if (!person) {
        try {
          await createPage(DB.DB08_RELATIONSHIP, {
            "經營名稱": { title: [{ text: { content: displayName } }] },
            "Email": { rich_text: [{ text: { content: email } }] },
            "LINE_UID": { rich_text: [{ text: { content: lineUid } }] },
          });
        } catch (e) {
          console.error("Failed to create DB08:", e);
        }
      }
    } else {
      // No email — create with LINE_UID only
      try {
        await createPage(DB.DB08_RELATIONSHIP, {
          "經營名稱": { title: [{ text: { content: displayName } }] },
          "LINE_UID": { rich_text: [{ text: { content: lineUid } }] },
        });
      } catch (e) {
        console.error("Failed to create DB08:", e);
      }
    }

    // 5. Set a simple session cookie
    const cookieStore = await cookies();
    const sessionData = JSON.stringify({
      name: displayName,
      email: email || null,
      lineUid,
      image: profile.pictureUrl || null,
      role: "member",
    });

    cookieStore.set("line-session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: ".makesense.ink",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // 6. Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));

  } catch (e) {
    console.error("LINE callback error:", e);
    return NextResponse.redirect(new URL("/login?error=line_server", request.url));
  }
}
