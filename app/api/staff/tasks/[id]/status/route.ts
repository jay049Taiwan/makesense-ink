import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { updatePageProperties } from "@/lib/staff-tasks";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { field, value } = await req.json();
  const properties: Record<string, any> = {};
  if (field === "execution") {
    properties["執行狀態"] = { status: { name: value } };
  } else if (field === "review") {
    return NextResponse.json({ error: "目前介面不支援修改檢核狀態" }, { status: 403 });
  } else {
    return NextResponse.json({ error: "無效的欄位" }, { status: 400 });
  }
  try {
    await updatePageProperties(id, properties);

    // Hook：DB04 完成 → 寫距離行程 point_ledger（會員「我的宜蘭」遊戲文化資產基礎）
    let distanceWrote = 0;
    if (field === "execution" && value === "已完成") {
      try {
        distanceWrote = await awardDistancePoints(id);
      } catch (e: any) {
        console.error("[task/status] awardDistancePoints failed:", e.message);
      }
    }
    return NextResponse.json({
      success: true,
      message: "執行狀態已更新",
      ...(distanceWrote > 0 ? { distance_points_awarded: distanceWrote } : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}

/**
 * DB04 完成時，把距離 km 寫入所有已報名會員的 point_ledger（type=距離行程）。
 * 冪等：先查 (member_id, source_id, type) 是否已存在，避免重複發點。
 * 回傳新發出的點數筆數。
 */
async function awardDistancePoints(taskId: string): Promise<number> {
  const cleanId = taskId.replace(/-/g, "");

  // 1. 找對應 event（notion_id 兩種格式都試）
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, distance_km, notion_id, title")
    .or(`notion_id.eq.${taskId},notion_id.eq.${cleanId}`)
    .maybeSingle();
  if (!event || !event.distance_km || event.distance_km <= 0) return 0;

  // 2. event → order_items → orders → member_id
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id, order_id")
    .eq("item_type", "event")
    .eq("item_id", event.id);
  if (!items || items.length === 0) return 0;

  const orderIds = Array.from(new Set(items.map((i) => i.order_id)));
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, member_id, status")
    .in("id", orderIds);
  if (!orders) return 0;

  const validMemberIds = Array.from(new Set(
    orders.filter((o) => o.member_id && !["cancelled", "refunded"].includes(o.status)).map((o) => o.member_id as string)
  ));
  if (validMemberIds.length === 0) return 0;

  // 3. 冪等檢查
  const { data: existing } = await supabaseAdmin
    .from("point_ledger")
    .select("member_id")
    .eq("type", "距離行程")
    .eq("source_table", "events")
    .eq("source_id", event.id)
    .in("member_id", validMemberIds);
  const alreadyAwarded = new Set((existing || []).map((r) => r.member_id));
  const toAward = validMemberIds.filter((m) => !alreadyAwarded.has(m));
  if (toAward.length === 0) return 0;

  // 4. 批次寫入
  const rows = toAward.map((member_id) => ({
    member_id,
    type: "距離行程",
    value: event.distance_km,
    source_table: "events",
    source_id: event.id,
    note: `${event.title || "走讀活動"} 完成（${event.distance_km} km）`,
  }));
  const { error } = await supabaseAdmin.from("point_ledger").insert(rows);
  if (error) {
    console.error("[awardDistancePoints] insert failed:", error.message);
    return 0;
  }
  console.log(`[awardDistancePoints] event ${event.id} → ${rows.length} members awarded ${event.distance_km} km`);
  return rows.length;
}
