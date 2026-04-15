import { FlexMessage, FlexBubble } from "@line/bot-sdk";
import { buildLiffUrl } from "./line";

// ═══════════════════════════════════════════
// 活動卡片
// ═══════════════════════════════════════════
export function buildEventFlex(event: {
  title: string;
  date?: string | null;
  location?: string | null;
  price?: number | null;
  coverUrl?: string | null;
  slug: string;
}): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    ...(event.coverUrl ? {
      hero: {
        type: "image",
        url: event.coverUrl,
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover",
        action: { type: "uri", label: "查看活動", uri: buildLiffUrl(`events/${event.slug}`) },
      },
    } : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: "🎪 活動通知", size: "xs", color: "#4ECDC4", weight: "bold" },
        { type: "text", text: event.title, size: "lg", weight: "bold", wrap: true, maxLines: 2 },
        ...(event.date ? [{
          type: "box" as const,
          layout: "horizontal" as const,
          spacing: "sm" as const,
          contents: [
            { type: "text" as const, text: "📅", size: "sm" as const, flex: 0 },
            { type: "text" as const, text: new Date(event.date).toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" }), size: "sm" as const, color: "#666", flex: 1 },
          ],
        }] : []),
        ...(event.location ? [{
          type: "box" as const,
          layout: "horizontal" as const,
          spacing: "sm" as const,
          contents: [
            { type: "text" as const, text: "📍", size: "sm" as const, flex: 0 },
            { type: "text" as const, text: event.location, size: "sm" as const, color: "#666", flex: 1 },
          ],
        }] : []),
        ...(event.price != null ? [{
          type: "text" as const,
          text: event.price === 0 ? "免費" : `NT$ ${event.price.toLocaleString()}`,
          size: "md" as const,
          color: "#b5522a",
          weight: "bold" as const,
          margin: "md" as const,
        }] : []),
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "立即報名", uri: buildLiffUrl(`events/${event.slug}`) },
          style: "primary",
          color: "#4ECDC4",
          height: "sm",
        },
        {
          type: "button",
          action: { type: "uri", label: "分享", uri: `https://makesense.ink/events/${event.slug}` },
          style: "secondary",
          height: "sm",
        },
      ],
    },
  };

  return { type: "flex", altText: `🎪 ${event.title}`, contents: bubble };
}

// ═══════════════════════════════════════════
// 商品卡片
// ═══════════════════════════════════════════
export function buildProductFlex(product: {
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  slug: string;
}): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    ...(product.imageUrl ? {
      hero: {
        type: "image",
        url: product.imageUrl,
        size: "full",
        aspectRatio: "1:1",
        aspectMode: "cover",
        action: { type: "uri", label: "查看商品", uri: buildLiffUrl(`product/${product.slug}`) },
      },
    } : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: product.name, size: "lg", weight: "bold", wrap: true, maxLines: 2 },
        ...(product.description ? [{
          type: "text" as const,
          text: product.description.slice(0, 80) + (product.description.length > 80 ? "..." : ""),
          size: "xs" as const,
          color: "#999",
          wrap: true,
          maxLines: 2,
        }] : []),
        {
          type: "text",
          text: `NT$ ${product.price.toLocaleString()}`,
          size: "xl",
          color: "#b5522a",
          weight: "bold",
          margin: "md",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "查看商品", uri: buildLiffUrl(`product/${product.slug}`) },
          style: "primary",
          color: "#7a5c40",
          height: "sm",
        },
      ],
    },
  };

  return { type: "flex", altText: `📚 ${product.name} — NT$${product.price}`, contents: bubble };
}

// ═══════════════════════════════════════════
// 報名結果通知
// ═══════════════════════════════════════════
export function buildRegistrationResultFlex(data: {
  eventName: string;
  result: "accepted" | "rejected";
  message?: string;
}): FlexMessage {
  const isAccepted = data.result === "accepted";
  const icon = isAccepted ? "✅" : "❌";
  const statusText = isAccepted ? "恭喜！報名錄取" : "很抱歉，本次未錄取";
  const statusColor = isAccepted ? "#4ECDC4" : "#e53e3e";

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: `${icon} 報名結果通知`, size: "md", weight: "bold", color: statusColor },
        { type: "separator" },
        { type: "text", text: data.eventName, size: "lg", weight: "bold", wrap: true, margin: "md" },
        { type: "text", text: statusText, size: "md", color: statusColor, margin: "sm" },
        ...(data.message ? [{
          type: "text" as const,
          text: data.message,
          size: "sm" as const,
          color: "#666",
          wrap: true,
          margin: "md" as const,
        }] : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "查看詳情", uri: buildLiffUrl("dashboard/orders") },
          style: "primary",
          color: statusColor,
          height: "sm",
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `${icon} ${data.eventName} — ${statusText}`,
    contents: bubble,
  };
}

// ═══════════════════════════════════════════
// 訂單確認卡片
// ═══════════════════════════════════════════
export function buildOrderConfirmFlex(order: {
  orderId: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  hasEvent: boolean;
}): FlexMessage {
  const itemLines = order.items.slice(0, 3).map((item) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    contents: [
      { type: "text" as const, text: item.name, size: "sm" as const, color: "#333", flex: 3, wrap: true, maxLines: 1 },
      { type: "text" as const, text: `×${item.qty}`, size: "sm" as const, color: "#999", flex: 1, align: "center" as const },
      { type: "text" as const, text: `$${item.price}`, size: "sm" as const, color: "#333", flex: 1, align: "end" as const },
    ],
  }));

  if (order.items.length > 3) {
    itemLines.push({
      type: "box" as const,
      layout: "horizontal" as const,
      contents: [
        { type: "text" as const, text: `...等 ${order.items.length} 件商品`, size: "xs" as const, color: "#999", flex: 3, wrap: false, maxLines: 1 },
        { type: "text" as const, text: "", size: "xs" as const, color: "#999", flex: 1, align: "center" as const },
        { type: "text" as const, text: "", size: "xs" as const, color: "#999", flex: 1, align: "end" as const },
      ],
    });
  }

  const statusText = order.hasEvent ? "報名受理中" : "付款成功";
  const statusColor = order.hasEvent ? "#e8935a" : "#4ECDC4";

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "🧾 訂單確認", size: "md", weight: "bold", flex: 1 },
            { type: "text", text: statusText, size: "xs", color: statusColor, weight: "bold", align: "end", gravity: "center" },
          ],
        },
        { type: "separator" },
        { type: "text", text: `訂單 ${order.orderId.slice(0, 8)}`, size: "xs", color: "#999", margin: "sm" },
        ...itemLines,
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            { type: "text", text: "合計", size: "md", weight: "bold", flex: 1 },
            { type: "text", text: `NT$ ${order.total.toLocaleString()}`, size: "md", weight: "bold", color: "#b5522a", align: "end" },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "查看訂單", uri: buildLiffUrl("dashboard/orders") },
          style: "primary",
          color: "#7a5c40",
          height: "sm",
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `🧾 訂單確認 — NT$${order.total.toLocaleString()}`,
    contents: bubble,
  };
}

// ═══════════════════════════════════════════
// 歡迎訊息（新追蹤者）
// ═══════════════════════════════════════════
export function buildWelcomeFlex(): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "👋 歡迎加入旅人書店！", size: "lg", weight: "bold", color: "#7a5c40" },
        { type: "text", text: "我是 AI 助手小旅，隨時可以問我問題 😊", size: "sm", color: "#666", wrap: true },
        { type: "separator", margin: "lg" },
        { type: "text", text: "📱 下方選單功能：", size: "sm", weight: "bold", margin: "md" },
        { type: "text", text: "📚 選書選物 — 瀏覽書籍與文創商品\n🎪 近期活動 — 查看活動報名\n🗺️ 觀點漫遊 — 探索宜蘭文化觀點\n🛒 確認結帳 — 查看購物車\n👤 會員中心 — 個人資料與訂單\n💬 問問我們 — AI 客服（就是我！）", size: "xs", color: "#999", wrap: true, margin: "sm" },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "逛逛書店", uri: buildLiffUrl("bookstore") },
          style: "primary",
          color: "#7a5c40",
          height: "sm",
        },
        {
          type: "button",
          action: { type: "uri", label: "近期活動", uri: buildLiffUrl("cultureclub") },
          style: "primary",
          color: "#4ECDC4",
          height: "sm",
        },
      ],
    },
  };

  return { type: "flex", altText: "👋 歡迎加入旅人書店！", contents: bubble };
}

// ═══════════════════════════════════════════
// 活動提醒（前 5 天 / 前 1 天）
// ═══════════════════════════════════════════
export function buildEventReminderFlex(data: {
  title: string;
  date: string;
  location?: string | null;
  timeLabel: string; // "5 天後" 或 "明天"
  orderId: string;
  slug: string;
}): FlexMessage {
  const dateStr = new Date(data.date).toLocaleDateString("zh-TW", {
    month: "long", day: "numeric", weekday: "short",
  });

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "🔔 活動提醒", size: "md", weight: "bold", color: "#e8935a" },
        { type: "separator" },
        {
          type: "box", layout: "vertical", margin: "md", spacing: "sm",
          contents: [
            {
              type: "box", layout: "horizontal", spacing: "sm",
              contents: [
                { type: "text", text: "📅", size: "sm", flex: 0 },
                { type: "text", text: dateStr, size: "sm", color: "#666", flex: 1 },
              ],
            },
            ...(data.location ? [{
              type: "box" as const, layout: "horizontal" as const, spacing: "sm" as const,
              contents: [
                { type: "text" as const, text: "📍", size: "sm" as const, flex: 0 },
                { type: "text" as const, text: data.location, size: "sm" as const, color: "#666", flex: 1 },
              ],
            }] : []),
          ],
        },
        { type: "text", text: data.title, size: "lg", weight: "bold", wrap: true, margin: "md" },
        {
          type: "text",
          text: `${data.timeLabel}即將開始！`,
          size: "sm",
          color: data.timeLabel === "3 天後" ? "#e74c3c" : "#e8935a",
          weight: "bold",
          margin: "md",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: {
            type: "postback",
            label: "確定參加 ✓",
            data: `action=confirm_attend&orderId=${data.orderId}`,
            displayText: "確定參加 ✓",
          },
          style: "primary",
          color: "#4ECDC4",
          height: "sm",
        },
        {
          type: "button",
          action: {
            type: "uri",
            label: "臨時取消 ✗",
            uri: buildLiffUrl(`liff/cancel-event?orderId=${data.orderId}&eventName=${encodeURIComponent(data.title)}`),
          },
          style: "secondary",
          height: "sm",
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `🔔 活動提醒：${data.title}（${data.timeLabel}）`,
    contents: bubble,
  };
}

// ═══════════════════════════════════════════
// 訂單狀態變更通知
// ═══════════════════════════════════════════
export function buildOrderStatusFlex(data: {
  orderId: string;
  status: string;
  statusLabel: string;
  message: string;
  icon: string;
  color: string;
}): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "box", layout: "horizontal",
          contents: [
            { type: "text", text: `${data.icon} 訂單狀態更新`, size: "md", weight: "bold", flex: 1 },
            { type: "text", text: data.statusLabel, size: "xs", color: data.color, weight: "bold", align: "end", gravity: "center" },
          ],
        },
        { type: "separator" },
        { type: "text", text: `訂單 ${data.orderId.slice(0, 8)}`, size: "xs", color: "#999", margin: "sm" },
        { type: "text", text: data.message, size: "sm", color: "#333", wrap: true, margin: "md" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "查看訂單", uri: buildLiffUrl("dashboard/orders") },
          style: "primary",
          color: "#7a5c40",
          height: "sm",
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `${data.icon} ${data.statusLabel} — 訂單 ${data.orderId.slice(0, 8)}`,
    contents: bubble,
  };
}
