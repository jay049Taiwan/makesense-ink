import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/user/partner-applications
 * 回傳當前 NextAuth session 使用者（合作夥伴）的市集申請紀錄。
 * 用 session email → 反查 members.id → 撈 market_applications。
 */
export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    return NextResponse.json({ ok: false, applications: [] }, { status: 401 });
  }

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ ok: true, member: null, applications: [] });
  }

  const { data: applications } = await supabaseAdmin
    .from("market_applications")
    .select("id, event_id, vendor_name, status, created_at")
    .eq("member_id", member.id)
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, member: { id: member.id }, applications: applications || [] });
}
