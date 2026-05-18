import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

/**
 * POST /api/reviews — 建立評價（需登入，只能對自己的訂單明細評價）
 */
export async function POST(req: NextRequest) {
  // 驗證登入
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  try {
    const { orderItemId, rating, comment } = await req.json();

    if (!orderItemId || !rating) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "評分需為 1-5" }, { status: 400 });
    }

    // 從 session 取 memberId（不信任 client 傳入的 memberId）
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", normalizeEmail(session.user.email) || "")
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }
    const memberId = member.id;

    // 驗證 orderItemId 確實屬於此會員（防 IDOR）
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("id, order_id, orders!inner(member_id)")
      .eq("id", orderItemId)
      .maybeSingle();
    if (!orderItem || (orderItem.orders as any)?.member_id !== memberId) {
      return NextResponse.json({ error: "無法對此商品評價" }, { status: 403 });
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
