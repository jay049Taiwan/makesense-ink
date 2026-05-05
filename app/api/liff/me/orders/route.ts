import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/me/orders
 * Body: { accessToken: string }
 *
 * 驗證 LIFF accessToken → 反查 member → 回傳該會員的 orders 摘要 + order_items
 * （給 LIFF 端的 profile / shop / mood-books 頁用，避免直接 anon SELECT members/orders/order_items）
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "缺少 accessToken" }, { status: 400 });
    }

    // 用 LINE 端點驗證 token，拿 line_uid
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ ok: false, message: "LINE token 無效" }, { status: 401 });
    }
    const profile = await profileRes.json();
    const lineUid = profile.userId;

    const { data: member } = await supabase
      .from("members")
      .select("id, name, email, member_type")
      .eq("line_uid", lineUid)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ ok: true, member: null, orders: [] });
    }

    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, status, created_at, order_items(id, name, qty, price, item_id, item_type)")
      .eq("member_id", member.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      ok: true,
      member: { id: member.id, name: member.name, email: member.email, role: member.member_type },
      orders: orders || [],
    });
  } catch (err: any) {
    console.error("[liff/me/orders] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
