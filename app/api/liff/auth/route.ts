import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/auth
 * Body: { accessToken: string }
 * Verifies LINE access token → looks up member by line_uid
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ authorized: false, message: "缺少 access token" }, { status: 400 });
    }

    // Verify token with LINE API
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.json({ authorized: false, message: "LINE token 無效" }, { status: 401 });
    }

    const profile = await profileRes.json();
    const lineUid = profile.userId;

    // Look up member by line_uid
    const { data: member } = await supabase
      .from("members")
      .select("id, name, email, member_type, line_uid")
      .eq("line_uid", lineUid)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({
        authorized: false,
        needsBind: true,
        lineProfile: { userId: lineUid, displayName: profile.displayName, pictureUrl: profile.pictureUrl },
        message: "此 LINE 帳號尚未綁定會員",
      });
    }

    const role = member.member_type === "staff" ? "staff" : member.member_type === "vendor" ? "vendor" : "member";

    return NextResponse.json({
      authorized: true,
      role,
      memberId: member.id,
      name: member.name,
      email: member.email,
      lineProfile: { userId: lineUid, displayName: profile.displayName, pictureUrl: profile.pictureUrl },
    });
  } catch (err: any) {
    console.error("LIFF auth error:", err);
    return NextResponse.json({ authorized: false, error: err.message }, { status: 500 });
  }
}
