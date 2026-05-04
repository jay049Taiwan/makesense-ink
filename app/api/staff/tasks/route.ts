import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { getNotionUserId } from "@/lib/notion-users";
import { fetchTasksFromNotion } from "@/lib/staff-tasks";
import { supabaseAdmin } from "@/lib/supabase";

// SWR 模式：
// - Fast path（預設 GET）→ 用 email 直接查 staff_tasks_cache（~100ms 秒回）
//   不打 getNotionUserId，避免冷啟動拉 Notion 工作區 user list 的 5-10 秒
// - Slow path（cache miss 或 ?refresh=1）→ 才需要 getNotionUserId + fetchTasksFromNotion + upsert
//
// 前端 SWR：mount 先打預設拿 cache 顯示，render 後背景叫 ?refresh=1 主動更新畫面。
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = (guard.email || "").toLowerCase();
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  // Fast path：直接 email 查 cache，不碰 Notion 任何 API
  if (!force && email) {
    const { data: cached } = await supabaseAdmin
      .from("staff_tasks_cache")
      .select("data, synced_at")
      .eq("staff_email", email)
      .maybeSingle();
    if (cached?.data) {
      return NextResponse.json({ ...cached.data, source: "cache", synced_at: cached.synced_at });
    }
  }

  // Slow path：cache miss 或強制刷新
  const notionUserId = await getNotionUserId(email);
  if (!notionUserId) {
    return NextResponse.json({
      tree: [], orphanTasks: [], orphanDetails: [],
      counts: { db03: 0, db04: 0, db05: 0 },
      message: "此帳號尚未在 Notion 中被指派任務",
      source: "empty",
    });
  }

  try {
    const data = await fetchTasksFromNotion(notionUserId);
    // 背景寫回 cache（不擋回應）
    supabaseAdmin
      .from("staff_tasks_cache")
      .upsert({
        staff_notion_id: notionUserId,
        staff_email: email,
        data,
        synced_at: new Date().toISOString(),
      })
      .then(({ error }) => { if (error) console.error("[staff/tasks] cache upsert failed:", error.message); });
    return NextResponse.json({ ...data, source: "notion" });
  } catch (err: any) {
    console.error("[staff/tasks] error:", err.message);
    return NextResponse.json({ error: "查詢待辦失敗：" + err.message }, { status: 500 });
  }
}
