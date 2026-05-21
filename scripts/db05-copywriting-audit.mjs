#!/usr/bin/env node
/**
 * DB05 文案稽核掃描器 (read-only)
 * ------------------------------------------------------------
 * 用途：掃 DB05「素材類別=文案」的全部頁面，統計三件事並產出「待重跑清單」：
 *   1. 分析備註 品質：空白 / 會議摘要垃圾格式 / 合格 3-token(啟發式判斷) / 其他
 *   2. 明細內容 是否塞了長文（與 page content 重複的風險訊號）
 *   3. 文案選項 / 社群細項 / 官網備項 組合分布（對照指南路由表，找打不到的類型）
 *
 * 只「讀」Notion，不寫入、不修改任何東西。
 *
 * 執行需求：
 *   - Node 18+（用內建 fetch，無需 npm install）
 *   - 在「連得到 api.notion.com 的環境」執行（本機 / 一般網路；
 *     Claude Code on the web 的網路允許清單會擋掉，需在本機跑）
 *
 * 怎麼跑：
 *   方法 A（環境變數）：
 *     NOTION_API_KEY=ntn_xxx node scripts/db05-copywriting-audit.mjs
 *   方法 B（.env.local）：
 *     在專案根目錄的 .env.local 放一行 NOTION_API_KEY=ntn_xxx，然後：
 *     node scripts/db05-copywriting-audit.mjs
 *
 * 產出：
 *   - 終端機印出統計表
 *   - 同目錄寫出 db05-audit-results.json（含每筆待處理頁面的 url + 類別）
 */

import fs from "node:fs";
import path from "node:path";

// ---- 設定 ----------------------------------------------------
const DB05 = "e5f14f056c7c4b8a804304eab598fd4d"; // DB05 登記內容 database id
const NOTION_VERSION = "2022-06-28";
const OUT = path.join(process.cwd(), "db05-audit-results.json");

// 會議摘要垃圾格式的指紋字串（命中任一即視為垃圾）
const GARBAGE_MARKERS = [
  "會議摘要", "討論目標", "重要結論", "後續行動",
  "提煉狀態", "注意事項：", "AI會議", "ai_meta",
];

// ---- 取得 token ----------------------------------------------
function loadKey() {
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY.trim();
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^NOTION_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error("✗ 找不到 NOTION_API_KEY。請用環境變數或 .env.local 提供。");
  process.exit(1);
}
const KEY = loadKey();

// ---- Notion 查詢（含分頁 + 重試）-----------------------------
async function queryPage(cursor) {
  const RETRY = [3000, 8000, 20000];
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`https://api.notion.com/v1/databases/${DB05}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "素材類別", select: { equals: "文案" } },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (r.ok) return r.json();
    const retryable = [429, 502, 503, 504].includes(r.status);
    if (retryable && attempt < RETRY.length) {
      await new Promise((res) => setTimeout(res, RETRY[attempt]));
      continue;
    }
    throw new Error(`Notion ${r.status}: ${await r.text()}`);
  }
}

// ---- 取值小工具 ----------------------------------------------
const rt = (p) =>
  p && p.type === "rich_text" ? (p.rich_text || []).map((t) => t.plain_text).join("") : "";
const sel = (p) =>
  !p ? null : p.type === "select" ? p.select?.name ?? null
    : p.type === "status" ? p.status?.name ?? null : null;
const titleOf = (props) => {
  for (const v of Object.values(props)) {
    if (v && v.type === "title") return (v.title || []).map((t) => t.plain_text).join("");
  }
  return "";
};

// ---- 主流程 --------------------------------------------------
const pages = [];
let cursor;
do {
  const j = await queryPage(cursor);
  pages.push(...j.results);
  process.stderr.write(`\r抓取中… ${pages.length} 筆`);
  cursor = j.has_more ? j.next_cursor : null;
} while (cursor);
process.stderr.write("\n");

const stat = { empty: 0, garbage: 0, proper: 0, other: 0 };
const detail = { empty: 0, short: 0, prose: 0 };
const comboCount = {};
const fanxuanCount = {};
const contentTypeCount = {};
let claimedDoneButBad = 0; // 分析備註 空/垃圾，但狀態宣稱已完成或已發佈

const worklist = { garbage_analysis: [], empty_analysis: [], duplicated_detail: [] };

for (const p of pages) {
  const pr = p.properties;
  const name = (rt(pr["主題名稱"]) || titleOf(pr) || "(無標題)").trim();
  const fx = sel(pr["文案選項"]);
  const gw = sel(pr["官網備項"]);
  const ref = { url: p.url, name, 文案選項: fx, 官網備項: gw };

  const an = rt(pr["分析備註"]).trim();
  let anClass;
  if (!an) { stat.empty++; anClass = "empty"; worklist.empty_analysis.push(ref); }
  else if (GARBAGE_MARKERS.some((g) => an.includes(g))) {
    stat.garbage++; anClass = "garbage"; worklist.garbage_analysis.push(ref);
  } else if (/DB0\d/.test(an) && an.includes("：")) { stat.proper++; anClass = "proper"; }
  else { stat.other++; anClass = "other"; }

  const detailText = rt(pr["明細內容"]).trim();
  if (!detailText) detail.empty++;
  else if (detailText.length > 150) { detail.prose++; worklist.duplicated_detail.push({ ...ref, 明細長度: detailText.length }); }
  else detail.short++;

  const combo = `${fx || "—"} | ${sel(pr["社群細項"]) || "—"} | ${gw || "—"}`;
  comboCount[combo] = (comboCount[combo] || 0) + 1;
  fanxuanCount[fx || "(空)"] = (fanxuanCount[fx || "(空)"] || 0) + 1;
  const ct = sel(pr["內容類型"]);
  contentTypeCount[ct || "(空)"] = (contentTypeCount[ct || "(空)"] || 0) + 1;

  const doneish = ["已完成"].includes(sel(pr["執行狀態"])) || ["已發佈"].includes(sel(pr["發佈狀態"]));
  if (doneish && (anClass === "empty" || anClass === "garbage")) claimedDoneButBad++;
}

// ---- 輸出 ----------------------------------------------------
const N = pages.length;
const pct = (x) => `${x} (${N ? ((x / N) * 100).toFixed(0) : 0}%)`;
const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

console.log(`\n================ DB05 素材類別=文案 全量稽核 ================`);
console.log(`總筆數: ${N}\n`);
console.log(`【分析備註 品質】`);
console.log(`  空白(從沒被分析)   : ${pct(stat.empty)}`);
console.log(`  會議摘要垃圾格式   : ${pct(stat.garbage)}`);
console.log(`  合格 3-token(啟發式): ${pct(stat.proper)}`);
console.log(`  其他非空(待人工判) : ${pct(stat.other)}`);
console.log(`\n【明細內容 與內文重複風險】`);
console.log(`  空白               : ${pct(detail.empty)}`);
console.log(`  短(<150字)         : ${pct(detail.short)}`);
console.log(`  長文(>150字,疑重複): ${pct(detail.prose)}`);
console.log(`\n【交叉檢查】狀態宣稱已完成/已發佈、但 分析備註 空或垃圾: ${claimedDoneButBad} 筆`);
console.log(`\n【文案選項 分布】`);
sorted(fanxuanCount).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
console.log(`\n【文案選項 | 社群細項 | 官網備項 組合 (前 30)】`);
sorted(comboCount).slice(0, 30).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
console.log(`\n【內容類型 分布】`);
sorted(contentTypeCount).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  total: N,
  summary: { 分析備註: stat, 明細內容: detail, claimedDoneButBad },
  fanxuanCount, comboCount, contentTypeCount,
  worklist,
}, null, 2));
console.log(`\n✓ 待處理清單已寫入: ${OUT}`);
console.log(`  - 分析備註垃圾: ${worklist.garbage_analysis.length} 筆`);
console.log(`  - 分析備註空白: ${worklist.empty_analysis.length} 筆`);
console.log(`  - 明細疑重複  : ${worklist.duplicated_detail.length} 筆`);
console.log(`============================================================`);
