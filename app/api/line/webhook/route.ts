import { NextRequest, NextResponse } from "next/server";
import { lineClient, verifyWebhookSignature } from "@/lib/line";
import { generateChatReply } from "@/lib/line-chat";
import { buildWelcomeFlex, buildTopicSuggestionFlex } from "@/lib/line-flex-templates";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkAiReplyThrottle } from "@/lib/line-ratelimit";

export const maxDuration = 10;

/**
 * POST /api/line/webhook — LINE Platform webhook 入口
 * 接收所有 LINE 事件（訊息、追蹤、postback 等）
 */
export async function POST(req: NextRequest) {
  // 1. 讀取原始 body（簽名驗證需要原始字串）
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // 2. 驗證簽名
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[line/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. 解析事件
  let events: any[];
  try {
    const body = JSON.parse(rawBody);
    events = body.events || [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. 處理每個事件（不阻擋回應）
  for (const event of events) {
    // Debug: 記錄每個進來的事件到 Supabase（方便線上除錯）
    supabase.from("line_message_log").insert({
      user_id: event.source?.userId || "unknown",
      message_type: "webhook_debug",
      template: event.type || "unknown",
      payload: { event_type: event.type, postback_data: event.postback?.data || null, message_type: event.message?.type || null },
    }).then(() => {}, () => {});

    handleEvent(event).catch((err) => {
      console.error(`[line/webhook] event error:`, err.message, err.stack);
      // 記錄錯誤到 Supabase
      supabase.from("line_message_log").insert({
        user_id: event.source?.userId || "unknown",
        message_type: "error",
        template: "handle_event_error",
        payload: { error: err.message, event_type: event.type, postback_data: event.postback?.data || null },
      }).then(() => {}, () => {});
    });
  }

  // 5. 永遠回 200（避免 LINE 重試）
  return NextResponse.json({ ok: true });
}

async function handleEvent(event: any) {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  switch (event.type) {
    // ── 文字訊息 → AI 客服 ──
    case "message":
      if (event.message?.type === "text") {
        const userText = event.message.text;

        // AI 回覆節流：同一用戶每分鐘最多 3 則
        const canReply = await checkAiReplyThrottle(userId);
        if (!canReply) {
          await lineClient.replyMessage({
            replyToken,
            messages: [{ type: "text", text: "你打字好快！讓我喘口氣，稍等一下再問我吧 😊" }],
          });
          break;
        }

        const reply = await generateChatReply(userText, userId);

        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: reply }],
        });

        // 記錄
        await supabase.from("line_message_log").insert({
          user_id: userId,
          message_type: "reply",
          template: "chat",
          payload: { userText, reply },
        });
      }
      break;

    // ── 新追蹤 → 歡迎訊息 ──
    case "follow":
      await lineClient.replyMessage({
        replyToken,
        messages: [buildWelcomeFlex()],
      });

      await supabase.from("line_message_log").insert({
        user_id: userId,
        message_type: "reply",
        template: "welcome",
      });
      break;

    // ── postback 事件 ──
    case "postback": {
      const postData = event.postback?.data || "";
      const params = new URLSearchParams(postData);
      const action = params.get("action");

      if (action === "ask") {
        await lineClient.replyMessage({
          replyToken,
          messages: [{
            type: "text",
            text: "你好！我是旅人書店的 AI 助手小旅 🙋‍♀️\n\n隨時可以用中文、英文、日文或韓文問我問題喔！\n\n例如：\n• 最近有什麼活動？\n• 書店在哪裡？\n• What events do you have?",
          }],
        });
      } else if (action === "topic_suggest") {
        // 話題推薦：隨機選一個觀點 + 相關商品
        try {
          const message = await generateTopicSuggestion();
          await lineClient.replyMessage({
            replyToken,
            messages: [message as any],
          });
          await supabase.from("line_message_log").insert({
            user_id: userId,
            message_type: "reply",
            template: "topic_suggest",
          });
        } catch (err: any) {
          console.error("[topic_suggest] Error:", err.message, err.stack);
          // Fallback 用 text 訊息
          try {
            await lineClient.replyMessage({
              replyToken,
              messages: [{
                type: "text",
                text: `話題推薦載入失敗了 😅\n請稍後再試一次，或直接瀏覽 /liff/viewpoints`,
              }],
            });
          } catch {}
        }
      } else if (action === "confirm_attend") {
        const orderId = params.get("orderId") || "";
        await lineClient.replyMessage({
          replyToken,
          messages: [{
            type: "text",
            text: "收到！期待見到你 🎉\n\n活動當天請記得準時到場，有任何問題隨時問我～",
          }],
        });
        // 記錄確認出席
        await supabase.from("line_message_log").insert({
          user_id: userId,
          message_type: "reply",
          template: "confirm_attend",
          payload: { orderId },
        });
      }
      // cancel_attend 不需要在這裡處理，因為按鈕直接開啟 LIFF 頁面
      break;
    }

    // ── 取消追蹤 → 記錄 ──
    case "unfollow":
      console.log(`[line/webhook] User unfollowed: ${userId}`);
      break;

    default:
      console.log(`[line/webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * 隨機生成話題推薦訊息 — 一個觀點 + 相關商品
 */
async function generateTopicSuggestion() {
  // 1. 隨機選一個 viewpoint 類型的 topic
  const { data: topics } = await supabase
    .from("topics")
    .select("id, notion_id, name, summary")
    .eq("status", "active")
    .eq("tag_type", "viewpoint")
    .limit(50);

  if (!topics || topics.length === 0) {
    return {
      type: "text" as const,
      text: "目前還沒有話題可以推薦 😅 請稍後再試",
    };
  }

  const topic = topics[Math.floor(Math.random() * topics.length)];
  const topicId = topic.notion_id || topic.id;

  // 2. 查這個觀點相關的商品
  const { data: allProducts } = await supabase
    .from("products")
    .select("id, notion_id, name, price, images, related_topic_ids")
    .eq("status", "active")
    .gt("stock", 0)
    .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
    .limit(100);

  const relatedProducts = (allProducts || []).filter((p) => {
    let topicIds: string[] = [];
    const raw = p.related_topic_ids;
    if (Array.isArray(raw)) {
      topicIds = raw;
    } else if (typeof raw === "string") {
      try { topicIds = JSON.parse(raw); } catch { topicIds = []; }
    }
    return Array.isArray(topicIds) && topicIds.includes(topicId);
  });

  // 如果沒有相關商品，隨機取 3 個
  const picked = relatedProducts.length > 0
    ? relatedProducts.slice(0, 3)
    : (allProducts || []).sort(() => Math.random() - 0.5).slice(0, 3);

  const products = picked.map((p: any) => {
    let photo: string | null = null;
    try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
    return {
      name: p.name,
      price: p.price,
      photo,
      slug: p.notion_id || p.id,
    };
  });

  return buildTopicSuggestionFlex({
    topicName: topic.name,
    topicSummary: topic.summary,
    topicSlug: topicId,
    products,
  });
}
