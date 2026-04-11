import { NextResponse } from "next/server";
import { queryDatabase, extractTitle, extractSelect, DB } from "@/lib/notion";

// 不在 build 時預渲染，運行時 CDN 快取 60 秒
export const dynamic = "force-dynamic";

export async function GET() {
  // dev 環境用 mock data
  if (process.env.NODE_ENV === "development") {
    const { MOCK_PRODUCTS, MOCK_ACTIVITIES } = await import("@/lib/mock-data");
    return NextResponse.json({
      products: MOCK_PRODUCTS.map(p => ({ n: p.name, c: p.category, s: p.id, p: p.photo })),
      activities: MOCK_ACTIVITIES.map(a => ({ n: a.title, d: a.date, t: a.type, s: a.id })),
      articles: [
        { n: "moku旅人書店四月營業時間公告", t: "文章", d: "2026/02/25", s: "art1" },
        { n: "宜蘭老街的前世今生", t: "文章", d: "2026/03/10", s: "art2" },
      ],
      keywords: [
        { n: "蘭東案內", s: "kw1" }, { n: "城鎮散步", s: "kw2" },
        { n: "文化走讀", s: "kw3" }, { n: "宜蘭故事", s: "kw4" },
      ],
    }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }

  const [productResults, activityResults, articleResults, keywordResults] = await Promise.all([
    queryDatabase(DB.DB07_INVENTORY, {
      property: "庫存售價", number: { greater_than: 0 },
    }, [{ property: "更新時間", direction: "descending" as const }], 100).catch(() => []),

    queryDatabase(DB.DB04_COLLABORATION, {
      property: "活動類型", select: { is_not_empty: true },
    }, [{ property: "執行時間", direction: "descending" as const }], 100).catch(() => []),

    queryDatabase(DB.DB05_REGISTRATION, {
      property: "表單類型", select: { equals: "圖文影音" },
    }, [{ property: "建立時間", direction: "descending" as const }], 100).catch(() => []),

    queryDatabase(DB.DB08_RELATIONSHIP, {
      property: "標籤選項", select: { equals: "主題標籤" },
    }, [{ property: "更新時間", direction: "descending" as const }], 100).catch(() => []),
  ]);

  const data = {
    products: productResults.map((p: any) => {
      const props = p.properties;
      const photoFile = props["產品照片"]?.files?.[0];
      const photo = photoFile?.file?.url || photoFile?.external?.url || null;
      return {
        n: extractTitle(props["庫存名稱"]?.title),
        c: extractSelect(props["選書備項"]?.select) || extractSelect(props["庫存類型"]?.select) || "商品",
        s: p.id.replace(/-/g, ""),
        p: photo,
      };
    }),
    activities: activityResults.map((p: any) => {
      const props = p.properties;
      return {
        n: extractTitle(props["協作名稱"]?.title),
        d: props["執行時間"]?.date?.start || null,
        t: extractSelect(props["活動類型"]?.select) || "",
        s: p.id.replace(/-/g, ""),
      };
    }),
    articles: articleResults.map((p: any) => {
      const props = p.properties;
      return {
        n: extractTitle(props["明細名稱"]?.title),
        t: extractSelect(props["表單類型"]?.select) || "文章",
        d: p.created_time?.substring(0, 10) || null,
        s: p.id.replace(/-/g, ""),
      };
    }),
    keywords: keywordResults.map((p: any) => ({
      n: extractTitle(p.properties["經營名稱"]?.title),
      s: p.id.replace(/-/g, ""),
    })),
  };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
