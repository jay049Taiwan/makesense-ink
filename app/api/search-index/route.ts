import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cleanTitle } from "@/lib/clean-title";
import { scoreItem, rankByScore } from "@/lib/search-rank";

export const dynamic = "force-dynamic";

/**
 * GET /api/search-index?q=關鍵字
 * 從 Supabase 全文搜尋（products, events, articles, topics）
 * 搜尋範圍：title + description/summary，相關性排序（標題符合 > 內文符合）
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], events: [], articles: [], topics: [] });
  }

  const like = `%${q}%`;

  const [products, events, articles, topics] = await Promise.all([
    supabase.from("products")
      .select("notion_id, name, price, images, category, description, updated_at")
      .eq("status", "active")
      .eq("page_status", "有頁面")
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(40),
    supabase.from("events")
      .select("notion_id, title, event_date, event_type, description")
      .eq("status", "active")
      .or(`title.ilike.${like},description.ilike.${like}`)
      .limit(40),
    supabase.from("articles")
      .select("notion_id, title, summary, published_at")
      .eq("status", "published")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .limit(40),
    supabase.from("topics")
      .select("notion_id, name, summary, tag_type")
      .eq("status", "active")
      .or(`name.ilike.${like},summary.ilike.${like}`)
      .limit(40),
  ]);

  // Log search query
  try {
    await supabase.from("search_logs").insert({ keyword: q, result_count:
      (products.data?.length || 0) + (events.data?.length || 0) +
      (articles.data?.length || 0) + (topics.data?.length || 0),
    });
  } catch {}

  const data = {
    products: rankByScore(
      (products.data || []).map((p: any) => {
        let photo: string | null = null;
        try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
        return {
          name: cleanTitle(p.name), price: p.price, photo, slug: p.notion_id, category: p.category,
          _score: scoreItem(q, p.name, p.description),
          _date: p.updated_at,
        };
      })
    ).slice(0, 8).map(({ _score, _date, ...rest }) => rest),
    events: rankByScore(
      (events.data || []).map((e: any) => ({
        name: cleanTitle(e.title), date: e.event_date, type: e.event_type, slug: e.notion_id,
        _score: scoreItem(q, e.title, e.description),
        _date: e.event_date,
      }))
    ).slice(0, 8).map(({ _score, _date, ...rest }) => rest),
    articles: rankByScore(
      (articles.data || []).map((a: any) => ({
        name: cleanTitle(a.title), date: a.published_at, slug: a.notion_id,
        _score: scoreItem(q, a.title, a.summary),
        _date: a.published_at,
      }))
    ).slice(0, 8).map(({ _score, _date, ...rest }) => rest),
    topics: rankByScore(
      (topics.data || []).map((t: any) => ({
        name: cleanTitle(t.name), type: t.tag_type, slug: t.notion_id,
        _score: scoreItem(q, t.name, t.summary),
        _date: null,
      }))
    ).slice(0, 8).map(({ _score, _date, ...rest }) => rest),
  };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
