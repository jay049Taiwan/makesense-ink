import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, extractTitle, extractText, extractSelect, extractNumber, DB } from "@/lib/notion";

export const revalidate = 60; // 快取 60 秒

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ keywords: [], products: [], activities: [], articles: [] });
  }

  const today = new Date().toISOString().split("T")[0];

  // 平行查詢 4 個 DB
  const [keywordResults, productResults, activityResults, articleResults] = await Promise.all([
    // DB08: 關鍵字（主題標籤）
    queryDatabase(
      DB.DB08_RELATIONSHIP,
      {
        and: [
          { property: "經營名稱", title: { contains: q } },
          { property: "標籤選項", select: { equals: "主題標籤" } },
        ],
      },
      [{ property: "更新時間", direction: "descending" as const }],
      5
    ).catch(() => []),

    // DB07: 商品
    queryDatabase(
      DB.DB07_INVENTORY,
      {
        and: [
          { property: "庫存名稱", title: { contains: q } },
          { property: "庫存售價", number: { greater_than: 0 } },
        ],
      },
      [{ property: "更新時間", direction: "descending" as const }],
      5
    ).catch(() => []),

    // DB04: 活動（未來的）
    queryDatabase(
      DB.DB04_COLLABORATION,
      {
        and: [
          { property: "協作名稱", title: { contains: q } },
          { property: "執行時間", date: { on_or_after: today } },
        ],
      },
      [{ property: "執行時間", direction: "ascending" as const }],
      5
    ).catch(() => []),

    // DB05: 文章（圖文影音）
    queryDatabase(
      DB.DB05_REGISTRATION,
      {
        and: [
          { property: "明細名稱", title: { contains: q } },
          { property: "明細類型", select: { equals: "圖文影音" } },
        ],
      },
      [{ property: "建立時間", direction: "descending" as const }],
      5
    ).catch(() => []),
  ]);

  const keywords = keywordResults.map((page: any) => ({
    name: extractTitle(page.properties["經營名稱"]?.title),
    slug: page.id.replace(/-/g, ""),
  }));

  const products = productResults.map((page: any) => {
    const props = page.properties;
    return {
      name: extractTitle(props["庫存名稱"]?.title),
      category: extractSelect(props["選書備項"]?.select) || extractSelect(props["庫存類型"]?.select) || "一般商品",
      slug: page.id.replace(/-/g, ""),
    };
  });

  const activities = activityResults.map((page: any) => {
    const props = page.properties;
    const dateStr = props["執行時間"]?.date?.start || null;
    return {
      title: extractTitle(props["協作名稱"]?.title),
      date: dateStr,
      type: extractSelect(props["活動類型"]?.select) || "",
      slug: page.id.replace(/-/g, ""),
    };
  });

  const articles = articleResults.map((page: any) => {
    const props = page.properties;
    return {
      title: extractTitle(props["明細名稱"]?.title),
      type: extractSelect(props["明細類型"]?.select) || "一般文章",
      date: page.created_time?.substring(0, 10) || null,
      slug: page.id.replace(/-/g, ""),
    };
  });

  return NextResponse.json({ keywords, products, activities, articles });
}
