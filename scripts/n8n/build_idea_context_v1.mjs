// 嗨嗨構想 時事補充 v1 (WF-B) — webhook /db06-idea-context
// 輸入 { trigger_page_id, target_page_id }
// Tavily 搜去年同期 → 建 DB06 明細 → 連入 target 明細引用 → append 觸發頁 執行備註
// 需 n8n env: NOTION_INTEGRATION_TOKEN, TAVILY_API_KEY
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_idea_context_v1.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const NAME = '嗨嗨構想 時事補充 v1';
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

const parseCode = `
const root = $input.first().json || {};
const body = root.body || root;
if (!body.trigger_page_id || !body.target_page_id) throw new Error('缺 trigger_page_id 或 target_page_id');
return [{ json: { trigger_page_id: body.trigger_page_id, target_page_id: body.target_page_id } }];
`.trim();

const extractCode = `
const target = $input.first().json;
const u = $('解析輸入').first().json;
const p = target.properties || {};
const rt = (arr) => (arr || []).map(t => t.plain_text || '').join('').trim();
let title = rt(p['主題名稱']?.rich_text);
if (!title) for (const k of Object.keys(p)) if (p[k].type === 'title') { title = rt(p[k].title); break; }
const zhihua = rt(p['質化指標']?.rich_text);
const tokens = (title + ' ' + zhihua).split(/[\\s,，。、；;\\/]+/).filter(t => t.length >= 2);
const keywords = tokens.slice(0, 3).join(' ') || title;
const today = new Date();
const lastYear = today.getFullYear() - 1;
const monthNow = today.getMonth() + 1;
const fmt = (d) => d.toISOString().slice(0, 10);
const start = fmt(new Date(today.getTime() - (365 + 30) * 86400000));
const end = fmt(new Date(today.getTime() - (365 - 30) * 86400000));
return [{ json: { trigger_page_id: u.trigger_page_id, target_page_id: u.target_page_id, title, keywords,
  searchQuery: keywords + ' ' + lastYear + '年 ' + monthNow + '月', startDate: start, endDate: end } }];
`.trim();

const tavilyBodyCode = `
const ext = $input.first().json;
return [{ json: { ext, tavilyBody: { api_key: $env.TAVILY_API_KEY, query: ext.searchQuery, search_depth: 'basic', max_results: 5, include_answer: false, days: 730 } } }];
`.trim();

const contentCode = `
const ext = $('提取欄位').first().json;
const tv = $input.first().json;
const results = tv.results || [];
const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
let md = '時間窗口：' + ext.startDate + ' – ' + ext.endDate + '\\n搜尋關鍵詞：' + ext.keywords + '\\n\\n';
if (results.length === 0) md += '（無結果）';
else results.slice(0, 5).forEach((r, i) => {
  md += (i+1) + '. ' + (r.title || '無題') + '\\n';
  if (r.published_date) md += '   日期：' + r.published_date + '\\n';
  md += '   來源：' + r.url + '\\n   ' + (r.content || '').slice(0, 300).replace(/\\n+/g, ' ') + '\\n\\n';
});
const firstUrl = results[0]?.url || '';
const summary = (results[0]?.content || '').slice(0, 150).replace(/\\n+/g, ' ');
return [{ json: { trigger_page_id: ext.trigger_page_id, target_page_id: ext.target_page_id,
  detailTitle: '去年同期時事｜' + today, detailContent: md, firstUrl, summary,
  keywords: ext.keywords, startDate: ext.startDate, endDate: ext.endDate } }];
`.trim();

const pageBodyCode = `
const d = $input.first().json;
const blocks = [];
for (let i = 0; i < d.detailContent.length; i += 1800) {
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: d.detailContent.slice(i, i+1800) } }] } });
}
const properties = {
  '明細名稱': { title: [{ type: 'text', text: { content: d.detailTitle } }] },
  '明細類型': { select: { name: '資料參考' } },
  '參考選項': { select: { name: '登記內容' } },
  '對應內容': { relation: [{ id: d.target_page_id }] }
};
if (d.firstUrl) properties['對應連結'] = { url: d.firstUrl };
return [{ json: { ...d, pageBody: { parent: { data_source_id: '${DB06_DSID}' }, properties, children: blocks.slice(0, 100) } } }];
`.trim();

const captureCreateCode = `
const cr = $input.first().json;
const u = $('組建頁參數').first().json;
return [{ json: { newDb06Id: cr.id, newDb06Url: cr.url,
  trigger_page_id: u.trigger_page_id, target_page_id: u.target_page_id,
  summary: u.summary, keywords: u.keywords, startDate: u.startDate, endDate: u.endDate } }];
`.trim();

const relationCode = `
const tgt = $input.first().json;
const u = $('收建頁結果').first().json;
const existing = tgt.properties?.['明細引用']?.relation || [];
const newRelation = [...existing, { id: u.newDb06Id }];
return [{ json: { ...u, newRelation } }];
`.trim();

const appendTriggerCode = `
const tp = $input.first().json;
const u = $('組 relation').first().json;
const date = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
const text = '── [時事補充] 嗨嗨構想 n8n｜' + date + ' ──\\n時間窗口：' + u.startDate + ' – ' + u.endDate + '\\n搜尋關鍵詞：' + u.keywords + '\\n已建明細：' + u.newDb06Url + '\\n摘要：' + u.summary;
const existing = tp.properties?.['執行備註']?.rich_text || [];
const sep = existing.length > 0 ? '\\n\\n' : '';
return [{ json: { trigger_page_id: u.trigger_page_id, rich_text: [...existing, { type: 'text', text: { content: sep + text } }] } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    { id: 'b1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { httpMethod: 'POST', path: 'db06-idea-context', responseMode: 'lastNode', responseData: 'firstEntryJson' },
      webhookId: 'db06-idea-context' },
    { id: 'b2', name: '解析輸入', type: 'n8n-nodes-base.code', typeVersion: 2, position: [480, 300],
      parameters: { language: 'javaScript', jsCode: parseCode } },
    { id: 'b3', name: '抓 target', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [720, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $json.target_page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'b4', name: '提取欄位', type: 'n8n-nodes-base.code', typeVersion: 2, position: [960, 300],
      parameters: { language: 'javaScript', jsCode: extractCode } },
    { id: 'b5', name: '組 Tavily body', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1200, 300],
      parameters: { language: 'javaScript', jsCode: tavilyBodyCode } },
    { id: 'b6', name: '呼叫 Tavily', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1440, 300],
      parameters: { method: 'POST', url: 'https://api.tavily.com/search',
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify($json.tavilyBody) }}',
        options: { timeout: 30000 } }, continueOnFail: true },
    { id: 'b7', name: '組明細內容', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1680, 300],
      parameters: { language: 'javaScript', jsCode: contentCode } },
    { id: 'b8', name: '組建頁參數', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1920, 300],
      parameters: { language: 'javaScript', jsCode: pageBodyCode } },
    { id: 'b9', name: '建 DB06 明細', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [2160, 300],
      parameters: { method: 'POST', url: 'https://api.notion.com/v1/pages',
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify($json.pageBody) }}',
        options: {} } },
    { id: 'b10', name: '收建頁結果', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2400, 300],
      parameters: { language: 'javaScript', jsCode: captureCreateCode } },
    { id: 'b11', name: '抓 target relation', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [2640, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $json.target_page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'b12', name: '組 relation', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2880, 300],
      parameters: { language: 'javaScript', jsCode: relationCode } },
    { id: 'b13', name: '更新明細引用', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [3120, 300],
      parameters: { method: 'PATCH',
        url: '={{ "https://api.notion.com/v1/pages/" + $json.target_page_id }}',
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ properties: { "明細引用": { relation: $json.newRelation } } }) }}',
        options: {} } },
    { id: 'b14', name: '抓觸發頁', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [3360, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $(\'組 relation\').item.json.trigger_page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'b15', name: '組執行備註', type: 'n8n-nodes-base.code', typeVersion: 2, position: [3600, 300],
      parameters: { language: 'javaScript', jsCode: appendTriggerCode } },
    { id: 'b16', name: '更新執行備註', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [3840, 300],
      parameters: { method: 'PATCH',
        url: '={{ "https://api.notion.com/v1/pages/" + $json.trigger_page_id }}',
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ properties: { "執行備註": { rich_text: $json.rich_text } } }) }}',
        options: {} } }
  ],
  connections: {
    'Webhook': { main: [[{ node: '解析輸入', type: 'main', index: 0 }]] },
    '解析輸入': { main: [[{ node: '抓 target', type: 'main', index: 0 }]] },
    '抓 target': { main: [[{ node: '提取欄位', type: 'main', index: 0 }]] },
    '提取欄位': { main: [[{ node: '組 Tavily body', type: 'main', index: 0 }]] },
    '組 Tavily body': { main: [[{ node: '呼叫 Tavily', type: 'main', index: 0 }]] },
    '呼叫 Tavily': { main: [[{ node: '組明細內容', type: 'main', index: 0 }]] },
    '組明細內容': { main: [[{ node: '組建頁參數', type: 'main', index: 0 }]] },
    '組建頁參數': { main: [[{ node: '建 DB06 明細', type: 'main', index: 0 }]] },
    '建 DB06 明細': { main: [[{ node: '收建頁結果', type: 'main', index: 0 }]] },
    '收建頁結果': { main: [[{ node: '抓 target relation', type: 'main', index: 0 }]] },
    '抓 target relation': { main: [[{ node: '組 relation', type: 'main', index: 0 }]] },
    '組 relation': { main: [[{ node: '更新明細引用', type: 'main', index: 0 }]] },
    '更新明細引用': { main: [[{ node: '抓觸發頁', type: 'main', index: 0 }]] },
    '抓觸發頁': { main: [[{ node: '組執行備註', type: 'main', index: 0 }]] },
    '組執行備註': { main: [[{ node: '更新執行備註', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`Webhook URL: https://makesense.zeabur.app/webhook/db06-idea-context`);
console.log(`\n⚠️ 跑之前確認 n8n env 已設 TAVILY_API_KEY`);
