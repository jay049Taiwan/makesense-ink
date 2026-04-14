import { lineClient } from "./line";
import { supabaseAdmin as supabase } from "./supabase";
import { buildOrderConfirmFlex, buildRegistrationResultFlex } from "./line-flex-templates";

/**
 * 訂單建立後 → 推播 LINE 確認卡片
 */
export async function notifyOrderCreated(
  orderId: string,
  memberId: string,
  items: { name: string; qty: number; price: number }[],
  total: number,
  hasEvent: boolean
): Promise<void> {
  // 查會員的 LINE UID
  const { data: member } = await supabase
    .from("members")
    .select("line_uid")
    .eq("id", memberId)
    .maybeSingle();

  if (!member?.line_uid) return; // 沒有 LINE 帳號，跳過

  const message = buildOrderConfirmFlex({ orderId, items, total, hasEvent });

  try {
    await lineClient.pushMessage({ to: member.line_uid, messages: [message] });

    await supabase.from("line_message_log").insert({
      user_id: member.line_uid,
      message_type: "push",
      template: "order",
      payload: { orderId, total, itemCount: items.length },
    });
  } catch (err: any) {
    console.error("[line-notify] Order notification failed:", err.message);
  }
}

/**
 * 報名結果通知 → 推播 LINE 錄取/未錄取卡片
 * 由 n8n → /api/line/push 呼叫，或直接呼叫此函式
 */
export async function notifyRegistrationResult(
  memberId: string,
  eventName: string,
  result: "accepted" | "rejected",
  customMessage?: string
): Promise<void> {
  const { data: member } = await supabase
    .from("members")
    .select("line_uid")
    .eq("id", memberId)
    .maybeSingle();

  if (!member?.line_uid) return;

  const message = buildRegistrationResultFlex({
    eventName,
    result,
    message: customMessage,
  });

  try {
    await lineClient.pushMessage({ to: member.line_uid, messages: [message] });

    await supabase.from("line_message_log").insert({
      user_id: member.line_uid,
      message_type: "push",
      template: "registration",
      payload: { eventName, result },
    });
  } catch (err: any) {
    console.error("[line-notify] Registration notification failed:", err.message);
  }
}
