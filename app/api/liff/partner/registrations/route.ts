import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/registrations
 * Body: { accessToken: string, eventId: string }  // eventId = notion_id 或 UUID
 *
 * 回傳該活動的報名清單（廠商需擁有該活動）
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, eventId } = await req.json();
    if (!accessToken || !eventId) {
      return NextResponse.json({ ok: false, message: "缺少參數" }, { status: 400 });
    }
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ ok: false, message: "LINE token 無效" }, { status: 401 });
    }
    const { userId: lineUid } = await profileRes.json();

    const { data: member } = await supabase
      .from("members")
      .select("email")
      .eq("line_uid", lineUid)
      .maybeSingle();
    if (!member?.email) return NextResponse.json({ ok: true, partner: null });

    const { data: partner } = await supabase
      .from("partners")
      .select("id, notion_id, name")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();
    if (!partner) return NextResponse.json({ ok: true, partner: null });

    // 找活動：notion_id 或 UUID 都可
    const cleanId = eventId.replace(/-/g, "").toLowerCase();
    const { data: event } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date, related_partner_ids")
      .or(`notion_id.eq.${cleanId},id.eq.${eventId}`)
      .maybeSingle();
    if (!event) {
      return NextResponse.json({ ok: false, message: "找不到活動" }, { status: 404 });
    }

    // 權限驗證：partner 是否擁有該活動
    const partners = (event.related_partner_ids || []) as string[];
    if (!partners.includes(partner.notion_id)) {
      return NextResponse.json({ ok: false, message: "無權檢視" }, { status: 403 });
    }

    // 撈報名 = order_items where item_id = event.id AND item_type = 'event'
    const { data: items } = await supabase
      .from("order_items")
      .select("id, order_id, quantity, price, meta, created_at")
      .eq("item_id", event.id)
      .neq("item_type", "商品")
      .order("created_at", { ascending: false });

    const orderIds = [...new Set((items || []).map((i: any) => i.order_id))];
    const { data: orders } = orderIds.length
      ? await supabase
          .from("orders")
          .select("id, status, checkin_status, created_at, member_id")
          .in("id", orderIds)
      : { data: [] as any[] };
    const ordersById = new Map((orders || []).map((o: any) => [o.id, o]));

    // 報名人姓名/電話從 registrations 取（每個 order_item 可能有多人）
    const itemIds = (items || []).map((i: any) => i.id);
    const { data: regs } = itemIds.length
      ? await supabase
          .from("registrations")
          .select("order_item_id, attendee_name, attendee_phone, attendee_email")
          .in("order_item_id", itemIds)
      : { data: [] as any[] };
    const regsByItem = new Map<string, any[]>();
    for (const r of regs || []) {
      const arr = regsByItem.get(r.order_item_id) || [];
      arr.push(r);
      regsByItem.set(r.order_item_id, arr);
    }

    const rows: any[] = [];
    for (const it of items || []) {
      const o = ordersById.get(it.order_id);
      if (!o || o.status === "cancelled") continue;
      const ticketName = (it.meta as any)?.subtitle || (it.meta as any)?.name || "票券";
      const attendees = regsByItem.get(it.id) || [];
      if (attendees.length === 0) {
        rows.push({
          orderId: it.order_id,
          orderItemId: it.id,
          name: "（未填）",
          phone: "",
          email: "",
          ticket: ticketName,
          qty: it.quantity,
          checkin_status: o.checkin_status || "pending",
          created_at: it.created_at,
        });
      } else {
        for (const a of attendees) {
          rows.push({
            orderId: it.order_id,
            orderItemId: it.id,
            name: a.attendee_name || "（未填）",
            phone: a.attendee_phone || "",
            email: a.attendee_email || "",
            ticket: ticketName,
            qty: 1,
            checkin_status: o.checkin_status || "pending",
            created_at: it.created_at,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      event: { id: event.notion_id || event.id, title: event.title, date: event.event_date },
      registrations: rows,
      summary: {
        total: rows.length,
        checkedIn: rows.filter((r) => r.checkin_status === "checked_in").length,
        pending: rows.filter((r) => r.checkin_status !== "checked_in").length,
      },
    });
  } catch (err: any) {
    console.error("[liff/partner/registrations] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
