import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/orders?email=xxx — 取得會員的訂單 + 明細 + 評價
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "需要 email" }, { status: 400 });
  }

  try {
    // 找會員
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", email)
      .single();

    if (!member) {
      return NextResponse.json({ orders: [], memberId: null });
    }

    // 取訂單 + 明細 + 評價
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, status, total, created_at,
        order_items (
          id, item_type, quantity, price, meta,
          reviews (id, rating, comment, created_at)
        )
      `)
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders, memberId: member.id });
  } catch (err) {
    console.error("查詢訂單錯誤:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
