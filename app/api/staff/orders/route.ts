import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { requireStaff } from "@/app/api/staff/_guard";

/**
 * GET /api/staff/orders — 取得所有訂單（staff 限定）
 * Query: ?status=pending|confirmed|cancelled&limit=50&offset=0
 *
 * PATCH /api/staff/orders — 更新訂單狀態
 * Body: { orderId, status: "confirmed" | "cancelled" }
 */

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status") || "all";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  let query = supabase
    .from("orders")
    .select(`
      id, status, checkin_status, total, created_at, source, note, refund_info,
      members (id, name, email, phone),
      order_items (id, item_type, quantity, price, meta)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: orders, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: orders || [], count });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const { orderId, status } = await req.json();

  if (!orderId || !["confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status, total, members(email, name), order_items(id, item_type, quantity, meta)")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  }

  // 只有 pending 訂單可以確認或取消；confirmed 只能取消
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "已取消的訂單無法再異動" }, { status: 409 });
  }
  if (order.status === "confirmed" && status === "confirmed") {
    return NextResponse.json({ error: "訂單已確認" }, { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // 如果是 confirmed，補寫點數（pending reservation 下單時沒有立刻寫）
  if (status === "confirmed" && order.status === "pending") {
    try {
      const mem = (order as any).members;
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("email", mem?.email || "")
        .maybeSingle();

      if (member) {
        const total = Number((order as any).total) || 0;
        const spendingPoints = Math.floor(total / 10);
        if (spendingPoints > 0) {
          await supabase.from("point_ledger").insert({
            member_id: member.id,
            type: "消費積點",
            value: spendingPoints,
            source_table: "orders",
            source_id: orderId,
            note: `訂單 #${orderId.slice(0, 8)} 錄取確認`,
          });
        }
      }
    } catch (e) {
      console.warn("[staff/orders] 補寫點數失敗:", e);
    }
  }

  return NextResponse.json({ ok: true, orderId, newStatus: status });
}
