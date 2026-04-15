import { NextRequest, NextResponse } from "next/server";
import { lineClient, verifyWebhookSignature } from "@/lib/line";
import { generateChatReply } from "@/lib/line-chat";
import { buildWelcomeFlex } from "@/lib/line-flex-templates";
import { supabaseAdmin as supabase } from "@/lib/supabase";

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
    handleEvent(event).catch((err) =>
      console.error(`[line/webhook] event error:`, err.message)
    );
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
