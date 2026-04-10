import { NextResponse } from "next/server";
import { queryDatabase, extractTitle, extractSelect, DB } from "@/lib/notion";

// ISR：每 5 分鐘重新產生靜態 JSON
export const revalidate = 300;

export async function GET() {
  const [productResults, activityResults, articleResults, keywordResults] = await Promise.all([
    queryDatabase(DB.DB07_INVENTORY, {
      property: "庫存售價", number: { greater_than: 0 },
    }, [{ property: "更新時間", direction: "descending" as const }], 100).catch(() => []),

    queryDatabase(DB.DB04_COLLABORATION, {
      property: "活動類型", select: { is_not_empty: true },
    }, [{ property: "執行時間", direction: "descending" as const }], 100).catch(() => []),

    queryDatabase(DB.DB05_REGISTRATION, {
      property: "明細類型", select: { equals: "圖文影音" },
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
        t: extractSelect(props["明細類型"]?.select) || "文章",
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
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
