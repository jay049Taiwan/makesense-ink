import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { lineClient } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * POST /api/line/event-rsvp
 * 處理活動取消報名 — 從 LIFF 取消頁面呼叫
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, reason, lineUid } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    // 更新訂單狀態為 cancelled
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("id, member_id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 記錄取消理由到 line_message_log
    await supabase.from("line_message_log").insert({
      user_id: lineUid || "unknown",
      message_type: "push",
      template: "event_cancel",
      payload: { orderId, reason: reason || "未填寫" },
    });

    // 如果有 LINE UID，推送確認訊息
    if (lineUid) {
      try {
        await lineClient.pushMessage({
          to: lineUid,
          messages: [{
            type: "text",
            text: `已收到您的取消申請 📝\n\n取消理由：${reason || "未填寫"}\n\n如有任何問題，歡迎隨時聯繫我們！`,
          }],
        });
      } catch (err: any) {
        console.error("[event-rsvp] Push confirm failed:", err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[event-rsvp] Error:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
