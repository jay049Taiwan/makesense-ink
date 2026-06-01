// 建立「嗨嗨警報 v1」+ 把所有現有 active WF 的 errorWorkflow 指向它
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_alert_v1.mjs
const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

const NAME = '嗨嗨警報 v1';
const TG_CHAT = '8523155253';

// === Step 1: 找/刪舊版同名 WF ===
async function findByName(name) {
  const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
  const j = await r.json();
  return (j.data || []).filter(w => w.name === name);
}

for (const w of await findByName(NAME)) {
  if (w.active) await fetch(`${N8N}/workflows/${w.id}/deactivate`, { method: 'POST', headers: H });
  await fetch(`${N8N}/workflows/${w.id}`, { method: 'DELETE', headers: H });
  console.log(`🗑  刪舊警報 WF: ${w.id}`);
}

// === Step 2: 建警報 WF ===
const codeNode = `
const item = $input.first().json || {};
const wf = item.workflow || {};
const ex = item.execution || {};
const err = ex.error || item.error || {};
const lastNode = err.node?.name || err.nodeName || '(unknown)';
let msg = err.message || err.description || '';
if (!msg) { try { msg = JSON.stringify(err).slice(0, 300); } catch(e) {} }
if (!msg) msg = '(no error message)';
const tw = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
const url = ex.url || (wf.id && ex.id ? \`https://makesense.zeabur.app/workflow/\${wf.id}/executions/\${ex.id}\` : 'https://makesense.zeabur.app/workflow');
const text = [
  '❌ n8n WF 失敗',
  'WF：' + (wf.name || wf.id || '?'),
  'Node：' + lastNode,
  'Error：' + msg.slice(0, 500),
  'Time：' + tw,
  url
].join('\\n');
return [{ json: { text } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    {
      id: 'a1', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1, position: [240, 300], parameters: {},
    },
    {
      id: 'a2', name: '組訊息', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [520, 300],
      parameters: { language: 'javaScript', jsCode: codeNode },
    },
    {
      id: 'a3', name: '送 Telegram', type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4, position: [800, 300],
      parameters: {
        method: 'POST',
        url: '=https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendMessage',
        sendBody: true,
        contentType: 'json',
        bodyParameters: {
          parameters: [
            { name: 'chat_id', value: TG_CHAT },
            { name: 'text', value: '={{$json.text}}' },
          ],
        },
        options: {},
      },
    },
  ],
  connections: {
    'Error Trigger': { main: [[{ node: '組訊息', type: 'main', index: 0 }]] },
    '組訊息':       { main: [[{ node: '送 Telegram', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei' },
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建警報失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
const ALERT_ID = created.id;
console.log(`✅ 建立警報 WF: ${ALERT_ID}  ${NAME}`);

const ar = await fetch(`${N8N}/workflows/${ALERT_ID}/activate`, { method: 'POST', headers: H });
console.log(`啟用警報 WF: ${ar.status}`);

// === Step 3: 把所有現有 WF 的 errorWorkflow 設成 ALERT_ID（警報自己跳過）===
console.log('\n掃描所有 WF 補 errorWorkflow...');
const lr = await fetch(N8N + '/workflows?limit=250', { headers: H });
const lj = await lr.json();
const all = lj.data || [];

const SETTINGS_KEYS = ['saveDataErrorExecution','saveDataSuccessExecution','saveManualExecutions','saveExecutionProgress','executionTimeout','timezone','errorWorkflow','callerPolicy','callerIds','executionOrder'];

let patched = 0, skipped = 0, failed = 0;
for (const w of all) {
  if (w.id === ALERT_ID) { skipped++; continue; }  // 警報自己跳過
  // 抓完整 WF
  const gr = await fetch(`${N8N}/workflows/${w.id}`, { headers: H });
  if (!gr.ok) { failed++; console.log(`  ✗ ${w.id} GET ${gr.status}`); continue; }
  const full = await gr.json();
  // 已經設過就跳過
  if (full.settings?.errorWorkflow === ALERT_ID) { skipped++; continue; }
  const newSettings = {};
  for (const k of SETTINGS_KEYS) if (full.settings?.[k] !== undefined) newSettings[k] = full.settings[k];
  newSettings.errorWorkflow = ALERT_ID;
  // PUT 只送 name + nodes + connections + settings
  const putBody = { name: full.name, nodes: full.nodes, connections: full.connections, settings: newSettings };
  const pr = await fetch(`${N8N}/workflows/${w.id}`, { method: 'PUT', headers: H, body: JSON.stringify(putBody) });
  if (pr.ok) { patched++; console.log(`  ✓ ${w.id}  ${w.name}`); }
  else { failed++; console.log(`  ✗ ${w.id}  ${w.name}  ${pr.status} ${(await pr.text()).slice(0,120)}`); }
}

console.log(`\n========================================`);
console.log(`警報 WF: ${ALERT_ID} (已啟用)`);
console.log(`補上 errorWorkflow: ${patched} 隻 / 已設或跳過: ${skipped} / 失敗: ${failed}`);
