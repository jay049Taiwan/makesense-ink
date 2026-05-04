import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { getNotionUserId } from "@/lib/notion-users";
import { fetchTasksFromNotion } from "@/lib/staff-tasks";
import { supabaseAdmin } from "@/lib/supabase";

// SWR 模式：
// - 預設 GET → 讀 Supabase staff_tasks_cache（~100ms 秒回）
//   * cache miss → fallback 打 Notion + upsert + 回傳
// - GET ?refresh=1 → 強制打 Notion + upsert + 回傳新版（前端背景叫，回來再 setState 更新畫面）
//
// Cache 由 client 端的 SWR pattern 驅動更新，不另外開 cron。
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = guard.email || "";
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  const notionUserId = await getNotionUserId(email);
  if (!notionUserId) {
    return NextResponse.json({
      tree: [], orphanTasks: [], orphanDetails: [],
      counts: { db03: 0, db04: 0, db05: 0 },
      message: "此帳號尚未在 Notion 中被指派任務",
      source: "empty",
    });
  }

  // 預設：讀 Supabase cache
  if (!force) {
    const { data: cached } = await supabaseAdmin
      .from("staff_tasks_cache")
      .select("data, synced_at")
      .eq("staff_notion_id", notionUserId)
      .maybeSingle();
    if (cached?.data) {
      return NextResponse.json({ ...cached.data, source: "cache", synced_at: cached.synced_at });
    }
    // Cache miss：fallback 打 Notion 一次 + 寫回 cache
  }

  // refresh=1 或 cache miss → 打 Notion
  try {
    const data = await fetchTasksFromNotion(notionUserId);
    // 背景寫回 Supabase（不擋回應）
    supabaseAdmin
      .from("staff_tasks_cache")
      .upsert({ staff_notion_id: notionUserId, data, synced_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("[staff/tasks] cache upsert failed:", error.message); });
    return NextResponse.json({ ...data, source: "notion" });
  } catch (err: any) {
    console.error("[staff/tasks] error:", err.message);
    return NextResponse.json({ error: "查詢待辦失敗：" + err.message }, { status: 500 });
  }
}
