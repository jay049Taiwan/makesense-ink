import { workflow, node, trigger } from '@n8n/workflow-sdk';

const jsCode = `
const NOTION_TOKEN = $env.NOTION_TOKEN || '';
const CLAUDE_API_KEY = $env.ANTHROPIC_API_KEY || '';
const DB07_ID = '1a7e3684754d47bcb335cf5b795454ac';
const DB06_ID = '3469ff25fdab83c98ff98107ee6a6a1c';
const WF1B_URL = 'https://makesense.zeabur.app/webhook/hihi-research';
const SELF_URL = 'https://makesense.zeabur.app/webhook/db07-batch-scheduler';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const NL = String.fromCharCode(10);
const MIN_MATERIAL = 120;
const NH = { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nodash = (id) => (id || '').split('-').join('');
function dash(id) {
  const s = nodash(id);
  if (s.length !== 32) return id;
  return s.slice(0,8) + '-' + s.slice(8,12) + '-' + s.slice(12,16) + '-' + s.slice(16,20) + '-' + s.slice(20);
}
const rt = (arr) => (arr || []).map((t) => t.plain_text || '').join('');
const clean = (s) => (s || '').toString().split(NL).join(' ').replace(/\\s+/g, ' ').trim();
const stripHtml = (s) => (s || '').toString().split(/<[^>]+>/).join(' ').split('&nbsp;').join(' ').split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>').split('&quot;').join('"').split(NL).join(' ').replace(/\\s+/g, ' ').trim();
function extractPChomeProdId(url) {
  const i = (url || '').indexOf('/item/');
  if (i < 0) return '';
  let id = url.slice(i + 6);
  const stops = ['/', '?', '#', '&', ' '];
  for (const s of stops) { const ix = id.indexOf(s); if (ix > 0) id = id.slice(0, ix); }
  return id;
}

async function notion(method, path, body, attempt) {
  const a = attempt || 0;
  const r = await this.helpers.httpRequest({
    method, url: 'https://api.notion.com/v1' + path,
    headers: NH, body: body || undefined, json: true,
    returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  if ((r.statusCode === 429 || r.statusCode >= 500) && a < 3) {
    await sleep(2000 * Math.pow(2, a));
    return notion.call(this, method, path, body, a + 1);
  }
  if (r.statusCode >= 400) throw new Error('Notion ' + method + ' ' + path + ' => ' + r.statusCode + ': ' + JSON.stringify(r.body || {}).slice(0,150));
  return r.body;
}

async function claude(system, user, maxTokens, attempt) {
  const a = attempt || 0;
  const r = await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.anthropic.com/v1/messages',
    headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: { model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  if ((r.statusCode === 429 || r.statusCode >= 500 || r.statusCode === 529) && a < 4) {
    await sleep(3000 * Math.pow(2, a));
    return claude.call(this, system, user, maxTokens, a + 1);
  }
  if (r.statusCode >= 400) throw new Error('Claude ' + r.statusCode + ': ' + JSON.stringify(r.body || {}).slice(0,150));
  return (((r.body || {}).content || [{}])[0].text || '').trim();
}

async function fetchBlocks(pageId) {
  try {
    const r = await notion.call(this, 'GET', '/blocks/' + dash(pageId) + '/children?page_size=50');
    const out = [];
    for (const b of (r.results || [])) {
      const node = b[b.type];
      if (node && node.rich_text) {
        const txt = rt(node.rich_text);
        if (txt) out.push(txt);
      }
    }
    return out.join(NL);
  } catch (e) { return ''; }
}

async function markBat(gx, status, note) {
  if (!gx) return;
  const props = { 'ai狀態': { status: { name: status } } };
  if (note) props['執行備註'] = { rich_text: [{ type: 'text', text: { content: String(note).slice(0,1900) } }] };
  try { await notion.call(this, 'PATCH', '/pages/' + gx.id, { properties: props }); } catch (e) {}
}

function isRefusal(text) {
  const t = text || '';
  const marks = ['無法產出', '鐵律', '建議處理方式', '採集參考資料嚴重不足', '資料不足，無法', '我只能就', '無法撰寫'];
  for (const m of marks) { if (t.indexOf(m) >= 0) return true; }
  return false;
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
  return [{ json: { done: true, message: '批次完成：已無待執行且有對應庫存的文案工項' } }];
}

const wenanGx = pick.results[0];
const db07Rel = (wenanGx.properties['對應庫存'] && wenanGx.properties['對應庫存'].relation) || [];
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

try {
  await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), { properties: { '簡介摘要': { rich_text: [] } } });
} catch (e) {}

const today = new Date().toISOString().slice(0,10);

try {
  await markBat.call(this, gxByMode['企劃'], '完成', '企劃 ' + today + '：書類商品專題，採 ISBN／書名驅動的外部書源採集，再由分析棒萃取、文案棒成稿。');
  log.push('企劃 ok');
} catch (e) { log.push('企劃 err:' + e.message); }

try {
  const r = await this.helpers.httpRequest({
    method: 'POST', url: WF1B_URL, body: { page_id: db07Id }, json: true,
    timeout: 290000, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  const created = (r.body && r.body.created != null) ? r.body.created : '?';
  await markBat.call(this, gxByMode['搜查'], '完成', '搜查 WF1b 完成（HTTP' + r.statusCode + '），新建資料參考 ' + created + ' 筆。');
  log.push('搜查 created=' + created);
} catch (e) {
  await markBat.call(this, gxByMode['搜查'], '完成', '搜查 失敗：' + e.message);
  log.push('搜查 err:' + e.message);
}

let pchomeEnriched = 0;
let pchomeAttempted = 0;
try {
  const refResp0 = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
    filter: { and: [
      { property: '對應庫存', relation: { contains: dash(db07Id) } },
      { property: '明細類型', select: { equals: '資料參考' } }
    ] },
    page_size: 100
  });
  for (const ref of (refResp0.results || [])) {
    const url = (ref.properties['對應連結'] && ref.properties['對應連結'].url) || '';
    if (url.indexOf('pchome.com.tw/item/') < 0) continue;
    pchomeAttempted++;
    const existingSum = rt((ref.properties['簡介摘要'] || {}).rich_text || []);
    if (existingSum.length > 250) continue;
    const prodId = extractPChomeProdId(url);
    if (!prodId) continue;
    try {
      const ir = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://ecapi.pchome.com.tw/ecshop/prodapi/v2/prod/' + prodId + '/intro&_callback=cb',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120', 'Referer': 'https://24h.pchome.com.tw/', 'Accept': '*/*' },
        returnFullResponse: true, ignoreHttpStatusErrors: true
      });
      if (ir.statusCode !== 200) { await sleep(400); continue; }
      const raw = typeof ir.body === 'string' ? ir.body : '';
      const cbStart = raw.indexOf('cb(');
      const cbEnd = raw.lastIndexOf(');');
      if (cbStart < 0 || cbEnd <= cbStart + 3) { await sleep(400); continue; }
      const jsonStr = raw.slice(cbStart + 3, cbEnd);
      let parsed = null;
      try { parsed = JSON.parse(jsonStr); } catch (e) { await sleep(400); continue; }
      const arr = parsed && parsed[prodId];
      const introHtml = arr && arr[0] && arr[0].Intro;
      if (!introHtml) { await sleep(400); continue; }
      const text = stripHtml(introHtml).slice(0, 1800);
      if (text.length < 120) { await sleep(400); continue; }
      await notion.call(this, 'PATCH', '/pages/' + ref.id, {
        properties: { '簡介摘要': { rich_text: [{ type: 'text', text: { content: text } }] } }
      });
      pchomeEnriched++;
      await sleep(500);
    } catch (e) {}
  }
  log.push('PChome /intro 補料 ' + pchomeEnriched + '/' + pchomeAttempted + ' 筆');
} catch (e) { log.push('PChome 補料 err:' + e.message); }

const refResp = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
  filter: { and: [
    { property: '對應庫存', relation: { contains: dash(db07Id) } },
    { property: '明細類型', select: { equals: '資料參考' } }
  ] },
  page_size: 100
});
const materialParts = [];
const refList = (refResp.results || []).slice(0, 12);
for (const ref of refList) {
  const rp = ref.properties || {};
  const nm = rt((rp['明細名稱'] || {}).title || []);
  const sm = rt((rp['簡介摘要'] || {}).rich_text || []);
  const ct = rt((rp['明細內容'] || {}).rich_text || []);
  const blocks = await fetchBlocks.call(this, ref.id);
  const piece = [nm, sm, ct, blocks].filter(Boolean).join(' / ');
  if (piece) materialParts.push('- ' + clean(piece).slice(0,700));
  await sleep(150);
}
const material = materialParts.join(NL);
const materialLen = material.split(' ').join('').length;

let analysisNote = '';
try {
  if (materialLen >= 60) {
    const aSys = '你是 makesense 旅人書店的選品分析棒。下面是針對一件商品從外部書源採集到的原始素材（可能雜亂、含雜訊）。請萃取出可信的事實，輸出簡短條列：作者、出版社、出版年、主題類別、內容重點（2-3 點）。只寫素材裡有依據的，沒有的寫「未知」，嚴禁臆測。300 字內。';
    const aUser = '商品名稱：' + db07Name + NL + 'ISBN：' + (isbn || '（無）') + NL + NL + '原始採集素材：' + NL + material;
    analysisNote = await claude.call(this, aSys, aUser, 600);
    analysisNote = clean(analysisNote).slice(0,1800);
    await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), {
      properties: { '分析備註': { rich_text: [{ type: 'text', text: { content: analysisNote } }] } }
    });
    await markBat.call(this, gxByMode['分析'], '完成', '分析 完成，已就 ' + refList.length + ' 筆採集素材萃取重點寫入分析備註。');
    log.push('分析 ok len=' + analysisNote.length);
  } else {
    await markBat.call(this, gxByMode['分析'], '完成', '分析 採集素材不足（' + materialLen + ' 字），無可萃取內容。');
    log.push('分析 thin');
  }
} catch (e) {
  await markBat.call(this, gxByMode['分析'], '完成', '分析 失敗：' + e.message);
  log.push('分析 err:' + e.message);
}

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
let wenanNote = '';
const insufficientNote = '⚠️ 資料不足：外部採集素材撐不起一段可信簡介，未撰寫（依鐵律不臆測）。請人工補資料後，將此工項 ai狀態 改回待執行重跑。';

if (materialLen < MIN_MATERIAL) {
  wenanNote = insufficientNote + '（素材僅 ' + materialLen + ' 字）';
  log.push('文案 skip thin=' + materialLen);
} else {
  try {
    const sys = [
      '你是 makesense（現思文化創藝有限公司，宜蘭在地文化事業，旗下旅人書店）的商品文案棒。',
      '為一件即將在 makesense.ink 上架的商品撰寫「簡介摘要」。',
      '',
      '== 鐵律 ==',
      '1. 字數目標 380 至 460 字（繁體中文，標點計入），不可超過 500、不可少於 320。',
      '2. 只能根據下方「分析重點」與「採集素材」撰寫，嚴禁杜撰素材中沒有的情節、得獎、推薦、評論。',
      '3. 直接寫簡介本文，不要開場白、不要標題、不要任何說明或前後綴。',
      '4. 語氣溫厚、有文化感，獨立書店選書調性，不要電商促銷腔。',
      '5. 若你判斷素材不足以寫出一段可信簡介，請「只回覆兩個字：不足」，不要解釋、不要嘗試撰寫。'
    ].join(NL);
    const userBase = [
      '商品名稱：' + db07Name,
      'ISBN／商品ID：' + (isbn || '（無）'),
      '',
      '分析重點：',
      analysisNote || '（無）',
      '',
      '採集素材：',
      material
    ].join(NL);
    let draft = await claude.call(this, sys, userBase + NL + NL + '請撰寫 380-460 字簡介摘要。', 1200);
    if (draft === '不足' || draft.length < 12 || isRefusal(draft)) {
      wenanNote = insufficientNote;
      log.push('文案 model-says-thin');
    } else {
      if (draft.length > 500 || draft.length < 320) {
        const redo = await claude.call(this, sys, userBase + NL + NL + '你前一稿字數為 ' + draft.length + ' 字，不符規範。請改寫成約 420 字（嚴格 380-460 字之間）。', 1200);
        if (redo && redo !== '不足' && !isRefusal(redo) && redo.length >= 12) draft = redo;
      }
      summary = draft;
      await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), {
        properties: { '簡介摘要': { rich_text: [{ type: 'text', text: { content: summary.slice(0,2000) } }] } }
      });
      wenanNote = '文案 已產出簡介摘要（字數 ' + summary.length + '），已寫回 DB07。';
      log.push('文案 len=' + summary.length);
    }
  } catch (e) {
    wenanNote = '⚠️ 文案 Claude 連續失敗：' + e.message + '。簡介摘要留空，請重設此工項 ai狀態 待執行重跑。';
    log.push('文案 err:' + e.message);
  }
}
await markBat.call(this, gxByMode['文案'], '完成', wenanNote);

try {
  let verdict;
  if (!summary) verdict = '檢核 ⚠️ 無簡介摘要產出（資料不足或失敗），待人工處理，未上架文案。';
  else if (summary.length < 320) verdict = '檢核 ⚠️ 字數 ' + summary.length + ' 偏少，建議人工補寫。';
  else if (summary.length > 500) verdict = '檢核 ⚠️ 字數 ' + summary.length + ' 偏多，建議人工精簡。';
  else verdict = '檢核 ✅ 通過，字數 ' + summary.length + '，落在規範區間。';
  await markBat.call(this, gxByMode['檢核'], '完成', verdict);
  log.push(clean(verdict).slice(0,24));
} catch (e) { log.push('檢核 err:' + e.message); }

try {
  await this.helpers.httpRequest({ method: 'POST', url: SELF_URL, body: { chained: true }, json: true, timeout: 3000, returnFullResponse: true, ignoreHttpStatusErrors: true });
} catch (e) {}

return [{ json: { done: false, db07Id, db07Name, isbn, material_len: materialLen, summary_length: summary.length, log } }];
`;

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook 啟動/接力',
    parameters: { httpMethod: 'POST', path: 'db07-batch-scheduler', responseMode: 'lastNode', responseData: 'firstEntryJson', options: {} },
    position: [240, 300]
  },
  output: [{ body: { chained: true } }]
});

const scheduler = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: '逐筆 DB07 六棒調度',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode },
    position: [560, 300]
  },
  output: [{ done: false, db07Id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', db07Name: '範例書名', isbn: '9789860000000', material_len: 800, summary_length: 420, log: ['搜查 created=6', '分析 ok len=240', '文案 len=420'] }]
});

export default workflow('db07-batch-scheduler', 'DB07 無關卡批次調度器')
  .add(webhookTrigger)
  .to(scheduler);
