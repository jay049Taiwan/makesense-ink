import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { buildEventFlex, buildProductFlex, buildRegistrationResultFlex, buildOrderConfirmFlex } from "@/lib/line-flex-templates";

export const maxDuration = 10;

/**
 * POST /api/line/push — 推播 LINE 訊息給指定用戶
 *
 * Body 二擇一：
 * 1. 模板模式：{ userId, template: "event"|"product"|"registration"|"order", data: {...} }
 * 2. 原始模式：{ userId, messages: [...] }
 *
 * Auth: Bearer token (WEBHOOK_SECRET)
 */
export async function POST(req: NextRequest) {
  // 驗證 token
  const authHeader = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, template, data, messages: rawMessages } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    let messages: any[];

    if (template && data) {
      // 模板模式
      switch (template) {
        case "event":
          messages = [buildEventFlex(data)];
          break;
        case "product":
          messages = [buildProductFlex(data)];
          break;
        case "registration":
          messages = [buildRegistrationResultFlex(data)];
          break;
        case "order":
          messages = [buildOrderConfirmFlex(data)];
          break;
        default:
          return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
      }
    } else if (rawMessages && Array.isArray(rawMessages)) {
      messages = rawMessages;
    } else {
      return NextResponse.json({ error: "Missing template+data or messages" }, { status: 400 });
    }

    // 發送
    await lineClient.pushMessage({ to: userId, messages });

    // 記錄
    await supabase.from("line_message_log").insert({
      user_id: userId,
      message_type: "push",
      template: template || "raw",
      payload: { data, messageCount: messages.length },
    });

    // 查本月推播次數
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("line_message_log")
      .select("*", { count: "exact", head: true })
      .eq("message_type", "push")
      .gte("created_at", monthStart.toISOString());

    return NextResponse.json({ success: true, monthlyPushCount: count || 0 });
  } catch (err: any) {
    console.error("[line/push] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
