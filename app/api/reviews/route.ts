import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/reviews — 建立評價
 */
export async function POST(req: NextRequest) {
  try {
    const { orderItemId, memberId, rating, comment } = await req.json();

    if (!orderItemId || !memberId || !rating) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "評分需為 1-5" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          order_item_id: orderItemId,
          member_id: memberId,
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_item_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("建立評價失敗:", error);
      return NextResponse.json({ error: "建立評價失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (err) {
    console.error("評價 API 錯誤:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}

/**
 * GET /api/reviews?memberId=xxx — 取得會員的評價
 * GET /api/reviews?productId=xxx — 取得商品的評價（合作廠商用）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const productId = searchParams.get("productId");

  try {
    if (memberId) {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, order_items(item_type, meta, price)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ reviews: data });
    }

    if (productId) {
      // 合作廠商查看某商品的所有評價
      const { data, error } = await supabase
        .from("reviews")
        .select("*, order_items!inner(item_type, meta, price), members(name)")
        .filter("order_items.meta->>productId", "eq", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ reviews: data });
    }

    return NextResponse.json({ error: "需要 memberId 或 productId" }, { status: 400 });
  } catch (err) {
    console.error("查詢評價錯誤:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
