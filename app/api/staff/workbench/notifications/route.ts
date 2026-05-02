import { NextResponse } from "next/server";
import { requireStaff } from "../../_guard";
import { scanDb04, scanDb07, fetchNotifications, formatErr } from "@/lib/workbench-scan";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/staff/workbench/notifications
 *
 * 預設只回 cached events（秒回）。前端「重新掃描」按鈕加 ?scan=1 才主動 scan。
 * 後台掃描由 n8n cron 每 5 分鐘呼叫 /api/cron/workbench-scan 處理。
 */
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const shouldScan = url.searchParams.get("scan") === "1";
  const errors: string[] = [];

  if (shouldScan) {
    const SCAN_TIMEOUT_MS = 50000;
    const timed = async (label: string, fn: () => Promise<any>): Promise<void> => {
      const start = Date.now();
      try {
        await fn();
        console.log(`[workbench/notif] ${label} ok in ${Date.now() - start}ms`);
      } catch (e: any) {
        const elapsed = Date.now() - start;
        errors.push(`${label} 失敗 (${elapsed}ms)：${formatErr(e)}`);
        console.error(`[workbench/notif] ${label} fail in ${elapsed}ms:`, e);
      }
    };
    const scanAll = Promise.all([
      timed("scanDb04", scanDb04),
      timed("scanDb07", scanDb07),
    ]);
    const scanTimeout = new Promise<void>((resolve) =>
      setTimeout(() => { errors.push(`掃描超時 ${SCAN_TIMEOUT_MS / 1000}s — 先顯示既有通知`); resolve(); }, SCAN_TIMEOUT_MS)
    );
    await Promise.race([scanAll, scanTimeout]);
  }

  let items: any[] = [];
  try { items = await fetchNotifications(); } catch (e: any) {
    errors.push(`fetchNotifications 失敗：${formatErr(e)}`);
    console.error("[workbench/notif] fetch:", e);
  }
  return NextResponse.json({ ok: true, items, warnings: errors, scanned: shouldScan });
}
