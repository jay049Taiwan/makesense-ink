import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/points
 * 回傳目前登入會員的點數餘額 + 流水 + 文化時數
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "找不到會員" }, { status: 404 });

  const [{ data: balance }, { data: ledger }, { data: eventItems }] = await Promise.all([
    supabaseAdmin
      .from("point_balance")
      .select("spending_points, books_purchased, articles_unlocked, distance_km, checkin_count, last_updated")
      .eq("member_id", member.id)
      .maybeSingle(),
    supabaseAdmin
      .from("point_ledger")
      .select("id, type, value, source_table, source_id, note, expires_at, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(100),
    // 文化時數：該會員購買的走讀/市集活動，各活動 duration_min 加總
    supabaseAdmin
      .from("order_items")
      .select("meta, orders!inner(member_id)")
      .eq("orders.member_id", member.id)
      .in("item_type", ["走讀", "市集"]),
  ]);

  // 計算文化時數：依 eventId 去重，再加總 duration_min（預設 120 分鐘）
  let cultureHours = 0;
  if (eventItems && eventItems.length > 0) {
    const seenEventIds = new Set<string>();
    const eventIds: string[] = [];
    for (const item of eventItems) {
      const eventId = (item.meta as any)?.eventId;
      if (eventId && !seenEventIds.has(eventId)) {
        seenEventIds.add(eventId);
        eventIds.push(eventId);
      }
    }
    if (eventIds.length > 0) {
      const { data: events } = await supabaseAdmin
        .from("events")
        .select("notion_id, duration_min")
        .in("notion_id", eventIds);
      const totalMin = (events || []).reduce(
        (sum, e) => sum + (e.duration_min ?? 120),
        0
      );
      cultureHours = Math.round((totalMin / 60) * 10) / 10; // 小數點一位
    }
  }

  return NextResponse.json({
    balance: balance || {
      spending_points: 0, books_purchased: 0, articles_unlocked: 0,
      distance_km: 0, checkin_count: 0, last_updated: null,
    },
    ledger: ledger || [],
    cultureHours,
  });
}
