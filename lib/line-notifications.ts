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
    text: `🧾 訂單確認 ${statusText}\n訂單編號：${orderId.slice(0, 8).toUpperCase()}\n\n${itemLines}${moreText}\n\n合計：NT$ ${total.toLocaleString()}`,
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

/**
 * 訂單成立後 → 通知所有被點到貨/活動的合作廠商
 * 一筆訂單可能涉及多家廠商，每家收一則 push（包含「跟自己有關」的品項摘要）
 */
export async function notifyPartnerOnOrder(
  orderId: string,
  items: { name: string; qty: number; price: number; itemId: string; itemType: "product" | "event" }[]
): Promise<void> {
  // 找出每個品項的 partner notion_id
  const productIds = items.filter((i) => i.itemType === "product").map((i) => i.itemId);
  const eventIds = items.filter((i) => i.itemType === "event").map((i) => i.itemId);

  // products → publisher_notion_id
  const productPartnerMap = new Map<string, string>(); // itemId -> partner_notion_id
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, publisher_notion_id")
      .in("id", productIds);
    for (const p of data || []) {
      if (p.publisher_notion_id) productPartnerMap.set(p.id, p.publisher_notion_id);
    }
  }

  // events → related_partner_ids[]
  const eventPartnersMap = new Map<string, string[]>();
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select("id, related_partner_ids")
      .in("id", eventIds);
    for (const e of data || []) {
      eventPartnersMap.set(e.id, (e.related_partner_ids || []) as string[]);
    }
  }

  // 反轉：每個 partner_notion_id → 涉及的品項
  const partnerItems = new Map<string, typeof items>();
  for (const it of items) {
    const partners: string[] = [];
    if (it.itemType === "product") {
      const pid = productPartnerMap.get(it.itemId);
      if (pid) partners.push(pid);
    } else {
      partners.push(...(eventPartnersMap.get(it.itemId) || []));
    }
    for (const pn of partners) {
      const arr = partnerItems.get(pn) || [];
      arr.push(it);
      partnerItems.set(pn, arr);
    }
  }

  if (partnerItems.size === 0) return;

  // 撈 partners → contact email → members.line_uid
  const partnerNotionIds = [...partnerItems.keys()];
  const { data: partners } = await supabase
    .from("partners")
    .select("notion_id, name, contact")
    .in("notion_id", partnerNotionIds);

  for (const p of partners || []) {
    const email = (p.contact as any)?.email;
    if (!email) continue;

    const { data: member } = await supabase
      .from("members")
      .select("line_uid")
      .eq("email", email)
      .maybeSingle();
    if (!member?.line_uid) continue;

    const myItems = partnerItems.get(p.notion_id) || [];
    if (myItems.length === 0) continue;

    const hasEvent = myItems.some((i) => i.itemType === "event");
    const lines = myItems
      .slice(0, 5)
      .map((i) => `・${i.name} ×${i.qty}  NT$${i.price}`)
      .join("\n");
    const more = myItems.length > 5 ? `\n…等共 ${myItems.length} 件` : "";
    const subtotal = myItems.reduce((s, i) => s + i.price * i.qty, 0);

    const text = `${hasEvent ? "🎪 您有新報名！" : "📦 您有新訂單！"}\n` +
      `訂單：${orderId.slice(0, 8).toUpperCase()}\n\n${lines}${more}\n\n` +
      `小計：NT$ ${subtotal.toLocaleString()}\n\n` +
      `查看詳情 → https://makesense.ink/liff/partner/dashboard?liff_mode=true`;

    try {
      await lineClient.pushMessage({
        to: member.line_uid,
        messages: [{ type: "text", text }],
      });
      await supabase.from("line_message_log").insert({
        user_id: member.line_uid,
        message_type: "push",
        template: "partner_order",
        payload: { orderId, partnerNotionId: p.notion_id, itemCount: myItems.length, subtotal },
      });
    } catch (err: any) {
      console.error(`[line-notify] partner ${p.name} notify failed:`, err.message);
    }
  }
}

/**
 * 評價提交後 → 通知擁有該商品/活動的合作廠商
 */
export async function notifyPartnerOnReview(reviewId: string): Promise<void> {
  const { data: review } = await supabase
    .from("reviews")
    .select("rating, comment, order_item_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review) return;

  const { data: item } = await supabase
    .from("order_items")
    .select("item_id, item_type")
    .eq("id", review.order_item_id)
    .maybeSingle();
  if (!item) return;

  let partnerNotionIds: string[] = [];
  let itemTitle = "—";

  if (item.item_type === "product") {
    const { data: prod } = await supabase
      .from("products")
      .select("name, publisher_notion_id")
      .eq("id", item.item_id)
      .maybeSingle();
    if (prod?.publisher_notion_id) partnerNotionIds = [prod.publisher_notion_id];
    if (prod?.name) itemTitle = prod.name;
  } else {
    const { data: ev } = await supabase
      .from("events")
      .select("title, related_partner_ids")
      .eq("id", item.item_id)
      .maybeSingle();
    if (ev?.related_partner_ids) partnerNotionIds = (ev.related_partner_ids as string[]) || [];
    if (ev?.title) itemTitle = ev.title;
  }

  if (partnerNotionIds.length === 0) return;

  const { data: partners } = await supabase
    .from("partners")
    .select("notion_id, contact")
    .in("notion_id", partnerNotionIds);

  for (const p of partners || []) {
    const email = (p.contact as any)?.email;
    if (!email) continue;
    const { data: m } = await supabase
      .from("members")
      .select("line_uid")
      .eq("email", email)
      .maybeSingle();
    if (!m?.line_uid) continue;

    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const text = `⭐ 您收到新評價！\n${itemTitle}\n${stars} (${review.rating}/5)\n` +
      (review.comment ? `\n「${review.comment.slice(0, 100)}」\n` : "") +
      `\n查看詳情 → https://makesense.ink/liff/partner/dashboard?liff_mode=true`;

    try {
      await lineClient.pushMessage({ to: m.line_uid, messages: [{ type: "text", text }] });
      await supabase.from("line_message_log").insert({
        user_id: m.line_uid,
        message_type: "push",
        template: "partner_review",
        payload: { reviewId, rating: review.rating, partnerNotionId: p.notion_id },
      });
    } catch (err: any) {
      console.error(`[line-notify] partner review notify failed:`, err.message);
    }
  }
}

export async function notifyRegistrationResult(
  memberId: string,
  eventName: string,
  result: "accepted" | "rejected",
  customMessage?: string,
  orderId?: string,
): Promise<void> {
  const { data: member } = await supabase
    .from("members")
    .select("line_uid")
    .eq("id", memberId)
    .maybeSingle();

  if (!member?.line_uid) return;

  // 撈訂單明細（不含個人資料）
  let items: { name: string; subtitle?: string | null; qty: number; price: number }[] = [];
  let total: number | undefined;
  let orderNumber: string | undefined;

  if (orderId) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, total, order_items (quantity, price, meta)")
      .eq("id", orderId)
      .maybeSingle();
    if (order) {
      orderNumber = `MS-${String(order.id).slice(0, 8).toUpperCase()}`;
      total = Number(order.total) || 0;
      items = ((order as any).order_items || []).map((oi: any) => ({
        name: oi.meta?.name || "項目",
        subtitle: oi.meta?.subtitle || null,
        qty: oi.quantity,
        price: oi.price,
      }));
    }
  }

  const message = buildRegistrationResultFlex({
    eventName,
    result,
    message: customMessage,
    orderNumber,
    items,
    total,
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
