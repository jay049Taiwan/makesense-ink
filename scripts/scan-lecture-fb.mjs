/**
 * 講座課程 FB 覆蓋掃描（Method B）
 *
 * 目的：掃 DB04「活動選項=講座課程」的每一場，對照 DB05 的 FB 貼文
 * （素材類別=文案 + 社群細項=Facebook，經 對應協作 relation 連到 DB04），
 * 算出哪幾場已有 FB 貼文、哪幾場是缺口（0 篇）。
 *
 * 必須在「能直連 api.notion.com」的環境執行（本機，或網路政策放行 Notion 的雲端環境）。
 * 雲端 web session 預設無對外網路，跑不動。
 *
 * 用法：
 *   1) 掃描（產出覆蓋報告）：
 *        node scripts/scan-lecture-fb.mjs
 *        node scripts/scan-lecture-fb.mjs scan --out lecture-fb-report.json
 *
 *   2) 補連單篇 FB 貼文到一或多場活動（保留既有連結，支援雙連）：
 *        node scripts/scan-lecture-fb.mjs patch <postId> <eventId> [eventId2 ...]
 *
 * Token：從 .env.local 的 NOTION_API_KEY 讀取（或 export NOTION_API_KEY=...）。
 *        ⚠️ 不要把 token 寫進這支檔案。
 */
import { Client } from "@notionhq/client";
import { readFileSync, writeFileSync } from "fs";

// ── 載入 .env.local（不覆蓋已存在的環境變數）──
try {
  const envFile = readFileSync(".env.local", "utf-8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      if (process.env[k] === undefined) process.env[k] = m[2].trim();
    }
  }
} catch { /* .env.local 不存在就靠 process.env */ }

const TOKEN = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error("❌ 缺少 NOTION_API_KEY，請放進 .env.local 或先 export NOTION_API_KEY=...");
  process.exit(1);
}

const notion = new Client({ auth: TOKEN, timeoutMs: 120_000 });

// Data source（collection）IDs — 結構性 ID，非機密；可用環境變數覆蓋
const DS_DB04 = process.env.NOTION_DS_DB04 || "5ad63416-a7c5-4d84-812e-cddf56c8bc01"; // DB04 協作交接
const DS_DB05 = process.env.NOTION_DS_DB05 || "28a667a9-ede1-466a-9f18-419da33a8810"; // DB05 登記內容

// ── 取值小工具 ──
const titleText = (p) => (p?.title || []).map((x) => x.plain_text).join("");
const richText = (p) => (p?.rich_text || []).map((x) => x.plain_text).join("");
const selectName = (p) => p?.select?.name ?? null;
const relationIds = (p) => (p?.relation || []).map((x) => x.id);
const noDash = (id) => id.replace(/-/g, "");

// ── 分頁查詢 + 502/504/429/timeout 重試 ──
async function queryAll(dataSourceId, filter, label) {
  const out = [];
  let cursor;
  let pageNum = 0;
  do {
    let res;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        res = await notion.dataSources.query({
          data_source_id: dataSourceId,
          ...(filter ? { filter } : {}),
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });
        break;
      } catch (err) {
        const st = err?.status || err?.code;
        const retryable =
          st === 502 || st === 504 || st === 429 ||
          err?.code === "notionhq_client_request_timeout";
        if (retryable && attempt < 4) {
          const wait = Math.min((attempt + 1) * 4000, 16000);
          console.error(`  ⏳ ${label} page ${pageNum + 1} retry ${attempt + 1}/5 after ${wait / 1000}s (${st})`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw err;
      }
    }
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
    pageNum++;
    console.error(`  …${label} 已抓 ${out.length} 筆`);
  } while (cursor);
  return out;
}

async function scan() {
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg > -1 ? process.argv[outArg + 1] : "lecture-fb-report.json";

  console.error("① 抓 DB04 講座課程活動…");
  const events = await queryAll(
    DS_DB04,
    { property: "活動選項", select: { equals: "講座課程" } },
    "DB04講座"
  );

  console.error("② 抓 DB05 Facebook 文案貼文…");
  const posts = await queryAll(
    DS_DB05,
    {
      and: [
        { property: "素材類別", select: { equals: "文案" } },
        { property: "社群細項", select: { equals: "Facebook" } },
      ],
    },
    "DB05_FB"
  );

  // eventId → 該活動連到的 FB 貼文
  const eventToPosts = new Map();
  for (const ev of events) eventToPosts.set(ev.id, []);

  // 同時記錄沒連到任何講座活動的 FB 貼文（phase 2 配對候選）
  const unlinkedPosts = [];

  for (const post of posts) {
    const linkedEventIds = relationIds(post.properties["對應協作"]);
    const postInfo = {
      id: post.id,
      url: post.url,
      title: richText(post.properties["主題名稱"]) || titleText(post.properties["內容名稱"]) || "(無標題)",
    };
    let hitLecture = false;
    for (const evId of linkedEventIds) {
      if (eventToPosts.has(evId)) {
        eventToPosts.get(evId).push(postInfo);
        hitLecture = true;
      }
    }
    if (!hitLecture) unlinkedPosts.push({ ...postInfo, linkedEventIds });
  }

  const detail = events.map((ev) => {
    const linked = eventToPosts.get(ev.id);
    return {
      id: ev.id,
      url: ev.url,
      協作名稱: titleText(ev.properties["協作名稱"]),
      主題名稱: richText(ev.properties["主題名稱"]),
      fb_count: linked.length,
      fb_posts: linked,
    };
  });

  const gaps = detail.filter((d) => d.fb_count === 0);
  const covered = detail.filter((d) => d.fb_count > 0);

  const report = {
    generated_at: new Date().toISOString(),
    totals: {
      lecture_events: events.length,
      fb_posts_scanned: posts.length,
      covered_events: covered.length,
      gap_events: gaps.length,
      fb_posts_unlinked_to_lectures: unlinkedPosts.length,
    },
    gaps,
    covered,
    unlinked_fb_posts: unlinkedPosts,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));

  // ── 終端摘要 ──
  console.log("\n══════════ 講座課程 FB 覆蓋報告 ══════════");
  console.log(`講座課程活動總數：${events.length}`);
  console.log(`已連 FB 貼文：${covered.length}`);
  console.log(`缺口（0 篇 FB）：${gaps.length}`);
  console.log(`掃到的 FB 貼文：${posts.length}（其中 ${unlinkedPosts.length} 篇未連到任何講座場）`);
  console.log(`完整報告：${outPath}`);
  console.log("\n── 缺口清單（前 60 筆）──");
  for (const g of gaps.slice(0, 60)) {
    const name = g.主題名稱 || g.協作名稱 || "(無標題)";
    console.log(`  • ${name}  ${g.url}`);
  }
  if (gaps.length > 60) console.log(`  …還有 ${gaps.length - 60} 筆，詳見 ${outPath}`);
}

async function patch() {
  const postId = process.argv[3];
  const eventIds = process.argv.slice(4);
  if (!postId || eventIds.length === 0) {
    console.error("用法：node scripts/scan-lecture-fb.mjs patch <postId> <eventId> [eventId2 ...]");
    process.exit(1);
  }
  const page = await notion.pages.retrieve({ page_id: postId });
  const existing = relationIds(page.properties["對應協作"]);
  const merged = Array.from(new Set([...existing, ...eventIds.map(noDash)].map(noDash)));
  await notion.pages.update({
    page_id: postId,
    properties: { "對應協作": { relation: merged.map((id) => ({ id })) } },
  });
  console.log(`✅ 貼文 ${postId} 對應協作：${existing.length} → ${merged.length} 場`);
  console.log(`   連到：${merged.join(", ")}`);
}

const cmd = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "scan";
const run = cmd === "patch" ? patch : scan;
run().catch((e) => {
  console.error("❌ 失敗：", e?.body || e?.message || e);
  process.exit(1);
});
