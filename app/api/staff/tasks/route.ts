import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { getNotionUserId } from "@/lib/notion-users";
import { fetchVisibleTasksForStaff } from "@/lib/staff-tasks";
import { supabaseAdmin } from "@/lib/supabase";

// Vercel 預設 10s timeout 不夠 — cold cache 第一次打 Notion union 需要 30+s
export const runtime = "nodejs";
export const maxDuration = 60;

// SWR：
// - 預設 GET → email 直接查 staff_tasks_cache（~100ms 秒回）
// - ?refresh=1 → 打 Notion + upsert
// - cache miss → fallback 打 Notion + upsert + 回傳
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = (guard.email || "").toLowerCase();
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  // Fast path
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

  // Slow path
  const notionUserId = await getNotionUserId(email);
  if (!notionUserId) {
    return NextResponse.json({
      items: [], counts: { pending: 0, done: 0 },
      message: "此帳號尚未在 Notion 中被指派任務",
      source: "empty",
    });
  }

  try {
    const data = await fetchVisibleTasksForStaff(notionUserId);
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
