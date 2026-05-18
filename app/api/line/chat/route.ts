import { NextRequest, NextResponse } from "next/server";
import { generateChatReply } from "@/lib/line-chat";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/** 每個 IP 每分鐘最多 10 則（防止消耗 Anthropic API 費用） */
const CHAT_LIMIT_PER_MIN = 10;

async function checkChatRateLimit(ip: string): Promise<boolean> {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  try {
    const { count } = await supabase
      .from("line_message_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", `ip:${ip}`)
      .eq("message_type", "chat_public")
      .gte("created_at", oneMinAgo.toISOString());
    return (count || 0) < CHAT_LIMIT_PER_MIN;
  } catch {
    return true; // table 查不到時放行，不阻斷服務
  }
}

/**
 * POST /api/line/chat — AI 客服端點
 * Body: { message: string, userId?: string }
 * 供 AskPanel 和 LINE webhook 共用
 */
export async function POST(req: NextRequest) {
  // IP-based rate limiting（防止刷 Anthropic 費用）
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkChatRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ reply: "請求太頻繁，請稍後再試 😊" }, { status: 429 });
  }

  try {
    const { message, userId } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // 記錄此次 public chat（供 rate limit 計數，fire-and-forget）
    void supabase.from("line_message_log").insert({
      user_id: `ip:${ip}`,
      message_type: "chat_public",
      template: "ask_panel",
    });

    const reply = await generateChatReply(message.slice(0, 500), userId);
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[line/chat] error:", err.message);
    return NextResponse.json({ reply: "抱歉，系統暫時無法回應 😊" }, { status: 200 });
  }
}
