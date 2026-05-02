/**
 * 工作台「動態」Tab 的掃描邏輯
 *
 * 共用給：
 *   - GET /api/staff/workbench/notifications?scan=1 （前端按「重新掃描」）
 *   - POST /api/cron/workbench-scan （n8n cron 每 5 分鐘背景跑）
 *
 * 設計重點：
 *   - In-memory diff：一次拉所有現有 events 進 Map，避免 N 次 supabase round-trip
 *   - 不分頁、不重試（Notion client 自己有 15s timeout）
 *   - batch insert / batch delete，每個 scan 只 4 個 supabase calls
 */
import { Client } from "@notionhq/client";
import { supabaseAdmin } from "@/lib/supabase";
import { DB } from "@/lib/notion";

const notion = new Client({ auth: process.env.NOTION_API_KEY, timeoutMs: 15000 });

// ── DB04 掃描 ────────────────────────────────────────
export async function scanDb04() {
  const res: any = await notion.dataSources.query({
    data_source_id: DB.DB04_COLLABORATION,
    filter: { property: "執行狀態", status: { equals: "執行中" } } as any,
    page_size: 100,
  });
  const pages: any[] = res.results || [];
  const activeIds = new Set<string>(pages.map((p: any) => p.id.replace(/-/g, "")));

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

  const idsToDelete = (existingEvents || []).filter(ev => !activeIds.has(ev.notion_id)).map(ev => ev.id);
  if (idsToDelete.length > 0) {
    await supabaseAdmin.from("workbench_notifications").delete().in("id", idsToDelete);
  }

  return { inserted: toInsert.length, deleted: idsToDelete.length, totalActive: activeIds.size };
}

// ── DB07 掃描 ────────────────────────────────────────
export async function scanDb07() {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("notion_id, name, stock")
    .eq("status", "active")
    .not("notion_id", "is", null);
  const activeIds = new Set<string>((products || []).map(p => p.notion_id));

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

  const idsToDelete = (existingEvents || []).filter(ev => !activeIds.has(ev.notion_id)).map(ev => ev.id);
  if (idsToDelete.length > 0) {
    await supabaseAdmin.from("workbench_notifications").delete().in("id", idsToDelete);
  }

  return { inserted: toInsert.length, deleted: idsToDelete.length, totalActive: activeIds.size };
}

// ── 讀通知列表 ────────────────────────────────────────
export async function fetchNotifications(limit = 100) {
  const { data, error } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, source_db, notion_id, event_type, event_at, title, metadata")
    .order("event_at", { ascending: false })
    .limit(limit);
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

/** 把任意 error 物件展開成可讀字串（含 Notion 的 code 跟 body） */
export function formatErr(e: any): string {
  if (!e) return "(empty error)";
  const msg = e?.message || String(e);
  const code = e?.code ? ` code=${e.code}` : "";
  let body = "";
  if (e?.body) {
    body = typeof e.body === "string" ? ` body=${e.body.slice(0, 300)}` : ` body=${JSON.stringify(e.body).slice(0, 300)}`;
  }
  return `${msg}${code}${body}`;
}
