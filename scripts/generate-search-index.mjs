/**
 * 產生搜尋索引 JSON — build 時執行
 * 只抓文章、活動、產品、觀點的名稱，寫到 public/search-index.json
 * 搜尋列直接讀這個靜態檔，零延遲
 */
import { Client } from "@notionhq/client";
import { writeFileSync } from "fs";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// DB IDs（跟 .env.local 一致）
const DB07 = process.env.NOTION_DB07_INVENTORY;
const DB04 = process.env.NOTION_DB04_COLLABORATION;
const DB05 = process.env.NOTION_DB05_REGISTRATION;
const DB08 = process.env.NOTION_DB08_RELATIONSHIP;

function extractTitle(titleProp) {
  if (!titleProp || !Array.isArray(titleProp)) return "";
  return titleProp.map(t => t.plain_text).join("");
}
function extractSelect(selectProp) {
  return selectProp?.name || "";
}

async function query(dbId, filter, sorts, limit = 100) {
  try {
    const res = await notion.dataSources.query({
      data_source_id: dbId,
      filter,
      sorts,
      page_size: limit,
    });
    return res.results;
  } catch (e) {
    console.error(`Query ${dbId} failed:`, e.message);
    return [];
  }
}

async function main() {
  console.log("Generating search index...");

  const [products, activities, articles, keywords] = await Promise.all([
    // 商品：有售價的
    query(DB07, { property: "庫存售價", number: { greater_than: 0 } }, [{ property: "更新時間", direction: "descending" }]),
    // 活動：有活動類型的
    query(DB04, { property: "活動類型", select: { is_not_empty: true } }, [{ property: "執行時間", direction: "descending" }]),
    // 文章：文案細項 = 官網內容
    query(DB05, { property: "文案細項", select: { equals: "官網內容" } }, [{ property: "建立時間", direction: "descending" }]),
    // 觀點與標籤：經營類型 IN (觀點, 標籤)（DB08，2026/04/22 新 select 選項，取代舊「主題標籤」）
    query(DB08, {
      or: [
        { property: "經營類型", select: { equals: "觀點" } },
        { property: "經營類型", select: { equals: "標籤" } },
      ],
    }, [{ property: "更新時間", direction: "descending" }]),
  ]);

  const index = {
    p: products.map(r => ({ n: extractTitle(r.properties["庫存名稱"]?.title), c: extractSelect(r.properties["選書細項"]?.select) || extractSelect(r.properties["庫存類型"]?.select) || "商品", s: r.id.replace(/-/g, "") })),
    a: activities.map(r => ({ n: extractTitle(r.properties["交接名稱"]?.title), d: r.properties["執行時間"]?.date?.start || null, t: extractSelect(r.properties["活動類型"]?.select), s: r.id.replace(/-/g, "") })),
    r: articles.map(r => ({ n: extractTitle(r.properties["表單名稱"]?.title), t: extractSelect(r.properties["表單類型"]?.select) || "文章", d: r.created_time?.substring(0, 10) || null, s: r.id.replace(/-/g, "") })),
    k: keywords.map(r => ({ n: extractTitle(r.properties["經營名稱"]?.title), s: r.id.replace(/-/g, "") })),
  };

  writeFileSync("public/search-index.json", JSON.stringify(index));
  console.log(`Done! ${index.p.length} products, ${index.a.length} activities, ${index.r.length} articles, ${index.k.length} keywords`);
}

main().catch(console.error);
