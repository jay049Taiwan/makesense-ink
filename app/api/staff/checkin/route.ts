import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { requireStaff } from "@/app/api/staff/_guard";

/**
 * POST /api/staff/checkin
 * Body: { orderId }
 * 將已確認訂單標記為已報到（checkin_status = "checked_in"）
 *
 * DELETE /api/staff/checkin
 * Body: { orderId }
 * 取消報到（checkin_status = null）— 誤打用
 */

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, checkin_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  if (order.status !== "confirmed") {
    return NextResponse.json({ error: "只有已確認訂單可以報到" }, { status: 409 });
  }
  if (order.checkin_status === "checked_in") {
    return NextResponse.json({ ok: true, alreadyCheckedIn: true });
  }

  const { error } = await supabase
    .from("orders")
    .update({ checkin_status: "checked_in", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkinStatus: "checked_in" });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });

  const { error } = await supabase
    .from("orders")
    .update({ checkin_status: null, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkinStatus: null });
}
