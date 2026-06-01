// 嗨嗨派發輪詢 v1 — cron 1 分鐘掛 DB06 外掛狀態=進行中 → 派發並 claim
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_neural_poll_v1.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const NAME = '嗨嗨派發輪詢 v1';
const DB06_DSID = 'a809ff25-fdab-8236-b491-87496d236ac9';

async function findByName(name) {
  const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
  return ((await r.json()).data || []).filter(w => w.name === name);
}
async function findOneId(name) {
  const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
  return ((await r.json()).data || []).find(w => w.name === name)?.id;
}
for (const w of await findByName(NAME)) {
  if (w.active) await fetch(`${N8N}/workflows/${w.id}/deactivate`, { method: 'POST', headers: H });
  await fetch(`${N8N}/workflows/${w.id}`, { method: 'DELETE', headers: H });
  console.log(`🗑  刪舊: ${w.id}`);
}
const ALERT_ID = await findOneId('嗨嗨警報 v1');

const NH = { parameters: [
  { name: 'Authorization', value: '={{ "Bearer " + $env.NOTION_INTEGRATION_TOKEN }}' },
  { name: 'Notion-Version', value: '2022-06-28' }
]};

const splitCode = `
const results = $input.first().json.results || [];
const items = [];
for (const pg of results) {
  const props = pg.properties || {};
  const mode = props['智動模式']?.select?.name || '';
  if (!mode) continue;
  items.push({ json: { id: pg.id, mode } });
}
return items;
`.trim();

const body = {
  name: NAME,
  nodes: [
    { id: 'p1', name: 'Cron 1min', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1, position: [240, 300],
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } },
    { id: 'p2', name: '查 DB06 進行中', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [520, 300],
      parameters: {
        method: 'POST',
        url: `https://api.notion.com/v1/data_sources/${DB06_DSID}/query`,
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '{"filter":{"property":"外掛狀態","status":{"equals":"進行中"}},"page_size":10}',
        options: {}
      } },
    { id: 'p3', name: '拆分成多筆', type: 'n8n-nodes-base.code', typeVersion: 2, position: [800, 300],
      parameters: { language: 'javaScript', jsCode: splitCode } },
    { id: 'p4', name: 'PATCH claim=完成', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1080, 300],
      parameters: {
        method: 'PATCH',
        url: '={{ "https://api.notion.com/v1/pages/" + $json.id }}',
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '{"properties":{"外掛狀態":{"status":{"name":"完成"}}}}',
        options: {}
      },
      continueOnFail: true },
    { id: 'p5', name: '呼叫 dispatch', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1360, 300],
      parameters: {
        method: 'POST',
        url: 'https://makesense.zeabur.app/webhook/db06-dispatch',
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ data: { id: $(\'拆分成多筆\').item.json.id, properties: { "智動模式": { select: { name: $(\'拆分成多筆\').item.json.mode } } } } }) }}',
        options: { timeout: 5000 }
      },
      continueOnFail: true }
  ],
  connections: {
    'Cron 1min': { main: [[{ node: '查 DB06 進行中', type: 'main', index: 0 }]] },
    '查 DB06 進行中': { main: [[{ node: '拆分成多筆', type: 'main', index: 0 }]] },
    '拆分成多筆': { main: [[{ node: 'PATCH claim=完成', type: 'main', index: 0 }]] },
    'PATCH claim=完成': { main: [[{ node: '呼叫 dispatch', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`\n輪詢頻率：每 1 分鐘`);
console.log(`監控條件：DB06 外掛狀態 = 進行中 AND 智動模式 有值`);
console.log(`動作：PATCH 外掛狀態=完成（claim防重複）→ 呼叫 dispatch`);
