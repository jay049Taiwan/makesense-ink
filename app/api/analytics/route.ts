import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

function isL2OrHigher(role: string | null | undefined): boolean {
  if (!role) return false;
  const m = role.match(/L(\d+)/i);
  return m ? parseInt(m[1]) >= 2 : false;
}

export async function GET(req: NextRequest) {
  // L2+ 工作帳號才能存取
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const sessionRole = (session as any)?.role;
  if (sessionRole !== "staff" && sessionRole !== "admin") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  // 從 staff 表查 role（同步 DB08 職級細項）
  const { data: staffRows } = await supabase.from("staff").select("role, name");
  const memberName = session?.user?.name || "";
  const myStaff = (staffRows || []).find(s => s.name && memberName && s.name === memberName);
  if (myStaff && !isL2OrHigher(myStaff.role)) {
    return NextResponse.json({ error: "需要 L2 以上職級" }, { status: 403 });
  }

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
      likesRes,
      savesRes,
      deviceRes,
      sourceRes,
      dailyRes,
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
      // page_likes count
      supabase.from("page_likes").select("id", { count: "exact", head: true }),
      // page_saves count
      supabase.from("page_saves").select("id", { count: "exact", head: true }),
      // device breakdown
      supabase.from("page_views").select("device_type").gte("created_at", thirtyDaysAgo),
      // source breakdown
      supabase.from("page_views").select("source").gte("created_at", thirtyDaysAgo),
      // daily views
      supabase.from("page_views").select("created_at").gte("created_at", thirtyDaysAgo),
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

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    for (const row of (deviceRes.data || [])) {
      const d = (row as any).device_type || "unknown";
      deviceMap[d] = (deviceMap[d] || 0) + 1;
    }
    // Source breakdown
    const sourceMap: Record<string, number> = {};
    for (const row of (sourceRes.data || [])) {
      const s = (row as any).source || "web";
      sourceMap[s] = (sourceMap[s] || 0) + 1;
    }
    // Daily views
    const dayMap: Record<string, number> = {};
    for (const row of (dailyRes.data || [])) {
      const day = (row as any).created_at?.slice(0, 10);
      if (day) dayMap[day] = (dayMap[day] || 0) + 1;
    }
    const dailyViews = Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, views]) => ({ date, views }));

    return NextResponse.json({
      period: "last_30_days",
      pageViews: pageViewsCountRes.count || 0,
      likes: likesRes.count || 0,
      saves: savesRes.count || 0,
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
      deviceBreakdown: deviceMap,
      sourceBreakdown: sourceMap,
      dailyViews,
    }, {
      headers: { "Cache-Control": "private, s-maxage=60" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
