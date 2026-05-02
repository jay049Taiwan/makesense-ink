import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../../_guard";
import { supabaseAdmin } from "@/lib/supabase";
import { DB } from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 30;

const notion = new Client({ auth: process.env.NOTION_API_KEY });

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

  try {
    await Promise.all([scanDb04(), scanDb07()]);
    const items = await fetchNotifications();
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("[workbench/notifications] error:", err);
    return NextResponse.json({ error: err?.message || "scan failed" }, { status: 500 });
  }
}

// ── DB04 掃描 ────────────────────────────────────────
async function scanDb04() {
  // 1. 拉所有「執行狀態 = 執行中」的 page
  const pages: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: DB.DB04_COLLABORATION,
      filter: { property: "執行狀態", status: { equals: "執行中" } },
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor && pages.length < 500);

  const activeIds = new Set<string>(pages.map((p: any) => p.id.replace(/-/g, "")));

  // 2. 對每筆 page，比對 last_edited_time vs 已存在的 db04_updated event
  for (const page of pages) {
    const notion_id = page.id.replace(/-/g, "");
    const lastEdited = page.last_edited_time as string;
    const title =
      readTitle(page.properties?.["主題名稱"]) ||
      readTitle(page.properties?.["交接名稱"]) ||
      "（未命名）";

    const { data: lastEvent } = await supabaseAdmin
      .from("workbench_notifications")
      .select("event_at")
      .eq("source_db", "DB04")
      .eq("notion_id", notion_id)
      .eq("event_type", "db04_updated")
      .order("event_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastEvent || new Date(lastEdited) > new Date(lastEvent.event_at)) {
      await supabaseAdmin.from("workbench_notifications").insert({
        source_db: "DB04",
        notion_id,
        event_type: "db04_updated",
        event_at: lastEdited,
        title,
      });
    }
  }

  // 3. Cleanup：刪除「不再執行中」的 events
  const { data: oldDb04 } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, notion_id")
    .eq("source_db", "DB04");
  for (const ev of oldDb04 || []) {
    if (!activeIds.has(ev.notion_id)) {
      await supabaseAdmin.from("workbench_notifications").delete().eq("id", ev.id);
    }
  }
}

// ── DB07 掃描 ────────────────────────────────────────
async function scanDb07() {
  // 1. 拉 Supabase 中所有 status='active' 的 product（已發佈）
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("notion_id, name, stock")
    .eq("status", "active")
    .not("notion_id", "is", null);

  const activeIds = new Set<string>((products || []).map(p => p.notion_id));

  // 2. 對每個 product，比對狀態 transition
  for (const p of products || []) {
    if (!p.notion_id) continue;
    const notion_id = p.notion_id;
    const isOOS = (p.stock ?? 0) <= 0;

    const { data: lastEvent } = await supabaseAdmin
      .from("workbench_notifications")
      .select("event_type")
      .eq("source_db", "DB07")
      .eq("notion_id", notion_id)
      .in("event_type", ["stock_zero", "stock_restocked"])
      .order("event_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastType = lastEvent?.event_type;

    if (isOOS && lastType !== "stock_zero") {
      // 上次不是缺貨（沒事件 / 上次補貨）→ 現在缺貨 → 推
      await supabaseAdmin.from("workbench_notifications").insert({
        source_db: "DB07",
        notion_id,
        event_type: "stock_zero",
        title: p.name || "（未命名商品）",
        metadata: { stock: p.stock },
      });
    } else if (!isOOS && lastType === "stock_zero") {
      // 上次缺貨 → 現在補貨 → 推
      await supabaseAdmin.from("workbench_notifications").insert({
        source_db: "DB07",
        notion_id,
        event_type: "stock_restocked",
        title: p.name || "（未命名商品）",
        metadata: { stock: p.stock },
      });
    }
    // 其他狀況：不建（重複事件）
  }

  // 3. Cleanup：刪除「不再 status='active'」的 events
  const { data: oldDb07 } = await supabaseAdmin
    .from("workbench_notifications")
    .select("id, notion_id")
    .eq("source_db", "DB07");
  for (const ev of oldDb07 || []) {
    if (!activeIds.has(ev.notion_id)) {
      await supabaseAdmin.from("workbench_notifications").delete().eq("id", ev.id);
    }
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
