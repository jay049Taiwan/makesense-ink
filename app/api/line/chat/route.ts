import { NextRequest, NextResponse } from "next/server";
import { generateChatReply } from "@/lib/line-chat";

/**
 * POST /api/line/chat — AI 客服端點
 * Body: { message: string, userId?: string }
 * 供 AskPanel 和 LINE webhook 共用
 */
export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const reply = await generateChatReply(message.slice(0, 500), userId);
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[line/chat] error:", err.message);
    return NextResponse.json({ reply: "抱歉，系統暫時無法回應 😊" }, { status: 200 });
  }
}
