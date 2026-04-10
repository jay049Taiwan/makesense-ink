import { queryDatabase, extractTitle, extractText, extractSelect, extractNumber, extractUrl, extractDate, extractRelation, DB } from "./notion";
import { resolveRelationNames } from "./fetch-all";

// ── DB07: 商品（主題選書 + 風格選物）──
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string; // 選書備項 or 選物備項
  photo: string | null;
  author: string;
  publisher: string;
  slug: string;
}

export async function fetchProducts(category: string, limit = 12): Promise<Product[]> {
  // 書籍刊物 → 選書備項；商品 → 庫存類型
  const isBook = category === "書籍刊物" || category === "書籍";
  const filterProp = isBook ? "選書備項" : "庫存類型";
  const filterValue = isBook ? "書籍刊物" : "商品";

  const results = await queryDatabase(
    DB.DB07_INVENTORY,
    {
      and: [
        { property: "庫存售價", number: { greater_than: 0 } },
        { property: filterProp, select: { equals: filterValue } },
      ],
    },
    [{ property: "更新時間", direction: "descending" as const }],
    limit
  );

  return results.map((page: any) => {
    const props = page.properties;
    const photoFile = props["產品照片"]?.files?.[0];
    const photoUrl = photoFile?.file?.url || photoFile?.external?.url || null;

    return {
      id: page.id,
      name: extractTitle(props["庫存名稱"]?.title),
      price: extractNumber(props["庫存售價"]?.number) || 0,
      category: extractSelect(props["選書備項"]?.select) || extractSelect(props["庫存類型"]?.select) || "",
      photo: photoUrl,
      author: extractText(props["登記作者"]?.rich_text),
      publisher: extractText(props["登記發行"]?.rich_text),
      slug: page.id.replace(/-/g, ""),
    };
  });
}

// ── DB04: 最新活動 ──
export interface Activity {
  id: string;
  title: string;
  date: string | null;
  endDate: string | null;
  type: string;
  slug: string;
}

export async function fetchActivities(limit = 5): Promise<Activity[]> {
  const today = new Date().toISOString().split("T")[0];

  const results = await queryDatabase(
    DB.DB04_COLLABORATION,
    {
      and: [
        { property: "執行時間", date: { on_or_after: today } },
      ],
    },
    [{ property: "執行時間", direction: "ascending" as const }],
    limit
  );

  return results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      title: extractTitle(props["協作名稱"]?.title),
      date: props["執行時間"]?.date?.start || null,
      endDate: props["執行時間"]?.date?.end || null,
      type: extractSelect(props["活動類型"]?.select) || "",
      slug: page.id.replace(/-/g, ""),
    };
  });
}

// ── DB08: 關鍵字（觀點）──
export interface Keyword {
  id: string;
  name: string;
  type: string;
  slug: string;
}

export async function fetchKeywords(limit = 12): Promise<Keyword[]> {
  const results = await queryDatabase(
    DB.DB08_RELATIONSHIP,
    {
      property: "標籤選項",
      select: { equals: "主題標籤" },
    },
    [{ property: "更新時間", direction: "descending" as const }],
    limit
  );

  return results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      name: extractTitle(props["經營名稱"]?.title),
      type: extractSelect(props["標籤選項"]?.select) || "",
      slug: page.id.replace(/-/g, ""),
    };
  });
}
