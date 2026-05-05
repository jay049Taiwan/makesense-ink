import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/user/partner-info
 * 回傳當前 NextAuth session 使用者（合作夥伴）自己的 partners row。
 * 包含 contact (email/phone/address) — 因 RLS 鎖到 service_role，
 * 客戶端不再能直接 SELECT contact，改透過此 endpoint。
 *
 * 反查順序：
 * 1. session.notionId → partners.notion_id
 * 2. fallback: session.email → partners.contact->>email
 */
export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "未登入" }, { status: 401 });
  }
  const notionId = (session as any).notionId?.replace(/-/g, "") || null;

  let partner: any = null;
  if (notionId) {
    const { data } = await supabaseAdmin
      .from("partners")
      .select("id, notion_id, name, type, status, contact, joined_at, created_at")
      .eq("notion_id", notionId)
      .maybeSingle();
    partner = data;
  }
  if (!partner) {
    const { data } = await supabaseAdmin
      .from("partners")
      .select("id, notion_id, name, type, status, contact, joined_at, created_at")
      .eq("contact->>email", email)
      .maybeSingle();
    partner = data;
  }

  return NextResponse.json({ ok: true, partner: partner || null });
}
