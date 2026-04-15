import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { lineClient, buildLiffUrl } from "@/lib/line";
import { checkPushLimit, checkMonthlyPushCap } from "@/lib/line-ratelimit";
import { FlexBubble, FlexMessage } from "@line/bot-sdk";

export const maxDuration = 30;

/**
 * POST /api/line/event-followup
 * 活動結束當天晚上，推播感謝 + 評價邀請 + 下次活動預告
 * n8n 每天 20:00 呼叫
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 檢查月額
  const { allowed: monthOk, count, cap } = await checkMonthlyPushCap();
  if (!monthOk) {
    return NextResponse.json({ sent: 0, warning: `月推播已達 ${count}/${cap}，暫停非必要推播` });
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 找今天舉辦的活動
  const { data: events } = await supabase
    .from("events")
    .select("id, notion_id, title, event_date")
    .eq("status", "active")
    .gte("event_date", `${todayStr}T00:00:00`)
    .lte("event_date", `${todayStr}T23:59:59`);

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: "No events today" });
  }

  // 找下一場活動（預告用）
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: nextEvents } = await supabase
    .from("events")
    .select("title, event_date")
    .eq("status", "active")
    .gte("event_date", tomorrow.toISOString())
    .order("event_date", { ascending: true })
    .limit(1);

  const nextEvent = nextEvents?.[0] || null;

  let totalSent = 0;

  for (const event of events) {
    // 找已報名的用戶
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id")
      .or("item_type.eq.走讀,item_type.eq.講座,item_type.eq.市集,item_type.eq.空間,item_type.eq.諮詢")
      .eq("item_id", event.notion_id || event.id);

    if (!orderItems || orderItems.length === 0) continue;

    const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id, member_id")
      .in("id", orderIds)
      .neq("status", "cancelled");

    if (!orders) continue;

    const memberIds = [...new Set(orders.map(o => o.member_id).filter(Boolean))];
    const { data: members } = await supabase
      .from("members")
      .select("id, line_uid")
      .in("id", memberIds)
      .not("line_uid", "is", null);

    if (!members) continue;

    for (const member of members) {
      const allowed = await checkPushLimit(member.line_uid!);
      if (!allowed) continue;

      const message = buildEventFollowupFlex({
        eventTitle: event.title,
        nextEventTitle: nextEvent?.title || null,
        nextEventDate: nextEvent?.event_date || null,
      });

      try {
        await lineClient.pushMessage({ to: member.line_uid!, messages: [message] });
        await supabase.from("line_message_log").insert({
          user_id: member.line_uid,
          message_type: "push",
          template: "event_followup",
          payload: { eventTitle: event.title },
        });
        totalSent++;
      } catch (err: any) {
        console.error(`[event-followup] Push failed:`, err.message);
      }
    }
  }

  return NextResponse.json({ sent: totalSent });
}

function buildEventFollowupFlex(data: {
  eventTitle: string;
  nextEventTitle: string | null;
  nextEventDate: string | null;
}): FlexMessage {
  const contents: any[] = [
    { type: "text", text: "🎉 感謝參加！", size: "md", weight: "bold", color: "#4ECDC4" },
    { type: "separator" },
    { type: "text", text: data.eventTitle, size: "lg", weight: "bold", wrap: true, margin: "md" },
    { type: "text", text: "感謝你今天的參與！\n歡迎到會員中心寫下你的心得和評價，幫助我們做得更好 💪", size: "sm", color: "#666", wrap: true, margin: "md" },
  ];

  if (data.nextEventTitle && data.nextEventDate) {
    const dateStr = new Date(data.nextEventDate).toLocaleDateString("zh-TW", {
      month: "long", day: "numeric", weekday: "short",
    });
    contents.push(
      { type: "separator", margin: "lg" },
      { type: "text", text: "📅 下一場活動", size: "xs", weight: "bold", color: "#e8935a", margin: "md" },
      { type: "text", text: `${data.nextEventTitle}\n${dateStr}`, size: "sm", color: "#333", wrap: true, margin: "sm" }
    );
  }

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: { type: "box", layout: "vertical", spacing: "md", contents },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "寫評價", uri: buildLiffUrl("dashboard") },
          style: "primary",
          color: "#4ECDC4",
          height: "sm",
        },
        ...(data.nextEventTitle ? [{
          type: "button" as const,
          action: { type: "uri" as const, label: "看下一場", uri: buildLiffUrl("liff/events") },
          style: "secondary" as const,
          height: "sm" as const,
        }] : []),
      ],
    },
  };

  return { type: "flex", altText: `🎉 感謝參加「${data.eventTitle}」！`, contents: bubble };
}
