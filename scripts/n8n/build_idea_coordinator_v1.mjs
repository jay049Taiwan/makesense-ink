// 嗨嗨構想 協調 v1 — webhook /db06-idea
// 收 dispatcher → fetch DB06 trigger → fan out 並行呼叫 WF-A + WF-B → Merge → 回應
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_idea_coordinator_v1.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const NAME = '嗨嗨構想 協調 v1';

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

const parseCode = `
const root = $input.first().json || {};
const body = root.body || root;
const page_id = body.page_id || body.id || body.data?.id;
if (!page_id) throw new Error('缺 page_id');
return [{ json: { page_id } }];
`.trim();

const extractCode = `
const triggerPage = $input.first().json;
const upstream = $('解析輸入').first().json;
const rel = triggerPage.properties?.['對應內容']?.relation || [];
if (rel.length === 0) throw new Error('觸發頁「對應內容」relation 為空，找不到 target');
return [{ json: { trigger_page_id: upstream.page_id, target_page_id: rel[0].id } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    { id: 'c1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { httpMethod: 'POST', path: 'db06-idea', responseMode: 'lastNode', responseData: 'firstEntryJson' },
      webhookId: 'db06-idea' },
    { id: 'c2', name: '解析輸入', type: 'n8n-nodes-base.code', typeVersion: 2, position: [480, 300],
      parameters: { language: 'javaScript', jsCode: parseCode } },
    { id: 'c3', name: '抓觸發頁', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [720, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $json.page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'c4', name: '提取 target', type: 'n8n-nodes-base.code', typeVersion: 2, position: [960, 300],
      parameters: { language: 'javaScript', jsCode: extractCode } },
    { id: 'c5', name: '呼叫 WF-A', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1200, 200],
      parameters: { method: 'POST', url: 'https://makesense.zeabur.app/webhook/db06-idea-template',
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ trigger_page_id: $json.trigger_page_id, target_page_id: $json.target_page_id }) }}',
        options: { timeout: 50000 } }, continueOnFail: true },
    { id: 'c6', name: '呼叫 WF-B', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1200, 400],
      parameters: { method: 'POST', url: 'https://makesense.zeabur.app/webhook/db06-idea-context',
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ trigger_page_id: $(\'提取 target\').item.json.trigger_page_id, target_page_id: $(\'提取 target\').item.json.target_page_id }) }}',
        options: { timeout: 50000 } }, continueOnFail: true },
    { id: 'c7', name: 'Merge', type: 'n8n-nodes-base.merge', typeVersion: 3, position: [1480, 300],
      parameters: { mode: 'combine', combineBy: 'combineAll' } }
  ],
  connections: {
    'Webhook': { main: [[{ node: '解析輸入', type: 'main', index: 0 }]] },
    '解析輸入': { main: [[{ node: '抓觸發頁', type: 'main', index: 0 }]] },
    '抓觸發頁': { main: [[{ node: '提取 target', type: 'main', index: 0 }]] },
    '提取 target': { main: [[
      { node: '呼叫 WF-A', type: 'main', index: 0 },
      { node: '呼叫 WF-B', type: 'main', index: 0 }
    ]]},
    '呼叫 WF-A': { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
    '呼叫 WF-B': { main: [[{ node: 'Merge', type: 'main', index: 1 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`Webhook URL: https://makesense.zeabur.app/webhook/db06-idea`);
