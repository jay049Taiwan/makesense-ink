/**
 * 唯讀掃描：走讀 DB05/DB06 頁面「對應協作已填、對應地點為空」清單
 * 不寫任何資料。
 *
 * 用法：
 *   node scripts/scan-reading-tour-location.mjs schema   # 先 dump DB05/DB06 欄位
 *   node scripts/scan-reading-tour-location.mjs scan      # 跑篩選清單
 *
 * 需要環境變數 NOTION_API_KEY（或 .env.local）。
 */
import { Client } from "@notionhq/client";
import { readFileSync, existsSync } from "fs";

// ── 載入金鑰：優先 process.env，其次 .env.local ──
let NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY && existsSync(".env.local")) {
  const envFile = readFileSync(".env.local", "utf-8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^NOTION_API_KEY=(.*)$/);
    if (m) NOTION_API_KEY = m[1].trim();
  }
}
if (!NOTION_API_KEY) {
  console.error("❌ 找不到 NOTION_API_KEY（環境變數或 .env.local）");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY, timeoutMs: 120_000 });

// DB IDs（非機密，取自 .env.example）
const DB05 = "e5f14f056c7c4b8a804304eab598fd4d";
const DB06 = "3469ff25fdab83c98ff98107ee6a6a1c";

async function dumpSchema(id, label) {
  const ds = await notion.dataSources.retrieve({ data_source_id: id });
  console.log(`\n=== ${label} (${id}) ===`);
  console.log(`name: ${ds.title?.map(t => t.plain_text).join("") || "(無)"}`);
  const props = ds.properties || {};
  for (const [name, def] of Object.entries(props)) {
    let extra = "";
    if (def.type === "select" || def.type === "status") {
      extra = " → " + (def[def.type]?.options || []).map(o => o.name).join(" / ");
    }
    if (def.type === "relation") {
      extra = " → DS:" + (def.relation?.data_source_id || def.relation?.database_id || "?");
    }
    console.log(`  [${def.type}] ${name}${extra}`);
  }
}

const mode = process.argv[2] || "schema";

if (mode === "schema") {
  await dumpSchema(DB05, "DB05 登記內容");
  await dumpSchema(DB06, "DB06 清單明細");
}
