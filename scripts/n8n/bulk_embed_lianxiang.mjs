// 嗨嗨聯想 首次全量 embedding
// 從 Notion DB01-09 抓所有 page → 算 Voyage embedding → upsert Supabase
// 用法：NOTION_API_KEY=xxx VOYAGE_API_KEY=xxx SUPABASE_URL=https://zgwdomvauuxaxtgqqvrn.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/n8n/bulk_embed_lianxiang.mjs
import crypto from 'node:crypto';

const NOTION = process.env.NOTION_API_KEY || process.env.NOTION_INTEGRATION_TOKEN;
const VOYAGE = process.env.VOYAGE_API_KEY;
const SB_URL = process.env.SUPABASE_URL || 'https://zgwdomvauuxaxtgqqvrn.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!NOTION || !VOYAGE || !SB_KEY) {
  console.error('缺 env：NOTION_API_KEY / VOYAGE_API_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DBS = [
  ['db01', '722f2478-7e61-4b4b-ad1c-d171b4a639db'],
  ['db02', 'c286e19b-9cf8-422b-8628-98b6d116040c'],
  ['db03', '968b23ea-da1f-4381-bd9a-253ee80b0656'],
  ['db04', '5ad63416-a7c5-4d84-812e-cddf56c8bc01'],
  ['db05', '28a667a9-ede1-466a-9f18-419da33a8810'],
  ['db06', 'a809ff25-fdab-8236-b491-87496d236ac9'],
  ['db07', '0f5a87d4-d1df-4271-ba00-2abfee01693d'],
  ['db08', '6934a808-b79b-4446-98dd-f699476408a0'],
  ['db09', '6547375e-ff14-4f24-ab0f-9f2a223a8580'],
];

const NH = {
  'Authorization': 'Bearer ' + NOTION,
  'Notion-Version': '2025-09-03',
  'Content-Type': 'application/json',
};

const richText = (arr) => (arr || []).map(t => t.plain_text || '').join('').trim();

function extractSummary(page) {
  const p = page.properties || {};
  let title = '';
  for (const k of Object.keys(p)) {
    if (p[k].type === 'title') { title = richText(p[k].title); break; }
  }
  const subject = p['主題名稱']?.type === 'rich_text' ? richText(p['主題名稱'].rich_text) : '';
  const intro = p['簡介摘要']?.type === 'rich_text' ? richText(p['簡介摘要'].rich_text) : '';
  const parts = [title, subject, intro].filter(s => s && s.length);
  return { title: title || subject || '(無標題)', summary: parts.join(' | ').slice(0, 2000) };
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function notionAll(dsId) {
  const out = [];
  let cursor = undefined;
  let pageSize = 50;
  while (true) {
    const body = { page_size: pageSize };
    if (cursor) body.start_cursor = cursor;
    let r, attempt = 0, ok = false;
    while (attempt < 5) {
      r = await fetch(`https://api.notion.com/v1/data_sources/${dsId}/query`, { method: 'POST', headers: NH, body: JSON.stringify(body) });
      if (r.ok) { ok = true; break; }
      const status = r.status;
      if ([502, 503, 504, 429].includes(status)) {
        attempt++;
        // 503 縮 page_size、其他維持
        if (status === 503 && pageSize > 5) pageSize = Math.max(5, Math.floor(pageSize / 2));
        const wait = Math.min(30000, 2000 * Math.pow(2, attempt));
        process.stdout.write(`(${status} retry ${attempt} wait ${wait}ms ps=${pageSize})`);
        await sleep(wait);
        body.page_size = pageSize;
        continue;
      }
      break;
    }
    if (!ok) throw new Error(`Notion ${dsId} ${r.status}: ${await r.text()}`);
    const j = await r.json();
    out.push(...j.results);
    if (!j.has_more) break;
    cursor = j.next_cursor;
    process.stdout.write('.');
  }
  return out;
}

async function loadExistingHashes() {
  const out = new Map();
  let from = 0;
  const STEP = 1000;
  while (true) {
    const r = await fetch(`${SB_URL}/rest/v1/lianxiang_embeddings?select=notion_page_id,content_hash`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Range: `${from}-${from + STEP - 1}` },
    });
    if (!r.ok) throw new Error(`Supabase load ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    for (const row of rows) out.set(row.notion_page_id, row.content_hash);
    if (rows.length < STEP) break;
    from += STEP;
  }
  return out;
}

async function embedBatch(inputs) {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + VOYAGE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: inputs, model: 'voyage-3-lite', input_type: 'document' }),
  });
  if (!r.ok) throw new Error(`Voyage ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data.map(d => d.embedding);
}

async function upsertBatch(rows) {
  const r = await fetch(`${SB_URL}/rest/v1/lianxiang_embeddings?on_conflict=notion_page_id`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase upsert ${r.status}: ${await r.text()}`);
}

(async () => {
  console.log('讀 Supabase 既有 hash...');
  const existing = await loadExistingHashes();
  console.log(`  既有 ${existing.size} 筆`);

  let total = 0, skipped = 0, upserted = 0, voyageCalls = 0;

  for (const [dbKey, dsId] of DBS) {
    process.stdout.write(`\n${dbKey} 抓 Notion`);
    const pages = await notionAll(dsId);
    console.log(` → ${pages.length} 筆`);

    const queue = [];
    for (const pg of pages) {
      const { title, summary } = extractSummary(pg);
      if (!summary || summary.length < 2) continue;
      const hash = md5(summary);
      const pid = pg.id;
      if (existing.get(pid) === hash) { skipped++; continue; }
      queue.push({ pid, dbKey, title, summary, hash });
    }
    total += pages.length;

    // batch 128
    const BATCH = 128;
    for (let i = 0; i < queue.length; i += BATCH) {
      const slice = queue.slice(i, i + BATCH);
      const vectors = await embedBatch(slice.map(s => s.summary));
      voyageCalls++;
      const rows = slice.map((s, j) => ({
        notion_page_id: s.pid,
        db_key: s.dbKey,
        title: s.title,
        summary: s.summary,
        content_hash: s.hash,
        embedding: vectors[j],
        updated_at: new Date().toISOString(),
      }));
      // upsert 拆 50 一批避免 payload 太大
      for (let k = 0; k < rows.length; k += 50) {
        await upsertBatch(rows.slice(k, k + 50));
      }
      upserted += rows.length;
      process.stdout.write(`  ${dbKey}: 已處理 ${Math.min(i + BATCH, queue.length)}/${queue.length}\r`);
    }
    console.log(`  ${dbKey}: 入庫 ${queue.length} 筆`);
  }

  console.log(`\n========================================`);
  console.log(`掃描 ${total} 筆 / 略過 ${skipped} 筆（內容未變）/ 入庫 ${upserted} 筆 / Voyage 呼叫 ${voyageCalls} 次`);
})();
