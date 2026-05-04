/**
 * 一次性 backfill 腳本 — 只補 4 個新欄位（不碰圖片、其他欄位）
 *
 * - products.publisher_notion_id
 * - events.related_partner_ids / event_category / collab_type
 * - articles.related_partner_ids
 *
 * 用法：node scripts/backfill-partner-fields.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { Client } from "@notionhq/client";
import { readFileSync } from "fs";

// 載入 .env.local
const envFile = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const notion = new Client({ auth: env.NOTION_API_KEY, timeoutMs: 120_000 });
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DB = {
  DB04: env.NOTION_DB04_COLLABORATION,
  DB05: env.NOTION_DB05_REGISTRATION,
  DB07: env.NOTION_DB07_INVENTORY,
};

// ── 工具 ──
function nid(page) { return page.id.replace(/-/g, ""); }
function p(page) { return page.properties || {}; }
function extractRelation(rel) { return (rel || []).map(r => r.id); }
function extractSelect(sel) { return sel?.name || null; }

async function queryAllPages(dbId, filter) {
  const pages = [];
  let cursor;
  let pageNum = 0;
  for (;;) {
    let res;
    let success = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        res = await notion.dataSources.query({
          data_source_id: dbId,
          filter,
          ...(cursor ? { start_cursor: cursor } : {}),
          page_size: 25,
        });
        success = true;
        break;
      } catch (e) {
        const st = e?.status || e?.code;
        const wait = Math.min((attempt + 1) * 5000, 30000);
        console.warn(`  page ${pageNum + 1} retry ${attempt + 1}/6 after ${wait/1000}s (${st})`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    if (!success) throw new Error(`page ${pageNum + 1} failed after 6 retries`);
    pageNum++;
    pages.push(...res.results);
    process.stdout.write(`  📄 page ${pageNum}: +${res.results.length} (total ${pages.length})\n`);
    if (!res.has_more) break;
    cursor = res.next_cursor;
    await new Promise(r => setTimeout(r, 1000));
  }
  return pages;
}

// ── DB07 products → publisher_notion_id ──
async function backfillProducts() {
  console.log("\n[products] 查詢 DB07...");
  const pages = await queryAllPages(DB.DB07, { property: "庫存類型", select: { equals: "商品" } });
  console.log(`  ${pages.length} 筆商品`);

  let updated = 0, skipped = 0;
  for (const page of pages) {
    const props = p(page);
    const pubRel = extractRelation(props["對應發行"]?.relation);
    const pubNid = pubRel[0]?.replace(/-/g, "") || null;
    const productNid = nid(page);

    const { error, count } = await supabase
      .from("products")
      .update({ publisher_notion_id: pubNid })
      .eq("notion_id", productNid)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error(`  ✗ ${productNid}: ${error.message}`);
      continue;
    }
    if (count === 0) skipped++;
    else updated++;
  }
  console.log(`  ✅ updated ${updated}, skipped ${skipped}（Supabase 沒對應的）`);
}

// ── DB04 events → 邊抓邊寫，避開壞 cursor ──
async function processDB04Page(page, stats) {
  const props = p(page);
  if (extractSelect(props["協作選項"]?.select) !== "活動辦理") return;
  const guideRel = extractRelation(props["對應對象"]?.relation);
  const pubRel = extractRelation(props["對應辦理單位"]?.relation);
  const relatedPartnerIds = [...new Set([
    ...guideRel.map(id => id.replace(/-/g, "")),
    ...pubRel.map(id => id.replace(/-/g, "")),
  ])].filter(Boolean);
  const eventNid = nid(page);

  const { error, count } = await supabase
    .from("events")
    .update({
      related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
      event_category: extractSelect(props["交接類型"]?.select),
      collab_type: extractSelect(props["協作選項"]?.select),
    })
    .eq("notion_id", eventNid)
    .select("id", { count: "exact", head: true });

  if (error) { stats.errors++; return; }
  if (count === 0) stats.skipped++;
  else stats.updated++;
}

async function queryDB04Incremental(direction) {
  const stats = { updated: 0, skipped: 0, errors: 0, fetched: 0 };
  let cursor;
  let pageNum = 0;
  for (;;) {
    let res;
    let success = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        res = await notion.dataSources.query({
          data_source_id: DB.DB04,
          ...(cursor ? { start_cursor: cursor } : {}),
          page_size: 25,
          sorts: [{ timestamp: "created_time", direction }],
        });
        success = true;
        break;
      } catch (e) {
        const st = e?.status || e?.code;
        const wait = Math.min((attempt + 1) * 5000, 30000);
        console.warn(`  [${direction}] page ${pageNum + 1} retry ${attempt + 1}/6 after ${wait/1000}s (${st})`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    if (!success) {
      console.error(`  [${direction}] page ${pageNum + 1} failed → 中止此方向`);
      return stats;
    }
    pageNum++;
    stats.fetched += res.results.length;
    for (const pg of res.results) await processDB04Page(pg, stats);
    process.stdout.write(`  [${direction}] page ${pageNum}: +${res.results.length} (fetched ${stats.fetched}, updated ${stats.updated})\n`);
    if (!res.has_more) break;
    cursor = res.next_cursor;
    await new Promise(r => setTimeout(r, 1000));
  }
  return stats;
}

async function backfillEvents() {
  console.log("\n[events] 邊抓邊寫，先 ascending 再 descending...");
  const asc = await queryDB04Incremental("ascending");
  console.log(`  ✅ ascending: fetched ${asc.fetched}, updated ${asc.updated}, skipped ${asc.skipped}`);
  const desc = await queryDB04Incremental("descending");
  console.log(`  ✅ descending: fetched ${desc.fetched}, updated ${desc.updated}, skipped ${desc.skipped}`);
  console.log(`  總計 updated ${asc.updated + desc.updated}（兩方向會重複，重複的自動冪等）`);
}

// ── DB05 articles → related_partner_ids ──
async function backfillArticles() {
  console.log("\n[articles] 查詢 DB05...");
  const pages = await queryAllPages(DB.DB05, { property: "文案細項", select: { equals: "官網內容" } });
  console.log(`  ${pages.length} 筆文章`);

  let updated = 0, skipped = 0;
  for (const page of pages) {
    const props = p(page);
    const objRel = extractRelation(props["對應對象"]?.relation);
    const relatedPartnerIds = objRel.map(id => id.replace(/-/g, "")).filter(Boolean);
    const articleNid = nid(page);

    const { error, count } = await supabase
      .from("articles")
      .update({
        related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
      })
      .eq("notion_id", articleNid)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error(`  ✗ ${articleNid}: ${error.message}`);
      continue;
    }
    if (count === 0) skipped++;
    else updated++;
  }
  console.log(`  ✅ updated ${updated}, skipped ${skipped}`);
}

// ── 主流程 ──
const tables = (process.argv[2] || "products,events,articles").split(",");
console.log(`🔄 開始 backfill: ${tables.join(", ")}`);
const start = Date.now();

try {
  if (tables.includes("products")) await backfillProducts();
  if (tables.includes("events")) await backfillEvents();
  if (tables.includes("articles")) await backfillArticles();
  console.log(`\n✨ 完成，共耗時 ${((Date.now() - start) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error("\n❌ 失敗:", e.message);
  process.exit(1);
}
