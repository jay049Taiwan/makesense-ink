import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/staff/partner-metrics?ids=a,b,c
//   回傳 partner_metrics_v 對應 row（key = DB08 notion_id 32 碼無 dash）
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim().replace(/-/g, "")).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ metrics: {} });

  const { data, error } = await supabaseAdmin
    .from("partner_metrics_v")
    .select("notion_id, product_count, out_of_stock_count, total_revenue, conversion_count, reach_count, event_count, newsletter_count")
    .in("notion_id", ids);
  if (error) {
    console.error("[partner-metrics] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const metrics: Record<string, any> = {};
  for (const row of data || []) metrics[row.notion_id] = row;
  return NextResponse.json({ metrics });
}
