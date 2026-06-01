// 嗨嗨構想 對標掃描 v1 (WF-A) — webhook /db06-idea-template
// 輸入 { trigger_page_id, target_page_id }
// 找 DB05 同類已發佈稿件 top 5 → append DB06 觸發頁 執行備註
// 用法：N8N_API_KEY=xxx node scripts/n8n/build_idea_template_v1.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const NAME = '嗨嗨構想 對標掃描 v1';
const DB05_DSID = '28a667a9-ede1-466a-9f18-419da33a8810';

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
return [{ json: { trigger_page_id: u.trigger_page_id, target_page_id: u.target_page_id,
  wenanOption: p['文案選項']?.select?.name || '',
  zhihua: rt(p['質化指標']?.rich_text), title } }];
`.trim();

const scoreCode = `
const ext = $('提取欄位').first().json;
const q = (ext.title + ' ' + ext.zhihua).toLowerCase();
const tokens = new Set(q.split(/[\\s,，。、；;]+/).filter(t => t.length >= 2));
const rt = (arr) => (arr || []).map(t => t.plain_text || '').join('').trim();
const results = $input.first().json.results || [];
const scored = results.map(pg => {
  const p = pg.properties || {};
  let idea = rt(p['執行構想']?.rich_text);
  let t = rt(p['主題名稱']?.rich_text);
  if (!t) for (const k of Object.keys(p)) if (p[k].type === 'title') { t = rt(p[k].title); break; }
  let s = 0;
  const lo = idea.toLowerCase();
  for (const tk of tokens) if (lo.includes(tk)) s++;
  return { url: pg.url, title: t, idea: idea.slice(0, 100), score: s };
}).filter(r => r.idea.length > 10);
scored.sort((a, b) => b.score - a.score);
return [{ json: { top: scored.slice(0, 5), trigger_page_id: ext.trigger_page_id } }];
`.trim();

const summaryCode = `
const top = $input.first().json.top || [];
const trigger_page_id = $input.first().json.trigger_page_id;
const date = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
let text = '── [對標掃描] 嗨嗨構想 n8n｜' + date + ' ──\\n';
if (top.length === 0) text += '無同類對標，建議參考各類指南';
else {
  text += '找到同類對標 ' + top.length + ' 篇：\\n';
  top.forEach((r, i) => { text += (i+1) + '. ' + r.title + ' → ' + r.url + '\\n   執行構想摘要：' + r.idea + '\\n'; });
}
return [{ json: { trigger_page_id, text } }];
`.trim();

const appendCode = `
const tp = $input.first().json;
const u = $('組摘要').first().json;
const existing = tp.properties?.['執行備註']?.rich_text || [];
const sep = existing.length > 0 ? '\\n\\n' : '';
const newEntries = [...existing, { type: 'text', text: { content: sep + u.text } }];
return [{ json: { trigger_page_id: u.trigger_page_id, rich_text: newEntries } }];
`.trim();

const body = {
  name: NAME,
  nodes: [
    { id: 'n1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { httpMethod: 'POST', path: 'db06-idea-template', responseMode: 'lastNode', responseData: 'firstEntryJson' },
      webhookId: 'db06-idea-template' },
    { id: 'n2', name: '解析輸入', type: 'n8n-nodes-base.code', typeVersion: 2, position: [480, 300],
      parameters: { language: 'javaScript', jsCode: parseCode } },
    { id: 'n3', name: '抓 target', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [720, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $json.target_page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'n4', name: '提取欄位', type: 'n8n-nodes-base.code', typeVersion: 2, position: [960, 300],
      parameters: { language: 'javaScript', jsCode: extractCode } },
    { id: 'n5', name: '查 DB05 候選', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1200, 300],
      parameters: { method: 'POST',
        url: `https://api.notion.com/v1/data_sources/${DB05_DSID}/query`,
        sendHeaders: true, headerParameters: NH,
        sendBody: true, contentType: 'json',
        jsonBody: '={{ JSON.stringify({ filter: { and: [ { property: "文案選項", select: { equals: $(\'提取欄位\').item.json.wenanOption } }, { property: "發佈狀態", status: { equals: "已發佈" } } ] }, sorts: [{ timestamp: "last_edited_time", direction: "descending" }], page_size: 30 }) }}',
        options: {} } },
    { id: 'n6', name: '計分取前5', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1440, 300],
      parameters: { language: 'javaScript', jsCode: scoreCode } },
    { id: 'n7', name: '組摘要', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1680, 300],
      parameters: { language: 'javaScript', jsCode: summaryCode } },
    { id: 'n8', name: '抓觸發頁', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [1920, 300],
      parameters: { method: 'GET', url: '={{ "https://api.notion.com/v1/pages/" + $json.trigger_page_id }}',
        sendHeaders: true, headerParameters: NH, options: {} } },
    { id: 'n9', name: '組附加文字', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2160, 300],
      parameters: { language: 'javaScript', jsCode: appendCode } },
    { id: 'n10', name: '更新執行備註', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [2400, 300],
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
    '提取欄位': { main: [[{ node: '查 DB05 候選', type: 'main', index: 0 }]] },
    '查 DB05 候選': { main: [[{ node: '計分取前5', type: 'main', index: 0 }]] },
    '計分取前5': { main: [[{ node: '組摘要', type: 'main', index: 0 }]] },
    '組摘要': { main: [[{ node: '抓觸發頁', type: 'main', index: 0 }]] },
    '抓觸發頁': { main: [[{ node: '組附加文字', type: 'main', index: 0 }]] },
    '組附加文字': { main: [[{ node: '更新執行備註', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', ...(ALERT_ID ? { errorWorkflow: ALERT_ID } : {}) }
};

const cr = await fetch(N8N + '/workflows', { method: 'POST', headers: H, body: JSON.stringify(body) });
if (!cr.ok) { console.error('建失敗:', cr.status, await cr.text()); process.exit(1); }
const created = await cr.json();
console.log(`✅ 建立: ${created.id}  ${NAME}`);
await fetch(`${N8N}/workflows/${created.id}/activate`, { method: 'POST', headers: H });
console.log(`Webhook URL: https://makesense.zeabur.app/webhook/db06-idea-template`);
