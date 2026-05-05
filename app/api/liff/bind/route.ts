import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/bind
 * Body: { lineUid: string, email: string }
 * Binds a LINE user to an existing member by email
 */
export async function POST(req: NextRequest) {
  try {
    const { lineUid, email } = await req.json();
    if (!lineUid || !email) {
      return NextResponse.json({ success: false, message: "缺少 lineUid 或 email" }, { status: 400 });
    }

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
      .eq("email", email)
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
