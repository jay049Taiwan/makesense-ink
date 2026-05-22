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

/**
 * PUT /api/staff/orders — 標記退款完成
 * Body: { orderId, refundNote?: string }
 */
export async function PUT(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const { orderId, refundNote } = await req.json();
  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });

  const { error } = await supabase
    .from("orders")
    .update({
      refund_status: "refunded",
      refund_note: refundNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
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

  // 如果是 cancelled，補做兩件事：
  //   (a) direct 訂單 → 把商品庫存退回（reservation 不在結帳時扣庫存，不需退）
  //   (b) 若此訂單有「點數折抵」記錄 → 補一筆「點數退回」還給會員
  if (status === "cancelled") {
    // (a) 庫存退回：只有 direct 訂單才有扣庫存（reservation pending 不扣）
    //   判斷方式：order_items 裡若有 item_type 屬於商品（非票券類），視為 direct
    const directItemTypes = ["商品", "選書", "選物", "數位"];
    const directItems = (order.order_items as any[]).filter((oi: any) =>
      directItemTypes.includes(oi.item_type)
    );
    if (directItems.length > 0) {
      for (const oi of directItems) {
        if (!oi.meta?.productId && !oi.meta?.productNotionId) continue;
        const pid = oi.meta.productId || oi.meta.productNotionId;
        // 用 notion_id 或 uuid 查 Supabase products
        const normalized = pid.replace(/-/g, "").toLowerCase();
        const { data: product } = await supabase
          .from("products")
          .select("id")
          .or(`notion_id.eq.${normalized},id.eq.${pid}`)
          .maybeSingle();
        if (product) {
          // 原子加回庫存（對應 checkout 的 decrement_stock RPC）
          await supabase.rpc("increment_stock", { p_id: product.id, qty: oi.quantity });
        }
      }
    }

    // (b) 點數退回：查有沒有這筆訂單的「點數折抵」負向 ledger
    const mem = (order as any).members;
    if (mem?.email) {
      const { data: memberRow } = await supabase
        .from("members")
        .select("id")
        .eq("email", mem.email)
        .maybeSingle();

      if (memberRow) {
        const { data: deductionRow } = await supabase
          .from("point_ledger")
          .select("id, value")
          .eq("source_table", "orders")
          .eq("source_id", orderId)
          .eq("type", "點數折抵")
          .maybeSingle();

        if (deductionRow && deductionRow.value < 0) {
          const refundPoints = Math.abs(deductionRow.value);
          await supabase.from("point_ledger").insert({
            member_id: memberRow.id,
            type: "點數退回",
            value: refundPoints,
            source_table: "orders",
            source_id: orderId,
            note: `訂單 #${orderId.slice(0, 8)} 取消退回 ${refundPoints} 點`,
          });
        }
      }
    }
  }

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

  // 推播 LINE 通知給顧客
  try {
    const { notifyOrderStatusChange } = await import("@/lib/line-notifications");
    await notifyOrderStatusChange(orderId, status);
  } catch (e: any) {
    console.warn("[staff/orders] LINE 通知失敗（不影響狀態更新）:", e?.message);
  }

  return NextResponse.json({ ok: true, orderId, newStatus: status });
}
