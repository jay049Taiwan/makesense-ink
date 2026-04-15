import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { lineClient, buildLiffUrl } from "@/lib/line";
import { buildEventReminderFlex } from "@/lib/line-flex-templates";

export const maxDuration = 30;

/**
 * POST /api/line/event-reminder
 * n8n 每天 9AM 呼叫，推播活動提醒給已報名的用戶
 * 前 5 天 + 前 1 天各推一次
 */
export async function POST(req: NextRequest) {
  // 驗證 Bearer token
  const auth = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 計算目標日期：5 天後和 1 天後
  const fiveDaysLater = new Date(today);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  const oneDayLater = new Date(today);
  oneDayLater.setDate(oneDayLater.getDate() + 1);

  const targetDates = [
    { date: fiveDaysLater.toISOString().split("T")[0], label: "5 天後" },
    { date: oneDayLater.toISOString().split("T")[0], label: "明天" },
  ];

  let totalSent = 0;
  const results: any[] = [];

  for (const target of targetDates) {
    // 查找目標日期的活動
    const { data: events } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date, location, price, cover_url")
      .eq("status", "active")
      .gte("event_date", `${target.date}T00:00:00`)
      .lte("event_date", `${target.date}T23:59:59`);

    if (!events || events.length === 0) continue;

    for (const event of events) {
      // 查已報名的用戶（透過 order_items → orders → members）
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          meta
        `)
        .or(`item_type.eq.走讀,item_type.eq.講座,item_type.eq.市集,item_type.eq.空間,item_type.eq.諮詢`)
        .eq("item_id", event.notion_id || event.id);

      if (!orderItems || orderItems.length === 0) continue;

      const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];

      // 查找這些訂單的會員（只要有 LINE UID 的）
      const { data: orders } = await supabase
        .from("orders")
        .select("id, member_id, status")
        .in("id", orderIds)
        .neq("status", "cancelled");

      if (!orders || orders.length === 0) continue;

      const memberIds = [...new Set(orders.map(o => o.member_id).filter(Boolean))];

      const { data: members } = await supabase
        .from("members")
        .select("id, line_uid, name")
        .in("id", memberIds)
        .not("line_uid", "is", null);

      if (!members || members.length === 0) continue;

      // 對每個有 LINE 的會員推播
      for (const member of members) {
        const order = orders.find(o => o.member_id === member.id);
        if (!order) continue;

        const message = buildEventReminderFlex({
          title: event.title,
          date: event.event_date,
          location: event.location,
          timeLabel: target.label,
          orderId: order.id,
          slug: event.notion_id || event.id,
        });

        try {
          await lineClient.pushMessage({ to: member.line_uid!, messages: [message] });

          await supabase.from("line_message_log").insert({
            user_id: member.line_uid,
            message_type: "push",
            template: "event_reminder",
            payload: { eventTitle: event.title, timeLabel: target.label, orderId: order.id },
          });

          totalSent++;
        } catch (err: any) {
          console.error(`[event-reminder] Push failed for ${member.id}:`, err.message);
        }
      }

      results.push({
        event: event.title,
        timeLabel: target.label,
        memberCount: members.length,
      });
    }
  }

  return NextResponse.json({ sent: totalSent, results });
}
