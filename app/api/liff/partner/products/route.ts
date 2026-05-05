import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/products
 * Body: { accessToken: string }
 *
 * 回傳該廠商名下的商品清單 + 即時庫存 + 30 天銷售
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "缺少 accessToken" }, { status: 400 });
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
    if (!member?.email) return NextResponse.json({ ok: true, partner: null });

    const { data: partner } = await supabase
      .from("partners")
      .select("id, notion_id, name")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();
    if (!partner) return NextResponse.json({ ok: true, partner: null });

    const { data: products } = await supabase
      .from("products")
      .select("id, notion_id, name, price, stock, category, sub_category, images, status")
      .eq("publisher_notion_id", partner.notion_id)
      .order("status", { ascending: false })
      .order("stock", { ascending: true });

    const productIds = (products || []).map((p) => p.id);

    // 30 天銷售統計
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: items } = productIds.length
      ? await supabase
          .from("order_items")
          .select("item_id, quantity, price, order_id, created_at")
          .in("item_id", productIds)
          .eq("item_type", "商品")
          .gte("created_at", thirtyDaysAgo)
      : { data: [] as any[] };

    // 排除取消訂單
    const orderIds = [...new Set((items || []).map((i: any) => i.order_id))];
    const { data: orders } = orderIds.length
      ? await supabase.from("orders").select("id, status").in("id", orderIds)
      : { data: [] as any[] };
    const cancelledIds = new Set(
      (orders || []).filter((o: any) => o.status === "cancelled").map((o: any) => o.id)
    );

    const salesByProduct: Record<string, { sold: number; revenue: number }> = {};
    for (const it of items || []) {
      if (cancelledIds.has(it.order_id)) continue;
      const k = it.item_id;
      if (!salesByProduct[k]) salesByProduct[k] = { sold: 0, revenue: 0 };
      salesByProduct[k].sold += Number(it.quantity || 0);
      salesByProduct[k].revenue += Number(it.price || 0) * Number(it.quantity || 0);
    }

    const enriched = (products || []).map((p) => {
      let photo: string | null = null;
      try {
        const imgs = JSON.parse((p.images as any) || "[]");
        photo = imgs[0] || null;
      } catch {}
      const sales = salesByProduct[p.id] || { sold: 0, revenue: 0 };
      return {
        id: p.notion_id || p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        category: p.category,
        sub_category: p.sub_category,
        photo,
        status: p.status,
        sold30d: sales.sold,
        revenue30d: sales.revenue,
      };
    });

    return NextResponse.json({
      ok: true,
      partner: { id: partner.id, name: partner.name },
      products: enriched,
    });
  } catch (err: any) {
    console.error("[liff/partner/products] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
