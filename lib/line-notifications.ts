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

  // 純文字訊息（Flex 暫時停用，避開 400 錯誤）
  const itemLines = items.slice(0, 5).map(i => `・${i.name} ×${i.qty}  NT$${i.price}`).join("\n");
  const moreText = items.length > 5 ? `\n…等共 ${items.length} 件` : "";
  const statusText = hasEvent ? "【報名受理中】" : "【付款成功】";
  const textMessage = {
    type: "text" as const,
    text: `🧾 訂單確認 ${statusText}\n訂單編號：${orderId.slice(0, 8).toUpperCase()}\n\n${itemLines}${moreText}\n\n合計：NT$ ${total.toLocaleString()}\n\n查看訂單：https://makesense.ink/dashboard`,
  };

  try {
    await lineClient.pushMessage({ to: member.line_uid, messages: [textMessage] });

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
/**
 * 訂單狀態變更 → 推播 LINE 通知
 */
export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  // 查訂單和會員
  const { data: order } = await supabase
    .from("orders")
    .select("id, member_id, status, total")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Order not found" };

  const { data: member } = await supabase
    .from("members")
    .select("line_uid")
    .eq("id", order.member_id)
    .maybeSingle();

  if (!member?.line_uid) return { success: false, error: "No LINE account" };

  // 狀態對應
  const statusMap: Record<string, { label: string; icon: string; color: string; defaultMsg: string }> = {
    confirmed: { label: "訂單已確認", icon: "✅", color: "#4ECDC4", defaultMsg: "您的訂單已確認，感謝您！" },
    ready: { label: "可取件", icon: "📦", color: "#e8935a", defaultMsg: "您的商品已備妥，歡迎來店取貨！\n\n📍 宜蘭縣羅東鎮文化街55號\n🕐 營業時間 10:00-18:00" },
    completed: { label: "已完成", icon: "🎉", color: "#4CAF50", defaultMsg: "感謝您的購買！歡迎給予評價，幫助我們做得更好 💪" },
    cancelled: { label: "已取消", icon: "❌", color: "#e53e3e", defaultMsg: "您的訂單已取消。如有疑問請隨時聯繫我們。" },
  };

  const info = statusMap[newStatus];
  if (!info) return { success: false, error: `Unknown status: ${newStatus}` };

  // 更新訂單狀態
  await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  // 推播
  const { buildOrderStatusFlex } = await import("./line-flex-templates");
  const message = buildOrderStatusFlex({
    orderId,
    status: newStatus,
    statusLabel: info.label,
    message: customMessage || info.defaultMsg,
    icon: info.icon,
    color: info.color,
  });

  try {
    await lineClient.pushMessage({ to: member.line_uid, messages: [message] });

    await supabase.from("line_message_log").insert({
      user_id: member.line_uid,
      message_type: "push",
      template: "order_status",
      payload: { orderId, newStatus },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[line-notify] Order status notification failed:", err.message);
    return { success: false, error: err.message };
  }
}

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
