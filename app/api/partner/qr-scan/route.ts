import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/partner/qr-scan
 * Body: { action: "lookup" | "confirm", orderId: string, partnerNotionId?: string }
 *
 * lookup: 查詢訂單 + items + buyer 資訊（需要 NextAuth session）
 *         若提供 partnerNotionId，會過濾只屬於該廠商的 items
 * confirm: 把訂單標記為已簽到（checkin_status = checked_in）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "未登入" }, { status: 401 });
  }

  try {
    const { action, orderId, partnerNotionId } = await req.json();
    if (!orderId || !action) {
      return NextResponse.json({ ok: false, error: "缺少參數" }, { status: 400 });
    }

    if (action === "confirm") {
      // 若有提供 partnerNotionId，先驗證此訂單確實包含該廠商的商品（與 lookup 一致）
      if (partnerNotionId) {
        const { data: items } = await supabase
          .from("order_items")
          .select("item_id")
          .eq("order_id", orderId)
          .eq("item_type", "product");
        const prodIds = (items || []).map((i: any) => i.item_id).filter(Boolean);
        if (prodIds.length === 0) {
          return NextResponse.json({ ok: false, error: "此訂單無商品明細" }, { status: 403 });
        }
        const { data: prods } = await supabase
          .from("products")
          .select("id, publisher_notion_id")
          .in("id", prodIds);
        const hasMyItem = (prods || []).some((p: any) => p.publisher_notion_id === partnerNotionId);
        if (!hasMyItem) {
          return NextResponse.json({ ok: false, error: "此訂單不包含你的商品" }, { status: 403 });
        }
      }

      const { error } = await supabase
        .from("orders")
        .update({ checkin_status: "checked_in" })
        .eq("id", orderId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action !== "lookup") {
      return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
    }

    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, checkin_status, created_at, status, member_id")
      .eq("id", orderId)
      .neq("status", "cancelled")
      .maybeSingle();

    if (!orderRow) return NextResponse.json({ ok: true, step: "not_found" });
    if (orderRow.checkin_status === "checked_in") {
      return NextResponse.json({ ok: true, step: "already_checked_in" });
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("item_id, item_type, quantity, price, item_name")
      .eq("order_id", orderId)
      .eq("item_type", "product");
    const productItems = items || [];

    let myItems = productItems;
    if (partnerNotionId && productItems.length > 0) {
      const prodIds = productItems.map(i => i.item_id).filter(Boolean);
      const { data: prods } = await supabase
        .from("products")
        .select("id, publisher_notion_id")
        .in("id", prodIds);
      const myProdIds = new Set(
        (prods || []).filter(p => p.publisher_notion_id === partnerNotionId).map(p => p.id)
      );
      myItems = productItems.filter(i => myProdIds.has(i.item_id));
      if (myItems.length === 0) return NextResponse.json({ ok: true, step: "wrong_vendor" });
    }

    let buyerName = "顧客", buyerPhone = "—";
    if (orderRow.member_id) {
      const { data: member } = await supabase
        .from("members")
        .select("name, phone")
        .eq("id", orderRow.member_id)
        .maybeSingle();
      if (member) {
        buyerName = member.name || "顧客";
        buyerPhone = member.phone || "—";
      }
    }

    return NextResponse.json({
      ok: true,
      step: "found",
      order: {
        orderId: orderRow.id,
        buyerName,
        buyerPhone,
        createdAt: orderRow.created_at,
        checkinStatus: orderRow.checkin_status,
        items: myItems.map(i => ({
          name: i.item_name || "商品",
          qty: i.quantity || 1,
          price: i.price || 0,
        })),
      },
    });
  } catch (err: any) {
    console.error("[partner/qr-scan] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
