// 嗨嗨派發中心 v1 (dispatcher v6 — 修正 body 格式：rawContentType 取代 contentType:json)
// v5 bug：contentType:'json'+jsonBody 對 Notion API 送出空字串；呼叫 baton 也同問題
// 修正：兩個 HTTP POST/PATCH 都改用 rawContentType:'application/json' + body:
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_dispatch_v5.mjs

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
  console.log(`🗑  刪舊: ${w.id}`);
}
const ALERT_ID = await findOneId('嗨嗨警報 v1');

// Step 1: 從 webhook body 取出 page_id
const parseIdCode = `
const root = $input.first().json || {};
const body = root.body || root;
const data = body.data || body;
const pageId = data.id || data.page?.id || '';
if (!pageId) throw new Error('缺 page_id，body keys=' + Object.keys(data).join(','));
return [{ json: { pageId } }];
`.trim();

// Step 3: 從 Notion GET 回傳的頁面資料解析 智動模式
const parseModeCode = `
const MAP = { '搜查': 'search', '分析': 'analyze', '企劃': 'plan', '文案': 'copy', '檢核': 'check', '構想': 'idea' };
const page = $input.first().json;
const pageId = page.id || '';
if (!pageId) throw new Error('Notion GET 失敗，缺 id');
const mode = page.properties?.['智動模式']?.select?.name || '';
const modeKey = MAP[mode];
if (!modeKey) throw new Error('未知 智動模式：' + JSON.stringify(mode));
return [{ json: { mode, modeKey, pageId } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    // d1: 接收 Notion Automation webhook
    { id: 'd1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { httpMethod: 'POST', path: 'db06-dispatch', responseMode: 'onReceived', responseData: 'firstEntryJson' },
      webhookId: 'db06-dispatch' },

    // d2: 解析 page_id
    { id: 'd2', name: '解析頁面ID', type: 'n8n-nodes-base.code', typeVersion: 2, position: [520, 300],
      parameters: { language: 'javaScript', jsCode: parseIdCode } },

    // d3: 主動 GET Notion 頁面，取 智動模式 當前值
    { id: 'd3', name: '取頁面屬性', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [800, 300],
      parameters: {
        method: 'GET',
        url: '={{ "https://api.notion.com/v1/pages/" + $json.pageId }}',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Authorization', value: '={{ "Bearer " + $env.NOTION_INTEGRATION_TOKEN }}' },
          { name: 'Notion-Version', value: '2022-06-28' }
        ]},
        options: {}
      }
    },

    // d4: 解析 智動模式 → modeKey
    { id: 'd4', name: '解析模式', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1080, 300],
      parameters: { language: 'javaScript', jsCode: parseModeCode } },

    // d5: 呼叫對應子 webhook (db06-search / db06-idea / ...)
    { id: 'd5', name: '呼叫對應 baton', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1360, 300],
      parameters: {
        method: 'POST',
        url: '={{ "https://makesense.zeabur.app/webhook/db06-" + $json.modeKey }}',
        sendBody: true,
        rawContentType: 'application/json',
        body: '={{ JSON.stringify({ page_id: $json.pageId, mode: $json.mode }) }}',
        options: { timeout: 60000 }
      },
      continueOnFail: true },

    // d6: PATCH 外掛狀態=完成（Code 節點用 require('https')，task runner 沙箱無全域 fetch）
    { id: 'd6', name: 'PATCH 外掛狀態=完成', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1640, 300],
      parameters: {
        language: 'javaScript',
        jsCode: `
const pageId = $('解析模式').first().json.pageId;
const token = $env.NOTION_INTEGRATION_TOKEN;
if (!token) throw new Error('缺 NOTION_INTEGRATION_TOKEN env');
if (!pageId) throw new Error('缺 pageId');

const https = require('https');
const payload = JSON.stringify({ properties: { '外掛狀態': { select: { name: '完成' } } } });

await new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'api.notion.com',
    path: '/v1/pages/' + pageId,
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => res.statusCode < 400
      ? resolve()
      : reject(new Error('Notion PATCH ' + res.statusCode + ': ' + body)));
  });
  req.on('error', reject);
  req.write(payload);
  req.end();
});

return [{ json: { patched: true, pageId } }];
`.trim()
      }
    }
  ],
  connections: {
    'Webhook':       { main: [[{ node: '解析頁面ID',      type: 'main', index: 0 }]] },
    '解析頁面ID':    { main: [[{ node: '取頁面屬性',      type: 'main', index: 0 }]] },
    '取頁面屬性':    { main: [[{ node: '解析模式',        type: 'main', index: 0 }]] },
    '解析模式':      { main: [[{ node: '呼叫對應 baton', type: 'main', index: 0 }]] },
    '呼叫對應 baton':{ main: [[{ node: 'PATCH 外掛狀態=完成', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`流程：Webhook → 解析頁面ID → 取頁面屬性(GET) → 解析模式 → 呼叫對應 baton → PATCH 完成`);
