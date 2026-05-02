import { NextResponse } from "next/server";
import { requireStaff } from "../../_guard";
import { supabaseAdmin } from "@/lib/supabase";
import { DB, queryDatabase } from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/staff/workbench/notifications
 *
 * 工作台「動態」Tab 的資料來源。
 * 每次呼叫做兩件事：
 *   1. 即時掃描 DB04 / DB07 → 發現新事件就寫進 workbench_notifications
 *   2. 回傳目前的通知列表（按 event_at 倒序）
 *
 * 規則：
 *   - DB04：執行狀態 = 「執行中」 + last_edited_time 比上次 event 新 → 推「db04_updated」
 *   - DB07：發佈狀態 = 「已發佈」（status='active'）
 *           - 上次不是 stock_zero，現在 stock<=0 → 推「stock_zero」
 *           - 上次是 stock_zero，現在 stock>0 → 推「stock_restocked」
 *   - Cleanup：DB04 不再「執行中」、DB07 不再「已發佈」的 events 會被刪除
 */
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  // 全 catch — 不管哪個 step 失敗都收集到 warnings，回 200 + items + warnings
  // 讓前端能完整看到「實際是哪個 step 失敗 + Notion 給的詳細 error」
  const errors: string[] = [];
  try { await scanDb04(); } catch (e: any) {
    errors.push(`scanDb04 失敗：${formatErr(e)}`);
    console.error("[workbench/notifications] scanDb04:", e);
  }
  try { await scanDb07(); } catch (e: any) {
    errors.push(`scanDb07 失敗：${formatErr(e)}`);
    console.error("[workbench/notifications] scanDb07:", e);
  }
  let items: any[] = [];
  try { items = await fetchNotifications(); } catch (e: any) {
    errors.push(`fetchNotifications 失敗：${formatErr(e)}`);
    console.error("[workbench/notifications] fetch:", e);
  }
  return NextResponse.json({ ok: true, items, warnings: errors });
}

/** 把任意 error 物件展開成可讀字串（含 Notion 的 code 跟 body） */
function formatErr(e: any): string {
  if (!e) return "(empty error)";
  const msg = e?.message || String(e);
  const code = e?.code ? ` code=${e.code}` : "";
  let body = "";
  if (e?.body) {
    body = typeof e.body === "string" ? ` body=${e.body.slice(0, 300)}` : ` body=${JSON.stringify(e.body).slice(0, 300)}`;
  }
  return `${msg}${code}${body}`;
}

// ── DB04 掃描（in-memory diff，避免 N 次 supabase query 撞 timeout）──
async function scanDb04() {
  // 1. 拉 Notion DB04「執行中」
  const pages: any[] = await queryDatabase(
    DB.DB04_COLLABORATION,
    { property: "執行狀態", status: { equals: "執行中" } },
  );
  const activeIds = new Set<string>(pages.map((p: any) => p.id.replace(/-/g, "")));

  // 2. 一次拉所有現有的 DB04 events，建 map: notion_id → 最新 event_at
  const { data: existingEvents } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, notion_id, event_at")
    .eq("source_db", "DB04")
    .eq("event_type", "db04_updated");
  const lastEventMap = new Map<string, { id: string; event_at: string }>();
  for (const ev of existingEvents || []) {
    const cur = lastEventMap.get(ev.notion_id);
    if (!cur || new Date(ev.event_at) > new Date(cur.event_at)) {
      lastEventMap.set(ev.notion_id, { id: ev.id, event_at: ev.event_at });
    }
  }

  // 3. In-memory diff：找出需要新增的 events
  const toInsert: any[] = [];
  for (const page of pages) {
    const notion_id = page.id.replace(/-/g, "");
    const lastEdited = page.last_edited_time as string;
    const last = lastEventMap.get(notion_id);
    if (!last || new Date(lastEdited) > new Date(last.event_at)) {
      const title =
        readTitle(page.properties?.["主題名稱"]) ||
        readTitle(page.properties?.["交接名稱"]) ||
        "（未命名）";
      toInsert.push({ source_db: "DB04", notion_id, event_type: "db04_updated", event_at: lastEdited, title });
    }
  }
  if (toInsert.length > 0) {
    await supabaseAdmin.from("workbench_notifications").insert(toInsert);
  }

  // 4. Cleanup：批次刪除「不再執行中」的 DB04 events
  const idsToDelete = (existingEvents || []).filter(ev => !activeIds.has(ev.notion_id)).map(ev => ev.id);
  if (idsToDelete.length > 0) {
    await supabaseAdmin.from("workbench_notifications").delete().in("id", idsToDelete);
  }
}

// ── DB07 掃描（in-memory diff）────────────────────────
async function scanDb07() {
  // 1. 拉 Supabase 所有 active product
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("notion_id, name, stock")
    .eq("status", "active")
    .not("notion_id", "is", null);
  const activeIds = new Set<string>((products || []).map(p => p.notion_id));

  // 2. 一次拉所有 DB07 events，建 map: notion_id → 最近一筆 event
  const { data: existingEvents } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, notion_id, event_type, event_at")
    .eq("source_db", "DB07")
    .in("event_type", ["stock_zero", "stock_restocked"]);
  const lastEventMap = new Map<string, { id: string; event_type: string; event_at: string }>();
  for (const ev of existingEvents || []) {
    const cur = lastEventMap.get(ev.notion_id);
    if (!cur || new Date(ev.event_at) > new Date(cur.event_at)) {
      lastEventMap.set(ev.notion_id, { id: ev.id, event_type: ev.event_type, event_at: ev.event_at });
    }
  }

  // 3. In-memory diff
  const toInsert: any[] = [];
  for (const p of products || []) {
    if (!p.notion_id) continue;
    const isOOS = (p.stock ?? 0) <= 0;
    const last = lastEventMap.get(p.notion_id);
    const lastType = last?.event_type;

    if (isOOS && lastType !== "stock_zero") {
      toInsert.push({
        source_db: "DB07", notion_id: p.notion_id, event_type: "stock_zero",
        title: p.name || "（未命名商品）", metadata: { stock: p.stock },
      });
    } else if (!isOOS && lastType === "stock_zero") {
      toInsert.push({
        source_db: "DB07", notion_id: p.notion_id, event_type: "stock_restocked",
        title: p.name || "（未命名商品）", metadata: { stock: p.stock },
      });
    }
  }
  if (toInsert.length > 0) {
    await supabaseAdmin.from("workbench_notifications").insert(toInsert);
  }

  // 4. Cleanup：批次刪除「不再 active」的 DB07 events
  const idsToDelete = (existingEvents || []).filter(ev => !activeIds.has(ev.notion_id)).map(ev => ev.id);
  if (idsToDelete.length > 0) {
    await supabaseAdmin.from("workbench_notifications").delete().in("id", idsToDelete);
  }
}

// ── 讀通知列表 ────────────────────────────────────────
async function fetchNotifications() {
  const { data, error } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, source_db, notion_id, event_type, event_at, title, metadata")
    .order("event_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

// ── helpers ─────────────────────────────────────────
function readTitle(prop: any): string {
  if (!prop) return "";
  if (prop.title) return (prop.title || []).map((t: any) => t.plain_text || "").join("");
  if (prop.rich_text) return (prop.rich_text || []).map((t: any) => t.plain_text || "").join("");
  return "";
}
