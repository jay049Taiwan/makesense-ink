import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/bind
 * Body: { accessToken: string, email: string }
 * Verifies LINE access token → binds confirmed lineUid to an existing member by email
 *
 * Security: lineUid is derived server-side from LINE API, cannot be spoofed by client.
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, email } = await req.json();
    if (!accessToken || !email) {
      return NextResponse.json({ success: false, message: "缺少 accessToken 或 email" }, { status: 400 });
    }

    // Verify LINE access token → get real lineUid from LINE (cannot be faked)
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ success: false, message: "LINE token 無效" }, { status: 401 });
    }
    const profile = await profileRes.json();
    const lineUid: string = profile.userId;

    // Check if LINE UID already bound
    const { data: existing } = await supabase
      .from("members")
      .select("id, email")
      .eq("line_uid", lineUid)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, message: `此 LINE 帳號已綁定 ${existing.email}` }, { status: 409 });
    }

    // Find member by email
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ success: false, message: "找不到此 email 的會員" }, { status: 404 });
    }

    // Bind
    const { error } = await supabase
      .from("members")
      .update({ line_uid: lineUid })
      .eq("id", member.id);

    if (error) throw error;

    // 綁定後依角色切換 Rich Menu（partner 自動拿廠商選單）
    let role: "partner" | "member" = "member";
    try {
      const { bindRichMenuByRole } = await import("@/lib/line-richmenu");
      const result = await bindRichMenuByRole(lineUid);
      role = result.role;
    } catch (e: any) {
      console.warn("[liff/bind] richmenu sync failed:", e?.message);
    }

    return NextResponse.json({ success: true, memberId: member.id, role });
  } catch (err: any) {
    console.error("LIFF bind error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
