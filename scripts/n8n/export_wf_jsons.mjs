// 把嗨嗨家族 + 神經 + 警報 + sync 系列 n8n WF 匯出成 JSON 檔
// 用法：N8N_API_KEY=xxx node scripts/n8n/export_wf_jsons.mjs
// 輸出位置：/tmp/n8n-exports/<safe-name>__<id>.json
import { writeFileSync, mkdirSync } from 'node:fs';

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

const OUT_DIR = '/tmp/n8n-exports';
mkdirSync(OUT_DIR, { recursive: true });

// 篩選：active 且名稱符合下列任一 pattern
const PATTERNS = [
  /^嗨嗨/,                  // 嗨嗨 開頭（所有 baton）
  /神經/,                   // 神經 v1
  /警報/,                   // 警報 v1
  /^Notion DB\d+/i,         // sync 系列
  /Daily Notion/i,          // Daily sync
  /^DB0[1-9].*Baton/i,      // baton runner
];

const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
const j = await r.json();
const targets = (j.data || []).filter(w => w.active && PATTERNS.some(p => p.test(w.name)));

console.log(`找到 ${targets.length} 隻 active WF 符合篩選，開始匯出...\n`);

let ok = 0, fail = 0;
for (const w of targets) {
  const gr = await fetch(`${N8N}/workflows/${w.id}`, { headers: H });
  if (!gr.ok) { fail++; console.log(`  ✗ ${w.id} ${w.name}  GET ${gr.status}`); continue; }
  const full = await gr.json();
  const safe = w.name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 60);
  const path = `${OUT_DIR}/${safe}__${w.id}.json`;
  writeFileSync(path, JSON.stringify(full, null, 2));
  ok++;
  console.log(`  ✓ ${path}`);
}

console.log(`\n========================================`);
console.log(`匯出成功 ${ok} 隻 / 失敗 ${fail} 隻`);
console.log(`位置：${OUT_DIR}/`);
console.log(`\n在 Finder 開啟資料夾：open ${OUT_DIR}`);
