import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { getNotionUserId } from "@/lib/notion-users";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/staff/metrics — 工作團隊個人績效儀表板
//
// 回傳 4 種指標：
//   total_revenue   — 個人創造營收（products/events 我擔任 owner_staff 的銷售合計）
//   total_views     — 點擊績效（products/events 我擔任 owner_staff 的 page_views 累計）
//   product_count   — 我負責選品的商品數
//   event_count     — 我負責企劃的活動數
//
// 額外計算：完成流程次數（從 staff_activities 累計）
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = (guard.email || "").toLowerCase();

  const notionUserId = await getNotionUserId(email);
  if (!notionUserId) {
    return NextResponse.json({
      total_revenue: 0, total_views: 0, product_count: 0, event_count: 0,
      activity_count: 0,
      message: "此帳號尚未在 Notion 工作區，無法計算績效",
    });
  }

  // 1. staff_metrics_v 撈 4 個 KPI
  const { data: m } = await supabaseAdmin
    .from("staff_metrics_v")
    .select("total_revenue, total_views, product_count, event_count")
    .eq("owner_staff_notion_id", notionUserId)
    .maybeSingle();

  // 2. staff_activities 累計（完成流程次數）— 透過 DB08 page id 反查 staff.id
  let activityCount = 0;
  // 反查 staff.id：先用 email → fetchPersonByEmail(DB08) → staff.notion_id
  // 這裡 reuse staff-helper 的 getStaffIdByEmail
  try {
    const { getStaffIdByEmail } = await import("@/lib/staff-helper");
    const staffId = await getStaffIdByEmail(email);
    if (staffId) {
      const { count } = await supabaseAdmin
        .from("staff_activities")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", staffId);
      activityCount = count || 0;
    }
  } catch (e) { console.warn("[metrics] staff_activities count failed:", e); }

  return NextResponse.json({
    total_revenue: Number(m?.total_revenue || 0),
    total_views: Number(m?.total_views || 0),
    product_count: Number(m?.product_count || 0),
    event_count: Number(m?.event_count || 0),
    activity_count: activityCount,
    notion_user_id: notionUserId,
  });
}
