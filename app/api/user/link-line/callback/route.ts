import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { fetchPersonByEmail } from "@/lib/fetch-all";
import { updatePage } from "@/lib/notion";

function verifyState(state: string, secret: string): { e: string; n: string; t: number } | null {
  const idx = state.lastIndexOf(".");
  if (idx < 0) return null;
  const raw = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac("sha256", secret).update(raw).digest("hex").slice(0, 16);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!payload.e || !payload.n || Date.now() - payload.t > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL!;
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=missing_params`);
  }

  const payload = verifyState(state, process.env.NEXTAUTH_SECRET!);
  if (!payload) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=invalid_state`);
  }

  const email = normalizeEmail(payload.e);
  if (!email) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=no_email`);
  }

  // 換 access token
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${siteUrl}/api/user/link-line/callback`,
      client_id: process.env.AUTH_LINE_ID!,
      client_secret: process.env.AUTH_LINE_SECRET!,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=token_failed`);
  }
  const tokenData = await tokenRes.json();

  // 拿 LINE user profile
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=profile_failed`);
  }
  const profile = await profileRes.json();
  const lineUid = profile.userId as string;
  const lineName = profile.displayName as string;

  // 檢查這個 LINE UID 有沒有已綁到別的 member
  const { data: clash } = await supabaseAdmin
    .from("members")
    .select("id, email")
    .eq("line_uid", lineUid)
    .maybeSingle();
  if (clash && clash.email !== email) {
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=already_bound`);
  }

  // 寫入當前會員（名稱為空才補，不覆蓋既有名稱）
  const { data: current } = await supabaseAdmin
    .from("members").select("name").eq("email", email).maybeSingle();
  const updates: Record<string, any> = { line_uid: lineUid };
  if ((!current?.name || current.name.trim() === "") && lineName) updates.name = lineName;

  const { data: updated, error } = await supabaseAdmin
    .from("members")
    .update(updates)
    .eq("email", email)
    .select("id, email, line_uid");
  if (error) {
    console.error("[link-line] supabase error:", error, "email=", email);
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=save_failed`);
  }
  if (!updated || updated.length === 0) {
    console.error("[link-line] no rows updated, email=", email);
    return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=save_failed`);
  }
  console.log("[link-line] bound", lineUid, "to", email);

  // 同步寫到 Notion DB08（不阻擋）
  try {
    const person = await fetchPersonByEmail(email);
    if (person) {
      await updatePage(person.id, {
        "LINE_UID": { rich_text: [{ text: { content: lineUid } }] },
      });
    }
  } catch (e) {
    console.error("DB08 LINE_UID update failed:", e);
  }

  return NextResponse.redirect(`${siteUrl}/dashboard?line_bind=success`);
}
