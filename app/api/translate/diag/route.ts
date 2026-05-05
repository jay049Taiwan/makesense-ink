import { NextResponse } from "next/server";

/**
 * GET /api/translate/diag
 * 診斷 ANTHROPIC_API_KEY 設定與 Anthropic API 連線狀態
 * 不會寫資料；只拿一句話打 Haiku，把回傳/錯誤直接吐出來。
 */
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return NextResponse.json({ ok: false, stage: "env", error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  // 檢查 key 是否有 trailing whitespace / newline
  const keyDiag = {
    length: key.length,
    starts_with: key.slice(0, 10),
    ends_with_dot: key.slice(-3),
    has_trailing_newline: key.endsWith("\n") || key.endsWith("\r"),
    has_leading_space: key.startsWith(" "),
    trimmed_length: key.trim().length,
    needs_trim: key.length !== key.trim().length,
  };

  // 試打 Haiku
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key.trim(),  // 自動 trim 試試
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [{ role: "user", content: "Say 'hello' in 5 words." }],
      }),
    });

    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}

    return NextResponse.json({
      ok: res.ok,
      stage: "anthropic_call",
      http_status: res.status,
      key_diag: keyDiag,
      response_preview: text.slice(0, 500),
      parsed,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      stage: "fetch_threw",
      key_diag: keyDiag,
      error: err.message,
    }, { status: 500 });
  }
}
