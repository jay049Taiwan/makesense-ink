/**
 * 找出 Supabase 還是 published 但 Notion 上對應頁面已被刪除/封存的文章
 *
 * 策略：
 * 1. 從 Supabase 撈出所有 published articles（依 web_tag 篩選範圍）
 * 2. 對每個 notion_id 打 notion.pages.retrieve
 *    - 200 + archived=false → 還在
 *    - 200 + archived=true → 已封存 → 視為孤兒
 *    - 404 → 已刪除 → 視為孤兒
 * 3. 列出孤兒清單
 *
 * 用法：
 *   node scripts/find-orphan-articles.mjs              # dry-run，列清單
 *   node scripts/find-orphan-articles.mjs --apply      # 把孤兒 status 改為 draft
 *   node scripts/find-orphan-articles.mjs --tag=地方通訊 [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import { Client } from "@notionhq/client";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim();
}
const notion = new Client({ auth: env.NOTION_API_KEY, timeoutMs: 30_000 });
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const apply = process.argv.includes("--apply");
const tagArg = process.argv.find(a => a.startsWith("--tag="));
const filterTag = tagArg ? tagArg.slice(6) : null;

console.log(`🔍 Mode: ${apply ? "APPLY (將孤兒改為 draft)" : "DRY-RUN (只列清單，不改資料)"}`);
if (filterTag) console.log(`📌 篩選 tag: ${filterTag}`);

// 1. 從 Supabase 撈 published articles
let query = supabase.from("articles").select("notion_id, title, web_tag").eq("status", "published");
if (filterTag) query = query.contains("web_tag", [filterTag]);
const { data: rows, error } = await query.order("published_at", { ascending: false });
if (error) { console.error("❌ Supabase query failed:", error.message); process.exit(1); }
console.log(`\n📚 Supabase published articles: ${rows.length} 筆${filterTag ? `（tag=${filterTag}）` : ""}`);

// 2. 逐個 probe Notion
const orphans = [];
const alive = [];
let i = 0;
for (const r of rows) {
  i++;
  if (i % 20 === 0) process.stdout.write(`  進度 ${i}/${rows.length}\n`);
  try {
    const page = await notion.pages.retrieve({ page_id: r.notion_id });
    if (page.archived) orphans.push({ ...r, reason: "archived" });
    else alive.push(r);
  } catch (e) {
    const code = e?.code || e?.status;
    if (code === "object_not_found" || code === 404) {
      orphans.push({ ...r, reason: "not_found" });
    } else {
      console.warn(`  ⚠️ ${r.notion_id}: ${e.message}（暫不視為孤兒，可能網路錯誤）`);
    }
  }
  await new Promise(r => setTimeout(r, 100)); // rate limit gentle
}

console.log(`\n📊 Result:`);
console.log(`  ✅ 還活著: ${alive.length}`);
console.log(`  💀 孤兒: ${orphans.length}`);
if (orphans.length > 0) {
  console.log(`\n💀 孤兒清單：`);
  for (const o of orphans) {
    console.log(`  - [${o.reason}] ${o.notion_id} ${(o.title || "").slice(0, 50)}`);
  }
}

// 3. apply
if (apply && orphans.length > 0) {
  const orphanIds = orphans.map(o => o.notion_id);
  const { error: upErr, count } = await supabase
    .from("articles")
    .update({ status: "draft" })
    .in("notion_id", orphanIds)
    .select("id", { count: "exact", head: true });
  if (upErr) console.error("❌ update failed:", upErr.message);
  else console.log(`\n✨ 已將 ${count} 筆孤兒改為 draft`);
} else if (orphans.length > 0) {
  console.log(`\n💡 確認清單後重跑加 --apply 才會實際改動。`);
}
