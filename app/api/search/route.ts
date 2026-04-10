import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, extractTitle, extractSelect, DB } from "@/lib/notion";

// ═══════════════════════════════════════════════
// 預載快取：啟動時一次性從 Notion 拉取所有符合條件的資料
// 搜尋時只做本地字串比對，不再打 Notion API
// ═══════════════════════════════════════════════

interface CachedProduct { name: string; category: string; slug: string }
interface CachedActivity { title: string; date: string | null; type: string; slug: string }
interface CachedArticle { title: string; type: string; date: string | null; slug: string }
interface CachedKeyword { name: string; slug: string }

interface SearchCache {
  products: CachedProduct[];
  activities: CachedActivity[];
  articles: CachedArticle[];
  keywords: CachedKeyword[];
  loadedAt: number;
}

let searchCache: SearchCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘重新載入

async function loadCache(): Promise<SearchCache> {
  // 如果快取還有效，直接回傳
  if (searchCache && Date.now() - searchCache.loadedAt < CACHE_TTL) {
    return searchCache;
  }

  console.log("[search] Loading search cache from Notion...");
  const startTime = Date.now();

  // 平行載入所有資料（一次撈完，不是每次搜尋都撈）
  const [productResults, activityResults, articleResults, keywordResults] = await Promise.all([
    // DB07: 所有有售價的商品
    queryDatabase(DB.DB07_INVENTORY, {
      property: "庫存售價", number: { greater_than: 0 },
    }, [{ property: "更新時間", direction: "descending" as const }], 100).catch(() => []),

    // DB04: 所有活動（不限未來，讓搜尋能找到歷史活動）
    queryDatabase(DB.DB04_COLLABORATION, {
      property: "活動類型", select: { is_not_empty: true },
    }, [{ property: "執行時間", direction: "descending" as const }], 100).catch(() => []),

    // DB05: 所有文章（圖文影音）
    queryDatabase(DB.DB05_REGISTRATION, {
      property: "明細類型", select: { equals: "圖文影音" },
    }, [{ property: "建立時間", direction: "descending" as const }], 100).catch(() => []),

    // DB08: 所有觀點（主題標籤）
    queryDatabase(DB.DB08_RELATIONSHIP, {
      property: "標籤選項", select: { equals: "主題標籤" },
    }, [{ property: "更新時間", direction: "descending" as const }], 100).catch(() => []),
  ]);

  searchCache = {
    products: productResults.map((p: any) => ({
      name: extractTitle(p.properties["庫存名稱"]?.title),
      category: extractSelect(p.properties["選書備項"]?.select) || extractSelect(p.properties["庫存類型"]?.select) || "一般商品",
      slug: p.id.replace(/-/g, ""),
    })),
    activities: activityResults.map((p: any) => ({
      title: extractTitle(p.properties["協作名稱"]?.title),
      date: p.properties["執行時間"]?.date?.start || null,
      type: extractSelect(p.properties["活動類型"]?.select) || "",
      slug: p.id.replace(/-/g, ""),
    })),
    articles: articleResults.map((p: any) => ({
      title: extractTitle(p.properties["明細名稱"]?.title),
      type: extractSelect(p.properties["明細類型"]?.select) || "一般文章",
      date: p.created_time?.substring(0, 10) || null,
      slug: p.id.replace(/-/g, ""),
    })),
    keywords: keywordResults.map((p: any) => ({
      name: extractTitle(p.properties["經營名稱"]?.title),
      slug: p.id.replace(/-/g, ""),
    })),
    loadedAt: Date.now(),
  };

  console.log(`[search] Cache loaded: ${searchCache.products.length} products, ${searchCache.activities.length} activities, ${searchCache.articles.length} articles, ${searchCache.keywords.length} keywords (${Date.now() - startTime}ms)`);

  return searchCache;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ keywords: [], products: [], activities: [], articles: [] });
  }

  const cache = await loadCache();
  const query = q.toLowerCase();

  // 純本地字串比對 — 不打 Notion API，幾乎秒回
  const data = {
    products: cache.products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 5),
    activities: cache.activities.filter((a) => a.title.toLowerCase().includes(query)).slice(0, 5),
    articles: cache.articles.filter((a) => a.title.toLowerCase().includes(query)).slice(0, 5),
    keywords: cache.keywords.filter((k) => k.name.toLowerCase().includes(query)).slice(0, 5),
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
