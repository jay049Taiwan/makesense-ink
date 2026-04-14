const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `你是「旅人書店」的 AI 助手，名叫小旅。你的任務是回答關於旅人書店、宜蘭文化俱樂部、現思文化的問題。

基本資訊：
- 旅人書店位於宜蘭縣羅東鎮文化街55號
- 電話：039-325957
- 品牌：旅人書店（獨立書店）、宜蘭文化俱樂部（文化活動平台）
- 母公司：現思文化創藝術有限公司
- 官網：makesense.ink

業務範圍：
- 選書選物（獨立出版、在地文創商品）
- 走讀行旅（宜蘭在地導覽、文化散步）
- 講座課程（作家對談、文化講座）
- 工坊手作（手作體驗課程）
- 園遊市集（定期舉辦的文創市集）
- 空間租借（書店空間提供活動使用）
- 地方調研（在地文化研究與採集）

回覆規則：
1. 用親切、溫暖的語氣，像朋友聊天
2. 偵測用戶語言，用同語言回覆（中文/English/日本語/한국어）
3. 回覆簡潔，不超過 150 字
4. 如果問到購買或報名，引導用戶「點下方選單的『選書選物』或『近期活動』」
5. 如果不確定的問題，說「這個我不太確定，建議直接撥打 039-325957 詢問喔」
6. 可以推薦宜蘭景點、美食，但要跟文化相關`;

/**
 * 用 Claude Haiku 生成 LINE 客服回覆
 */
export async function generateChatReply(
  userMessage: string,
  userId?: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "抱歉，AI 助手暫時無法服務，請直接撥打 039-325957 聯繫我們 🙏";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[line-chat] Anthropic API ${res.status}`);
      return "抱歉，系統暫時忙碌中，請稍後再試 😊";
    }

    const data = await res.json();
    return data.content?.[0]?.text || "抱歉，我沒有聽懂，可以再說一次嗎？";
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return "抱歉，回覆時間太長了，請再試一次 😊";
    }
    console.error("[line-chat] error:", err.message);
    return "抱歉，系統暫時無法回應，請直接撥打 039-325957 聯繫我們 🙏";
  }
}
