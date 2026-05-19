import { workflow, node, trigger } from '@n8n/workflow-sdk';

const jsCode = `
const NOTION_TOKEN = $env.NOTION_TOKEN || '';
const CLAUDE_API_KEY = $env.ANTHROPIC_API_KEY || '';
const DB07_ID = '1a7e3684754d47bcb335cf5b795454ac';
const DB06_ID = '3469ff25fdab83c98ff98107ee6a6a1c';
const WF1B_URL = 'https://makesense.zeabur.app/webhook/hihi-research';
const WF2C_URL = 'https://makesense.zeabur.app/webhook/hihi-analyze-research';
const SELF_URL = 'https://makesense.zeabur.app/webhook/db07-batch-scheduler';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const NL = String.fromCharCode(10);
const NH = { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nodash = (id) => (id || '').split('-').join('');
function dash(id) {
  const s = nodash(id);
  if (s.length !== 32) return id;
  return s.slice(0,8) + '-' + s.slice(8,12) + '-' + s.slice(12,16) + '-' + s.slice(16,20) + '-' + s.slice(20);
}
const rt = (arr) => (arr || []).map((t) => t.plain_text || '').join('');

async function notion(method, path, body) {
  const r = await this.helpers.httpRequest({
    method, url: 'https://api.notion.com/v1' + path,
    headers: NH, body: body || undefined, json: true,
    returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  if (r.statusCode >= 400) throw new Error('Notion ' + method + ' ' + path + ' => ' + r.statusCode + ': ' + JSON.stringify(r.body || {}).slice(0,200));
  return r.body;
}

async function callWebhook(url, payload, timeoutMs) {
  return await this.helpers.httpRequest({
    method: 'POST', url, body: payload, json: true,
    timeout: timeoutMs || 290000,
    returnFullResponse: true, ignoreHttpStatusErrors: true
  });
}

async function markBat(gx, status, note) {
  if (!gx) return;
  const props = { 'ai狀態': { status: { name: status } } };
  if (note) props['執行備註'] = { rich_text: [{ type: 'text', text: { content: String(note).slice(0,1900) } }] };
  try { await notion.call(this, 'PATCH', '/pages/' + gx.id, { properties: props }); } catch (e) {}
}

const log = [];

const pick = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
  filter: { and: [
    { property: '明細類型', select: { equals: '細部流程' } },
    { property: 'ai模式', select: { equals: '文案' } },
    { property: 'ai狀態', status: { equals: '待執行' } },
    { property: '對應庫存', relation: { is_not_empty: true } }
  ] },
  sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  page_size: 1
});

if (!(pick.results || []).length) {
  return [{ json: { done: true, message: '批次完成：已無待執行的文案工項' } }];
}

const wenanGx = pick.results[0];
const db07Rel = (wenanGx.properties['對應庫存'] && wenanGx.properties['對應庫存'].relation) || [];
if (!db07Rel.length) {
  return [{ json: { done: true, message: '挑到的文案工項無對應庫存（理論上不會發生），停止以免誤動非批次資料' } }];
}
const db07Id = nodash(db07Rel[0].id);

const db07 = await notion.call(this, 'GET', '/pages/' + dash(db07Id));
const p = db07.properties || {};
const titleProp = Object.values(p).find((x) => x && x.type === 'title');
const db07Name = rt(titleProp ? titleProp.title : []) || '(未命名商品)';
const isbn = rt((p['商品ID'] || {}).rich_text || []);

const gxResp = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
  filter: { and: [
    { property: '對應庫存', relation: { contains: dash(db07Id) } },
    { property: '明細類型', select: { equals: '細部流程' } }
  ] },
  page_size: 20
});
const gxByMode = {};
for (const g of (gxResp.results || [])) {
  const m = (g.properties['ai模式'] && g.properties['ai模式'].select && g.properties['ai模式'].select.name) || '';
  if (m) gxByMode[m] = g;
}

const today = new Date().toISOString().slice(0,10);

try {
  await markBat.call(this, gxByMode['企劃'], '完成', '企劃 ' + today + '：書類商品專題，採 ISBN／書名驅動的六書源外部採集策略。');
  log.push('企劃 ok');
} catch (e) { log.push('企劃 err:' + e.message); }

try {
  const r = await callWebhook.call(this, WF1B_URL, { page_id: db07Id }, 290000);
  const created = (r.body && r.body.created != null) ? r.body.created : '?';
  await markBat.call(this, gxByMode['搜查'], '完成', '搜查 WF1b 完成（HTTP' + r.statusCode + '），新建資料參考 ' + created + ' 筆。');
  log.push('搜查 created=' + created);
} catch (e) {
  await markBat.call(this, gxByMode['搜查'], '完成', '搜查 失敗：' + e.message);
  log.push('搜查 err:' + e.message);
}

let bridged = 0;
try {
  const refResp = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
    filter: { and: [
      { property: '對應庫存', relation: { contains: dash(db07Id) } },
      { property: '明細類型', select: { equals: '資料參考' } }
    ] },
    page_size: 100
  });
  for (const ref of (refResp.results || [])) {
    const urlsText = rt((ref.properties['圖URL list'] || {}).rich_text || []);
    const urls = urlsText.split(',').map((s) => s.trim()).filter((u) => u && (u.indexOf('http://') === 0 || u.indexOf('https://') === 0));
    const props = { 'ai模式': { select: { name: '分析' } }, 'ai狀態': { status: { name: '待執行' } } };
    if (urls.length) {
      props['上傳檔案'] = { files: urls.slice(0,5).map((u, i) => ({ type: 'external', name: '封面圖' + (i + 1), external: { url: u } })) };
    }
    try { await notion.call(this, 'PATCH', '/pages/' + ref.id, { properties: props }); bridged++; } catch (e) {}
    await sleep(200);
  }
  log.push('橋接 ' + bridged + ' 筆資料參考（圖URL→上傳檔案，ai模式→分析）');
} catch (e) { log.push('橋接 err:' + e.message); }

try {
  const r = await callWebhook.call(this, WF2C_URL, { page_id: db07Id }, 290000);
  const proc = (r.body && r.body.processed != null) ? r.body.processed : '?';
  await markBat.call(this, gxByMode['分析'], '完成', '分析 WF2c 完成（HTTP' + r.statusCode + '），處理素材 ' + proc + ' 筆。');
  log.push('分析 processed=' + proc);
} catch (e) {
  await markBat.call(this, gxByMode['分析'], '完成', '分析 失敗：' + e.message);
  log.push('分析 err:' + e.message);
}

let fenxiNote = rt((p['分析備註'] || {}).rich_text || []);
try {
  const db07b = await notion.call(this, 'GET', '/pages/' + dash(db07Id));
  const fn = rt(((db07b.properties || {})['分析備註'] || {}).rich_text || []);
  if (fn) fenxiNote = fn;
} catch (e) {}

try {
  const tagRel = (p['對應標籤'] && p['對應標籤'].relation) || [];
  if (!tagRel.length) {
    await markBat.call(this, gxByMode['聯想'], '完成', '聯想 DB07 無對應標籤，無可聯想對象，跳過。');
    log.push('聯想 no-tags');
  } else {
    const orFilter = tagRel.map((t) => ({ property: '對應標籤', relation: { contains: dash(nodash(t.id)) } }));
    const sib = await notion.call(this, 'POST', '/databases/' + DB07_ID + '/query', { filter: { or: orFilter }, page_size: 30 });
    const related = [];
    for (const s of (sib.results || [])) {
      if (nodash(s.id) === db07Id) continue;
      const stp = Object.values(s.properties || {}).find((x) => x && x.type === 'title');
      const nm = rt(stp ? stp.title : []);
      if (nm) related.push(nm);
    }
    const note = related.length
      ? '聯想 同標籤關聯商品 ' + related.length + ' 筆：' + related.slice(0,15).join('、')
      : '聯想 標籤池內無其他關聯商品。';
    await markBat.call(this, gxByMode['聯想'], '完成', note);
    log.push('聯想 related=' + related.length);
  }
} catch (e) {
  await markBat.call(this, gxByMode['聯想'], '完成', '聯想 失敗：' + e.message);
  log.push('聯想 err:' + e.message);
}

let summary = '';
try {
  const refResp2 = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
    filter: { and: [
      { property: '對應庫存', relation: { contains: dash(db07Id) } },
      { property: '明細類型', select: { equals: '資料參考' } }
    ] },
    page_size: 100
  });
  const refTexts = [];
  for (const ref of (refResp2.results || [])) {
    const rp = ref.properties || {};
    const nm = rt((rp['明細名稱'] || {}).title || []);
    const sm = rt((rp['簡介摘要'] || {}).rich_text || []);
    const ct = rt((rp['明細內容'] || {}).rich_text || []);
    const piece = [nm, sm, ct].filter(Boolean).join(' / ');
    if (piece) refTexts.push('- ' + piece.slice(0,400));
  }
  const refBlock = refTexts.slice(0,25).join(NL) || '（搜查棒未採集到外部參考資料）';

  const sysPrompt = [
    '你是 makesense（現思文化創藝有限公司，宜蘭在地文化事業，旗下旅人書店）的商品文案棒。',
    '你的任務是為一件即將在 makesense.ink 官網上架販售的商品，撰寫一段「簡介摘要」。',
    '',
    '== 鐵律 ==',
    '1. 字數目標 380 至 460 字（繁體中文，標點計入），絕對不可超過 500 字、不可少於 300 字。',
    '2. 只能根據下方提供的商品資料與採集參考資料撰寫，嚴禁杜撰書中沒有的情節、得獎紀錄、名人推薦或評論。',
    '3. 不要寫「本書簡介」「以下是」這類開場白，直接進入內容。',
    '4. 語氣溫厚、有文化感，符合獨立書店選書的調性，不要電商促銷腔。',
    '5. 結構建議：先點出主題與價值，再描述內容特色，最後一句連結讀者為什麼值得讀。',
    '6. 若參考資料嚴重不足，就只就書名能合理推知的範圍簡短描述，不要硬湊字數、不要編造。',
    '7. 只輸出簡介摘要本文，不要任何額外說明、不要 JSON、不要標題、不要前後綴。'
  ].join(NL);

  const userPrompt = [
    '商品名稱：' + db07Name,
    'ISBN／商品ID：' + (isbn || '（無）'),
    '',
    '分析備註（嗨嗨分析棒彙整的素材分析結果）：',
    fenxiNote || '（無）',
    '',
    '採集參考資料（嗨嗨搜查棒從外部書源採集）：',
    refBlock,
    '',
    '請依鐵律撰寫一段 300 至 500 字的簡介摘要。'
  ].join(NL);

  const cr = await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.anthropic.com/v1/messages',
    headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: { model: CLAUDE_MODEL, max_tokens: 1500, system: sysPrompt, messages: [{ role: 'user', content: userPrompt }] },
    json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  if (cr.statusCode >= 400) throw new Error('Claude API ' + cr.statusCode + ': ' + JSON.stringify(cr.body || {}).slice(0,200));
  summary = (((cr.body || {}).content || [{}])[0].text || '').trim();
  if (!summary) throw new Error('Claude 回傳空白');

  await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), {
    properties: { '簡介摘要': { rich_text: [{ type: 'text', text: { content: summary.slice(0,2000) } }] } }
  });
  await markBat.call(this, gxByMode['文案'], '完成', '文案 已產出簡介摘要（字數 ' + summary.length + '），已寫回 DB07 簡介摘要。');
  log.push('文案 len=' + summary.length);
} catch (e) {
  await markBat.call(this, gxByMode['文案'], '完成', '文案 失敗：' + e.message + '（簡介摘要未寫入；請人工檢視後將此工項 ai狀態 重設為待執行可重跑）');
  log.push('文案 err:' + e.message);
}

try {
  const len = summary.length;
  let verdict;
  if (!summary) verdict = '檢核 ⚠️ 無簡介摘要產出，文案棒失敗，需人工處理。';
  else if (len < 300) verdict = '檢核 ⚠️ 字數 ' + len + ' 偏少（<300），建議人工補寫。';
  else if (len > 500) verdict = '檢核 ⚠️ 字數 ' + len + ' 偏多（>500），建議人工精簡。';
  else verdict = '檢核 ✅ 通過，字數 ' + len + '，落在 300-500 區間。';
  await markBat.call(this, gxByMode['檢核'], '完成', verdict);
  log.push(verdict.slice(0,24));
} catch (e) { log.push('檢核 err:' + e.message); }

try {
  await this.helpers.httpRequest({ method: 'POST', url: SELF_URL, body: { chained: true }, json: true, timeout: 3000, returnFullResponse: true, ignoreHttpStatusErrors: true });
} catch (e) {}

return [{ json: { done: false, db07Id, db07Name, isbn, summary_length: summary.length, log } }];
`;

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook 啟動/接力',
    parameters: { httpMethod: 'POST', path: 'db07-batch-scheduler', responseMode: 'lastNode', responseData: 'firstEntryJson', options: {} },
    position: [240, 200]
  },
  output: [{ body: { chained: true } }]
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cron 安全網 30min',
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } },
    position: [240, 460]
  },
  output: [{}]
});

const scheduler = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: '逐筆 DB07 六棒調度',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode },
    position: [560, 300]
  },
  output: [{ done: false, db07Id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', db07Name: '範例書名', isbn: '9789860000000', summary_length: 420, log: ['搜查 created=6', '分析 processed=6', '文案 len=420'] }]
});

export default workflow('db07-batch-scheduler', 'DB07 無關卡批次調度器')
  .add(webhookTrigger)
  .to(scheduler)
  .add(scheduleTrigger)
  .to(scheduler);
