import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/points
 * 回傳目前登入會員的點數餘額 + 流水
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "找不到會員" }, { status: 404 });

  const [{ data: balance }, { data: ledger }] = await Promise.all([
    supabaseAdmin
      .from("point_balance")
      .select("spending_points, books_purchased, articles_unlocked, distance_km, checkin_count, last_updated")
      .eq("member_id", member.id)
      .maybeSingle(),
    supabaseAdmin
      .from("point_ledger")
      .select("id, type, value, source_table, source_id, note, expires_at, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    balance: balance || {
      spending_points: 0, books_purchased: 0, articles_unlocked: 0,
      distance_km: 0, checkin_count: 0, last_updated: null,
    },
    ledger: ledger || [],
  });
}
