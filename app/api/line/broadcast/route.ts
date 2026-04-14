import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { buildEventFlex, buildProductFlex } from "@/lib/line-flex-templates";

export const maxDuration = 10;

/**
 * POST /api/line/broadcast — 群發 LINE 訊息給所有追蹤者
 *
 * Body 二擇一：
 * 1. 模板模式：{ template: "event"|"product", data: {...} }
 * 2. 原始模式：{ messages: [...] }
 *
 * Auth: Bearer token (WEBHOOK_SECRET)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { template, data, messages: rawMessages } = body;

    let messages: any[];

    if (template && data) {
      switch (template) {
        case "event":
          messages = [buildEventFlex(data)];
          break;
        case "product":
          messages = [buildProductFlex(data)];
          break;
        default:
          return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
      }
    } else if (rawMessages && Array.isArray(rawMessages)) {
      messages = rawMessages;
    } else {
      return NextResponse.json({ error: "Missing template+data or messages" }, { status: 400 });
    }

    await lineClient.broadcast({ messages });

    // 記錄
    await supabase.from("line_message_log").insert({
      user_id: null,
      message_type: "broadcast",
      template: template || "raw",
      payload: { data, messageCount: messages.length },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[line/broadcast] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
