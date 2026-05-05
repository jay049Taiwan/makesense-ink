import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/user/partner-metrics
 * 回傳當前 NextAuth session 使用者（合作夥伴）的 partner_metrics_v 績效資料。
 * 從 session.notionId 反查（合作夥伴自己的 DB08 notion_id）。
 *
 * 隔離：絕對只回 session 對應的那一筆，不暴露其他廠商業績。
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "未登入" }, { status: 401 });
  }
  const notionId = (session as any).notionId?.replace(/-/g, "") || null;
  if (!notionId) {
    return NextResponse.json({ ok: true, metrics: null });
  }

  const { data, error } = await supabaseAdmin
    .from("partner_metrics_v")
    .select("reach_count, conversion_count, total_revenue, product_count, out_of_stock_count, event_count, newsletter_count, avg_rating, review_count")
    .eq("notion_id", notionId)
    .maybeSingle();

  if (error) {
    console.error("[user/partner-metrics] error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, metrics: data || null });
}
