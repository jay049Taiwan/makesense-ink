import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, extractTitle, extractSelect, DB } from "@/lib/notion";

// 伺服器端記憶體快取（同一個 Lambda 實例內共用）
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60_000; // 60 秒

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ keywords: [], products: [], activities: [], articles: [] });
  }

  // 檢查記憶體快取
  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", "X-Cache": "HIT" },
    });
  }

  const today = new Date().toISOString().split("T")[0];

  // 平行查詢 4 個 DB
  const [keywordResults, productResults, activityResults, articleResults] = await Promise.all([
    queryDatabase(DB.DB08_RELATIONSHIP, {
      and: [
        { property: "經營名稱", title: { contains: q } },
        { property: "標籤選項", select: { equals: "主題標籤" } },
      ],
    }, [{ property: "更新時間", direction: "descending" as const }], 5).catch(() => []),

    queryDatabase(DB.DB07_INVENTORY, {
      and: [
        { property: "庫存名稱", title: { contains: q } },
        { property: "庫存售價", number: { greater_than: 0 } },
      ],
    }, [{ property: "更新時間", direction: "descending" as const }], 5).catch(() => []),

    queryDatabase(DB.DB04_COLLABORATION, {
      and: [
        { property: "協作名稱", title: { contains: q } },
        { property: "執行時間", date: { on_or_after: today } },
      ],
    }, [{ property: "執行時間", direction: "ascending" as const }], 5).catch(() => []),

    queryDatabase(DB.DB05_REGISTRATION, {
      and: [
        { property: "明細名稱", title: { contains: q } },
        { property: "明細類型", select: { equals: "圖文影音" } },
      ],
    }, [{ property: "建立時間", direction: "descending" as const }], 5).catch(() => []),
  ]);

  const data = {
    keywords: keywordResults.map((p: any) => ({
      name: extractTitle(p.properties["經營名稱"]?.title),
      slug: p.id.replace(/-/g, ""),
    })),
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
  };

  // 寫入記憶體快取
  cache.set(cacheKey, { data, ts: Date.now() });
  // 清理過期快取（防止記憶體洩漏）
  if (cache.size > 100) {
    const now = Date.now();
    for (const [key, val] of cache) {
      if (now - val.ts > CACHE_TTL) cache.delete(key);
    }
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", "X-Cache": "MISS" },
  });
}
