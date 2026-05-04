import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { fetchDB05Children } from "@/lib/staff-tasks";
import { supabaseAdmin } from "@/lib/supabase";

// SWR：跟 /api/staff/tasks 同樣 pattern
// - 預設 GET → 讀 staff_task_children_cache（~100ms 秒回）
// - ?refresh=1 → 強制打 Notion + upsert
// - cache miss → fallback 打 Notion + upsert + 回傳
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  // Fast path
  if (!force) {
    const { data: cached } = await supabaseAdmin
      .from("staff_task_children_cache")
      .select("children, synced_at")
      .eq("task_id", id)
      .maybeSingle();
    if (cached?.children) {
      return NextResponse.json({ children: cached.children, source: "cache", synced_at: cached.synced_at });
    }
  }

  // Slow path
  try {
    const children = await fetchDB05Children(id);
    supabaseAdmin
      .from("staff_task_children_cache")
      .upsert({ task_id: id, children, synced_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("[tasks/children] cache upsert failed:", error.message); });
    return NextResponse.json({ children, source: "notion" });
  } catch (err: any) {
    return NextResponse.json({ error: "查詢明細失敗：" + err.message }, { status: 500 });
  }
}
