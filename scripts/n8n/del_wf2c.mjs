const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
const j = await r.json();
const targets = j.data.filter(w =>
  /WF2c/i.test(w.name) || /商品專題素材篩選/.test(w.name)
);

if (!targets.length) { console.log('找不到「WF2c」或「商品專題素材篩選」WF'); process.exit(0); }

console.log('將刪除:');
for (const w of targets) console.log(`  - ${w.id}  [${w.active ? '啟用' : '停用'}]  ${w.name}`);
console.log('');

for (const w of targets) {
  if (w.active) {
    const dr = await fetch(`${N8N}/workflows/${w.id}/deactivate`, { method: 'POST', headers: H });
    console.log(`停用 ${w.id}: ${dr.status}`);
  }
  const r2 = await fetch(`${N8N}/workflows/${w.id}`, { method: 'DELETE', headers: H });
  console.log(`刪除 ${w.id}: ${r2.status} ${w.name}`);
}
