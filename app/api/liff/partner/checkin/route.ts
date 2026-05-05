import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/checkin
 * Body: { accessToken: string, orderId: string }
 *
 * 廠商簽到掃碼後呼叫，把 orders.checkin_status 改為 checked_in
 * 權限驗證：訂單必須包含廠商名下的活動 / 商品
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, orderId } = await req.json();
    if (!accessToken || !orderId) {
      return NextResponse.json({ ok: false, message: "缺少參數" }, { status: 400 });
    }
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ ok: false, message: "LINE token 無效" }, { status: 401 });
    }
    const { userId: lineUid } = await profileRes.json();

    const { data: member } = await supabase
      .from("members")
      .select("email")
      .eq("line_uid", lineUid)
      .maybeSingle();
    if (!member?.email) return NextResponse.json({ ok: false, message: "未綁定會員" }, { status: 401 });

    const { data: partner } = await supabase
      .from("partners")
      .select("id, notion_id, name")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();
    if (!partner) return NextResponse.json({ ok: false, message: "非合作廠商" }, { status: 403 });

    // 解析 orderId（接受 UUID 或 32hex）
    const cleanId = orderId.replace(/-/g, "").toLowerCase();
    const formattedId =
      cleanId.length === 32
        ? cleanId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
        : orderId;

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, checkin_status")
      .eq("id", formattedId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ ok: false, status: "not_found", message: "訂單不存在" }, { status: 404 });
    }
    if (order.status === "cancelled") {
      return NextResponse.json({ ok: false, status: "cancelled", message: "訂單已取消" }, { status: 400 });
    }
    if (order.checkin_status === "checked_in") {
      return NextResponse.json({ ok: true, status: "already_checked_in", order: { id: order.id } });
    }

    // 權限驗證：訂單品項是否屬於此廠商
    const { data: items } = await supabase
      .from("order_items")
      .select("item_id, item_type")
      .eq("order_id", formattedId);

    const productIds = (items || []).filter((i) => i.item_type === "商品").map((i) => i.item_id);
    const eventIds = (items || []).filter((i) => i.item_type !== "商品").map((i) => i.item_id);

    let isOwn = false;
    if (productIds.length > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id")
        .in("id", productIds)
        .eq("publisher_notion_id", partner.notion_id);
      if (prods && prods.length > 0) isOwn = true;
    }
    if (!isOwn && eventIds.length > 0) {
      const { data: evs } = await supabase
        .from("events")
        .select("id, related_partner_ids")
        .in("id", eventIds);
      if ((evs || []).some((e: any) => (e.related_partner_ids || []).includes(partner.notion_id))) {
        isOwn = true;
      }
    }
    if (!isOwn) {
      return NextResponse.json({ ok: false, status: "wrong_vendor", message: "非本攤訂單" }, { status: 403 });
    }

    // 寫入 checkin_status
    const { error } = await supabase
      .from("orders")
      .update({ checkin_status: "checked_in", updated_at: new Date().toISOString() })
      .eq("id", formattedId);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "completed", order: { id: formattedId } });
  } catch (err: any) {
    console.error("[liff/partner/checkin] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
