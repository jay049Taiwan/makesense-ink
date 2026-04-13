/**
 * 獨立同步腳本：Notion → Supabase（漸進式，每批即時寫入）
 * 用法：node scripts/run-sync.mjs [tables]
 * 例如：node scripts/run-sync.mjs events,articles
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DB = {
  DB04: env.NOTION_DB04_COLLABORATION,
  DB05: env.NOTION_DB05_REGISTRATION,
};

// ── 通用工具 ──
function nid(page) { return page.id.replace(/-/g, ""); }
function p(page) { return page.properties || {}; }
function extractTitle(t) { return (t || []).map(x => x.plain_text).join(""); }
function extractText(t) { return (t || []).map(x => x.plain_text).join(""); }
function extractSelect(s) { return s?.name ?? null; }
function extractDate(d) { return d ? { start: d.start, end: d.end } : { start: null, end: null }; }
function extractRelation(r) { return (r || []).map(x => x.id); }
function extractNumber(n) { return n ?? null; }
function extractStatus(s) { return s?.name ?? null; }
function fileUrl(prop) {
  const f = prop?.files || prop;
  if (!f || !Array.isArray(f) || f.length === 0) return null;
  return f[0]?.file?.url || f[0]?.external?.url || null;
}
function ms(val, map) { return val ? (map[val] || "draft") : "draft"; }

// ── Notion 漸進式查詢（每頁拿到就立刻回呼處理） ──
async function queryAndProcess(dbId, filter, processBatch) {
  let cursor = undefined;
  let totalFetched = 0;
  let pageNum = 0;

  do {
    let res;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        res = await notion.dataSources.query({
          data_source_id: dbId, filter, page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });
        break;
      } catch (err) {
        const st = err?.status || err?.code;
        const isRetryable = st === 502 || st === 504 || st === 429 ||
          err?.code === "notionhq_client_request_timeout";
        if (isRetryable && attempt < 4) {
          const wait = Math.min((attempt + 1) * 5000, 30000);
          console.log(`  ⏳ page ${pageNum + 1} retry ${attempt + 1}/5 after ${wait / 1000}s (${st})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        // 最後一次重試也失敗，回傳已處理的數量
        console.error(`  ❌ page ${pageNum + 1} failed after 5 retries, stopping with ${totalFetched} records`);
        return totalFetched;
      }
    }

    pageNum++;
    totalFetched += res.results.length;
    process.stdout.write(`  📄 page ${pageNum}: +${res.results.length} (total ${totalFetched})\n`);

    // 立即處理這一批
    await processBatch(res.results);

    cursor = res.has_more ? res.next_cursor : undefined;
    // 分頁間延遲 1 秒，給 Notion 喘息
    if (cursor) await new Promise(r => setTimeout(r, 1000));
  } while (cursor);

  return totalFetched;
}

// ── Supabase batch upsert ──
async function batchUpsert(table, rows, key) {
  if (rows.length === 0) return { upserted: 0, errors: 0 };
  const { error, count } = await supabase.from(table).upsert(rows, { onConflict: key, count: "exact" });
  if (error) {
    console.error(`  ❌ ${table} upsert err: ${error.message}`);
    return { upserted: 0, errors: rows.length };
  }
  return { upserted: count ?? rows.length, errors: 0 };
}

async function lookup(table, notionIds) {
  if (notionIds.length === 0) return {};
  const clean = [...new Set(notionIds.map(id => id.replace(/-/g, "")))];
  const m = {};
  for (let i = 0; i < clean.length; i += 300) {
    const chunk = clean.slice(i, i + 300);
    const { data } = await supabase.from(table).select("id, notion_id").in("notion_id", chunk);
    for (const r of data || []) m[r.notion_id] = r.id;
  }
  return m;
}

// ── 先載入 persons name 快取 ──
let personCache = {};
async function loadPersonCache() {
  console.log("  📋 載入 persons name cache...");
  const { data, count } = await supabase.from("persons").select("id, notion_id, name", { count: "exact" });
  for (const r of data || []) {
    personCache[r.notion_id] = { id: r.id, name: r.name };
  }
  console.log(`  📋 persons cache loaded: ${count || data?.length || 0} entries`);
}

// ── Events 同步（漸進式）──
async function syncEvents() {
  console.log("\n🔄 events (DB04 → events)");
  await loadPersonCache();

  let totalUpserted = 0, totalErrors = 0;

  const total = await queryAndProcess(DB.DB04, { property: "協作選項", select: { equals: "活動辦理" } },
    async (pages) => {
      const rows = pages.map(page => {
        const props = p(page);
        const dateInfo = extractDate(props["執行時間"]?.date);

        // 對應地點
        const locNid = extractRelation(props["對應地點"]?.relation)[0]?.replace(/-/g, "");
        const locationName = locNid && personCache[locNid] ? personCache[locNid].name : null;

        // 對應對象（帶路人）
        const guideNid = extractRelation(props["對應對象"]?.relation)[0]?.replace(/-/g, "");
        const guideName = guideNid && personCache[guideNid] ? personCache[guideNid].name : null;

        return {
          notion_id: nid(page),
          title: extractTitle(props["交接名稱"]?.title) || "未命名活動",
          theme: extractSelect(props["活動類型"]?.select) || null,
          event_type: extractSelect(props["活動類型"]?.select) || null,
          event_date: dateInfo.start || null,
          price: extractNumber(props["實際單價"]?.number) || extractNumber(props["預計單價"]?.number) || 0,
          capacity: extractNumber(props["數量上限"]?.number) || null,
          cover_url: fileUrl(props["上傳檔案"]) || null,
          description: extractText(props["簡介摘要"]?.rich_text) || null,
          location: locationName,
          guide: guideName,
          status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft", "不發佈": "inactive" }),
        };
      });

      const r = await batchUpsert("events", rows, "notion_id");
      totalUpserted += r.upserted;
      totalErrors += r.errors;
    }
  );

  return { upserted: totalUpserted, errors: totalErrors, fetched: total };
}

// ── Articles 同步（漸進式）──
async function syncArticles() {
  console.log("\n🔄 articles (DB05 → articles)");

  // 預載 events lookup
  console.log("  📋 載入 events lookup...");
  const { data: evData } = await supabase.from("events").select("id, notion_id");
  const eMap = {};
  for (const r of evData || []) eMap[r.notion_id] = r.id;
  console.log(`  📋 events lookup loaded: ${Object.keys(eMap).length} entries`);

  let totalUpserted = 0, totalErrors = 0;

  const total = await queryAndProcess(DB.DB05, { property: "表單類型", select: { equals: "圖文影音" } },
    async (pages) => {
      const rows = pages.map(page => {
        const props = p(page);
        const dateInfo = extractDate(props["執行時間"]?.date);
        const eNid = extractRelation(props["對應協作"]?.relation)[0]?.replace(/-/g, "");
        return {
          notion_id: nid(page),
          title: extractTitle(props["表單名稱"]?.title) || "未命名文章",
          cover_url: fileUrl(props["上傳檔案"]) || null,
          related_event_id: eNid ? (eMap[eNid] || null) : null,
          status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "published", "發佈更新": "published", "已完成": "published", "待發佈": "draft", "草稿": "draft" }),
          published_at: dateInfo.start || null,
        };
      });

      const r = await batchUpsert("articles", rows, "notion_id");
      totalUpserted += r.upserted;
      totalErrors += r.errors;
    }
  );

  return { upserted: totalUpserted, errors: totalErrors, fetched: total };
}

// ── Main ──
const tables = process.argv[2]?.split(",") || ["events", "articles"];
console.log(`📦 同步: ${tables.join(", ")}`);
const start = Date.now();
const results = {};

for (const t of tables) {
  const ts = Date.now();
  try {
    if (t === "events") results.events = await syncEvents();
    else if (t === "articles") results.articles = await syncArticles();
    else { console.log(`⚠️ 未知表: ${t}`); continue; }
    console.log(`  ✅ ${t}: ${JSON.stringify(results[t])} (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error(`  ❌ ${t} failed:`, err.message);
    results[t] = { error: err.message };
  }
}

console.log(`\n🎉 完成！耗時 ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log(JSON.stringify(results, null, 2));
