import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Parallel queries for performance
    const [
      pageViewsCountRes,
      recentPageViewsRes,
      searchesCountRes,
      recentSearchesRes,
      ordersRes,
      membersRes,
      wishlistRes,
    ] = await Promise.all([
      // Total page views (last 30 days)
      supabase
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      // Recent 500 page views for aggregation
      supabase
        .from("page_views")
        .select("path")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(500),
      // Total searches (last 30 days)
      supabase
        .from("search_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      // Recent 200 search logs for aggregation
      supabase
        .from("search_logs")
        .select("keyword")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      // Orders (last 30 days)
      supabase
        .from("orders")
        .select("id, total, source, created_at")
        .gte("created_at", thirtyDaysAgo),
      // Members count
      supabase
        .from("members")
        .select("id", { count: "exact", head: true }),
      // Wishlist count
      supabase
        .from("wishlist")
        .select("id", { count: "exact", head: true }),
    ]);

    // Aggregate top pages from recent page views
    const pageViewPaths = recentPageViewsRes.data || [];
    const pathCounts: Record<string, number> = {};
    pageViewPaths.forEach((pv: any) => {
      const p = pv.path || "/";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    });
    const topPages = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Aggregate top searches from recent search logs
    const searchEntries = recentSearchesRes.data || [];
    const keywordCounts: Record<string, number> = {};
    searchEntries.forEach((s: any) => {
      const kw = (s.keyword || "").trim();
      if (kw) keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
    const topSearches = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // Process orders
    const orders = ordersRes.data || [];
    const totalRevenue = orders.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.total) || 0),
      0
    );
    const ordersBySource: Record<string, number> = {};
    orders.forEach((o: any) => {
      const src = o.source || "web";
      ordersBySource[src] = (ordersBySource[src] || 0) + 1;
    });

    return NextResponse.json({
      period: "last_30_days",
      pageViews: pageViewsCountRes.count || 0,
      topPages,
      searches: searchesCountRes.count || 0,
      topSearches,
      orders: {
        total: orders.length,
        revenue: totalRevenue,
        bySource: ordersBySource,
      },
      members: membersRes.count || 0,
      wishlist: wishlistRes.count || 0,
    }, {
      headers: { "Cache-Control": "private, s-maxage=60" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
