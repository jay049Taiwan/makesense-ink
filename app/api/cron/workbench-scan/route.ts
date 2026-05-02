import { NextResponse } from "next/server";
import { scanDb04, scanDb07, formatErr } from "@/lib/workbench-scan";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/workbench-scan
 *
 * 給 n8n cron 每 5 分鐘呼叫，背景跑工作台動態 Tab 的 DB04/DB07 scan。
 * User 開動態 Tab 永遠秒回 cached events，不用等 scan。
 *
 * 認證：必須帶 Authorization: Bearer <CRON_SECRET>
 *      （CRON_SECRET 是 .env 跟 Vercel envar 都要設的隨機字串，
 *       設定在 n8n credential 內，外部不會知道）
 *
 * 回傳：{ ok, durations, results, errors }
 */
export async function POST(req: Request) {
  // 驗證來源
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET 未設定" }, { status: 500 });
  }
  const auth = req.headers.get("Authorization") || "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  const durations: Record<string, number> = {};
  const results: Record<string, any> = {};

  const timed = async (label: string, fn: () => Promise<any>): Promise<void> => {
    const start = Date.now();
    try {
      results[label] = await fn();
      durations[label] = Date.now() - start;
      console.log(`[cron/workbench-scan] ${label} ok in ${durations[label]}ms`, results[label]);
    } catch (e: any) {
      durations[label] = Date.now() - start;
      errors.push(`${label} 失敗 (${durations[label]}ms)：${formatErr(e)}`);
      console.error(`[cron/workbench-scan] ${label} fail in ${durations[label]}ms:`, e);
    }
  };

  await Promise.all([
    timed("scanDb04", scanDb04),
    timed("scanDb07", scanDb07),
  ]);

  return NextResponse.json({
    ok: errors.length === 0,
    durations,
    results,
    errors,
    timestamp: new Date().toISOString(),
  });
}

// 也接 GET 給 n8n / 瀏覽器測試用（同樣需要 secret）
export async function GET(req: Request) {
  return POST(req);
}
