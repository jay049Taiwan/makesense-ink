// 嗨嗨派發中心 v1 (dispatcher v3 — 觸發欄位改為 智動狀態)
// 變動：Notion Automation 觸發訂為 智動狀態=執行中；n8n 跑完 PATCH 智動狀態=完成
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_dispatch_v3.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

const NAME = '嗨嗨派發中心 v1';

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
  console.log(`🗑  刪舊 dispatch WF: ${w.id}`);
}
const ALERT_ID = await findOneId('嗨嗨警報 v1');

const parseCode = `
const MAP = { '搜查': 'search', '分析': 'analyze', '企劃': 'plan', '文案': 'copy', '檢核': 'check', '構想': 'idea' };
const root = $input.first().json || {};
const body = root.body || root;
const data = body.data || body;
const props = data.properties || {};
const mode = props['智動模式']?.select?.name || '';
const pageId = data.id || data.page?.id || '';
if (!pageId) throw new Error('缺 page_id');
const modeKey = MAP[mode];
if (!modeKey) throw new Error('未知 智動模式：' + JSON.stringify(mode));
return [{ json: { mode, modeKey, pageId } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    { id: 'd1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { httpMethod: 'POST', path: 'db06-dispatch', responseMode: 'onReceived', responseData: 'firstEntryJson' },
      webhookId: 'db06-dispatch' },
    { id: 'd2', name: '解析模式', type: 'n8n-nodes-base.code', typeVersion: 2, position: [520, 300],
      parameters: { language: 'javaScript', jsCode: parseCode } },
    { id: 'd3', name: '呼叫對應 baton', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [800, 300],
      parameters: {
        method: 'POST',
        url: '={{ "https://makesense.zeabur.app/webhook/db06-" + $json.modeKey }}',
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ page_id: $json.pageId, mode: $json.mode }) }}',
        options: { timeout: 60000 }
      },
      continueOnFail: true },
    { id: 'd4', name: 'PATCH 智動狀態=完成', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1080, 300],
      parameters: {
        method: 'PATCH',
        url: '={{ "https://api.notion.com/v1/pages/" + $(\'解析模式\').item.json.pageId }}',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Authorization', value: '={{ "Bearer " + $env.NOTION_INTEGRATION_TOKEN }}' },
          { name: 'Notion-Version', value: '2022-06-28' }
        ]},
        sendBody: true, contentType: 'json',
        jsonBody: '{"properties":{"智動狀態":{"status":{"name":"完成"}}}}',
        options: {}
      } }
  ],
  connections: {
    'Webhook': { main: [[{ node: '解析模式', type: 'main', index: 0 }]] },
    '解析模式': { main: [[{ node: '呼叫對應 baton', type: 'main', index: 0 }]] },
    '呼叫對應 baton': { main: [[{ node: 'PATCH 智動狀態=完成', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
const ar = await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`啟用: ${ar.status}`);
console.log(`\nWebhook URL: https://makesense.zeabur.app/webhook/db06-dispatch`);
console.log(`觸發欄位: 智動狀態 → 執行中`);
console.log(`MAP: 搜查 / 分析 / 企劃 / 文案 / 檢核 / 構想`);
