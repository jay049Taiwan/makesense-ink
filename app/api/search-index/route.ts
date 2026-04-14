import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/search-index?q=關鍵字
 * 從 Supabase 全文搜尋（products, events, articles, topics）
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], events: [], articles: [], topics: [] });
  }

  const like = `%${q}%`;

  const [products, events, articles, topics] = await Promise.all([
    supabase.from("products")
      .select("notion_id, name, price, images, category")
      .eq("status", "active")
      .or("category.eq.商品/選書,category.eq.商品/選物")
      .ilike("name", like)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("events")
      .select("notion_id, title, event_date, event_type")
      .eq("status", "active")
      .ilike("title", like)
      .order("event_date", { ascending: false })
      .limit(8),
    supabase.from("articles")
      .select("notion_id, title, published_at")
      .eq("status", "published")
      .ilike("title", like)
      .order("published_at", { ascending: false })
      .limit(8),
    supabase.from("topics")
      .select("notion_id, name, tag_type")
      .eq("status", "active")
      .ilike("name", like)
      .limit(8),
  ]);

  // Log search query
  try {
    await supabase.from("search_logs").insert({ query: q, results_count:
      (products.data?.length || 0) + (events.data?.length || 0) +
      (articles.data?.length || 0) + (topics.data?.length || 0),
    });
  } catch {}

  const data = {
    products: (products.data || []).map(p => {
      let photo: string | null = null;
      try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
      return { name: p.name, price: p.price, photo, slug: p.notion_id, category: p.category };
    }),
    events: (events.data || []).map(e => ({
      name: e.title, date: e.event_date, type: e.event_type, slug: e.notion_id,
    })),
    articles: (articles.data || []).map(a => ({
      name: a.title, date: a.published_at, slug: a.notion_id,
    })),
    topics: (topics.data || []).map(t => ({
      name: t.name, type: t.tag_type, slug: t.notion_id,
    })),
  };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
