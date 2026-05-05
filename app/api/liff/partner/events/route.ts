import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/events
 * Body: { accessToken: string }
 *
 * 回傳該廠商名下的活動清單 + 報名統計
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "缺少 accessToken" }, { status: 400 });
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

    const { data: events } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date, capacity, cover_url, status, location")
      .contains("related_partner_ids", [partner.notion_id])
      .order("event_date", { ascending: false });

    const eventIds = (events || []).map((e) => e.id);
    const { data: items } = eventIds.length
      ? await supabase
          .from("order_items")
          .select("item_id, quantity, order_id")
          .in("item_id", eventIds)
          .neq("item_type", "商品")
      : { data: [] as any[] };

    const orderIds = [...new Set((items || []).map((i: any) => i.order_id))];
    const { data: orders } = orderIds.length
      ? await supabase.from("orders").select("id, status, checkin_status").in("id", orderIds)
      : { data: [] as any[] };
    const ordersById = new Map((orders || []).map((o: any) => [o.id, o]));

    const statsByEvent: Record<string, { registered: number; checkedIn: number }> = {};
    for (const it of items || []) {
      const o = ordersById.get(it.order_id);
      if (!o || o.status === "cancelled") continue;
      const k = it.item_id;
      if (!statsByEvent[k]) statsByEvent[k] = { registered: 0, checkedIn: 0 };
      statsByEvent[k].registered += Number(it.quantity || 0);
      if (o.checkin_status === "checked_in") {
        statsByEvent[k].checkedIn += Number(it.quantity || 0);
      }
    }

    const enriched = (events || []).map((e) => {
      const stats = statsByEvent[e.id] || { registered: 0, checkedIn: 0 };
      return {
        id: e.notion_id || e.id,
        title: e.title,
        date: e.event_date,
        capacity: e.capacity,
        cover_url: e.cover_url,
        location: e.location,
        status: e.status,
        registered: stats.registered,
        checkedIn: stats.checkedIn,
      };
    });

    return NextResponse.json({
      ok: true,
      partner: { id: partner.id, name: partner.name },
      events: enriched,
    });
  } catch (err: any) {
    console.error("[liff/partner/events] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
