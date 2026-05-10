import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/track/duration
 * Body: { session_id, path, duration_sec }
 *
 * 用 navigator.sendBeacon 從前端送出，更新該 session 在該 path 最近一筆 page_views.duration_sec。
 * 若 page_views 對應 row 還沒寫入（race condition），就忽略（下次 page_view 寫進去時會帶上）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const sessionId = body?.session_id;
    const path = body?.path;
    const duration = Number(body?.duration_sec);

    if (!sessionId || !path || !Number.isFinite(duration) || duration < 0 || duration > 24 * 3600) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }

    // 找該 session 在該 path 最近一筆 page_view（duration_sec 還沒寫的優先）
    const { data: row } = await supabaseAdmin
      .from("page_views")
      .select("id, duration_sec")
      .eq("session_id", sessionId)
      .eq("path", path)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return NextResponse.json({ ok: true, skipped: "no matching page_view" });

    // 只在 duration_sec 還是 null 或比新值小時才更新（避免覆蓋更長的停留）
    if (row.duration_sec != null && row.duration_sec >= duration) {
      return NextResponse.json({ ok: true, skipped: "existing >= new" });
    }

    await supabaseAdmin
      .from("page_views")
      .update({ duration_sec: Math.round(duration) })
      .eq("id", row.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[track/duration]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
