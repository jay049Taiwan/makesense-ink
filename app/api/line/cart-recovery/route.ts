import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { lineClient, buildLiffUrl } from "@/lib/line";
import { checkPushLimit } from "@/lib/line-ratelimit";
import { FlexBubble, FlexMessage } from "@line/bot-sdk";

export const dynamic = "force-dynamic";

/**
 * POST /api/line/cart-recovery
 * 購物車召回：結帳後 1 小時未完成 → 推播提醒
 *
 * 兩種使用方式：
 * 1. n8n 每小時呼叫，自動查找 1 小時前建立但未完成的訂單
 * 2. 直接傳 { userId, items } 推播指定用戶
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 模式 1：自動掃描（n8n 每小時呼叫）
    if (!body.userId) {
      return await autoRecovery();
    }

    // 模式 2：指定用戶推播
    const { userId, items } = body;
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // 檢查推播限制
    const allowed = await checkPushLimit(userId);
    if (!allowed) return NextResponse.json({ skipped: true, reason: "rate_limited" });

    const message = buildCartRecoveryFlex(items || []);
    await lineClient.pushMessage({ to: userId, messages: [message] });

    await supabase.from("line_message_log").insert({
      user_id: userId,
      message_type: "push",
      template: "cart_recovery",
      payload: { itemCount: items?.length || 0 },
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error("[cart-recovery] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * 自動掃描：找 1~2 小時前建立的 pending 訂單，推播提醒
 */
async function autoRecovery() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // 找 1-2 小時前建立、仍為 pending 的訂單
  const { data: orders } = await supabase
    .from("orders")
    .select("id, member_id, total, created_at")
    .eq("status", "pending")
    .gte("created_at", twoHoursAgo.toISOString())
    .lte("created_at", oneHourAgo.toISOString());

  if (!orders || orders.length === 0) {
    return NextResponse.json({ sent: 0, message: "No abandoned carts found" });
  }

  let sent = 0;
  for (const order of orders) {
    if (!order.member_id) continue;

    const { data: member } = await supabase
      .from("members")
      .select("line_uid")
      .eq("id", order.member_id)
      .maybeSingle();

    if (!member?.line_uid) continue;

    // 檢查推播限制
    const allowed = await checkPushLimit(member.line_uid);
    if (!allowed) continue;

    // 檢查是否已經推過此訂單的召回
    const { data: existing } = await supabase
      .from("line_message_log")
      .select("id")
      .eq("user_id", member.line_uid)
      .eq("template", "cart_recovery")
      .gte("created_at", twoHoursAgo.toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue; // 已推過，跳過

    // 查訂單內容
    const { data: items } = await supabase
      .from("order_items")
      .select("meta, quantity, price")
      .eq("order_id", order.id);

    const itemList = (items || []).map(i => ({
      name: (i.meta as any)?.name || "商品",
      qty: i.quantity,
      price: i.price,
    }));

    const message = buildCartRecoveryFlex(itemList);

    try {
      await lineClient.pushMessage({ to: member.line_uid, messages: [message] });
      await supabase.from("line_message_log").insert({
        user_id: member.line_uid,
        message_type: "push",
        template: "cart_recovery",
        payload: { orderId: order.id, total: order.total },
      });
      sent++;
    } catch (err: any) {
      console.error(`[cart-recovery] Push failed:`, err.message);
    }
  }

  return NextResponse.json({ sent });
}

function buildCartRecoveryFlex(items: { name: string; qty: number; price: number }[]): FlexMessage {
  const itemTexts = items.slice(0, 3).map(i => `• ${i.name} ×${i.qty}`).join("\n");
  const more = items.length > 3 ? `\n...等 ${items.length} 件商品` : "";

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "🛒 購物車提醒", size: "md", weight: "bold", color: "#7a5c40" },
        { type: "separator" },
        { type: "text", text: "你的購物車裡還有東西喔～", size: "sm", color: "#666", margin: "md" },
        ...(itemTexts ? [{
          type: "text" as const,
          text: itemTexts + more,
          size: "xs" as const,
          color: "#999",
          wrap: true,
          margin: "md" as const,
        }] : []),
        { type: "text", text: "趁還沒被別人搶走，快來結帳吧！", size: "xs", color: "#999", margin: "sm" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "前往結帳", uri: buildLiffUrl("checkout") },
          style: "primary",
          color: "#7a5c40",
          height: "sm",
        },
      ],
    },
  };

  return { type: "flex", altText: "🛒 購物車提醒 — 你的購物車裡還有東西喔～", contents: bubble };
}
