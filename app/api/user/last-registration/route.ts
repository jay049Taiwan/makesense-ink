import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/user/last-registration?formType=走讀
 *
 * 回傳該登入用戶最近一筆「同類型報名」的 contact + attendees[]，
 * 用於 RegistrationModal 的 defaultValue 自動帶入。
 *
 * - 依 member_id 找 orders，最新的一筆含指定 formType 的 order
 * - 回傳該 order 所有 registrations（按 created_at 排序 = 報名者 1, 2, 3...）
 * - custom_fields 會扁平化合併到每個 attendee，讓 id_number 等自訂欄位也帶回
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ contact: null, attendees: [] });

  const formType = req.nextUrl.searchParams.get("formType") || "";

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, name, phone, email")
    .eq("email", email)
    .maybeSingle();
  if (!member) return NextResponse.json({ contact: null, attendees: [] });

  // 找最近一筆 orders，且至少有一個 order_item 是指定 formType
  let orderQuery = supabaseAdmin
    .from("orders")
    .select("id, created_at, order_items!inner(id, item_type)")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (formType) {
    orderQuery = orderQuery.eq("order_items.item_type", formType);
  }

  const { data: orders } = await orderQuery;
  const targetOrder = orders?.[0];

  if (!targetOrder) {
    // 沒有任何報名紀錄，只給 contact（email/phone）
    return NextResponse.json({
      contact: { name: member.name || "", phone: member.phone || "", email: member.email || email },
      attendees: [],
    });
  }

  // 撈該 order 的 registrations，按建立順序
  const orderItemIds = (targetOrder.order_items || []).map((oi: any) => oi.id);
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("attendee_name, attendee_phone, attendee_email, birth_date, dietary, emergency_contact, custom_fields, created_at")
    .in("order_item_id", orderItemIds)
    .order("created_at", { ascending: true });

  const attendees = (regs || []).map((r) => {
    const custom = (r.custom_fields as Record<string, any>) || {};
    return {
      name: r.attendee_name || custom.name || "",
      phone: r.attendee_phone || custom.phone || "",
      email: r.attendee_email || custom.email || "",
      id_number: custom.id_number || "",
      birth_date: r.birth_date || custom.birth_date || "",
    };
  });

  return NextResponse.json({
    contact: {
      name: member.name || attendees[0]?.name || "",
      phone: member.phone || attendees[0]?.phone || "",
      email: member.email || email,
    },
    attendees,
  });
}
