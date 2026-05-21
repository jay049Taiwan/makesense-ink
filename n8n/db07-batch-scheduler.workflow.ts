import { workflow, node, trigger } from '@n8n/workflow-sdk';

const jsCode = `
const NOTION_TOKEN = $env.NOTION_INTEGRATION_TOKEN || '';
const CLAUDE_API_KEY = $env.ANTHROPIC_API_KEY || '';
const DB07_ID = '1a7e3684754d47bcb335cf5b795454ac';
const DB06_ID = '3469ff25fdab83c98ff98107ee6a6a1c';
const DB08_ID = '873970187f394f6b8304406745bd1579';
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

function normalizeName(name) {
  if (!name) return '';
  // 去括號補述（主編／編／譯／繪／譯者／繪者／合著者／編譯⋯）
  let s = name.toString();
  s = s.split('（')[0].split('(')[0];
  // 去尾端職稱式後綴
  const tails = ['主編', '編著', '編譯', '譯者', '繪者', '合著者', '監修', '審訂'];
  for (const t of tails) {
    if (s.endsWith(t)) s = s.slice(0, -t.length);
  }
  return s.replace(/\\s+/g, '').trim();
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

async function claude(system, user, maxTokens, temperature, attempt) {
  const a = attempt || 0;
  const body = { model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] };
  if (typeof temperature === 'number') body.temperature = temperature;
  const r = await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.anthropic.com/v1/messages',
    headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body,
    json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  if ((r.statusCode === 429 || r.statusCode >= 500 || r.statusCode === 529) && a < 4) {
    await sleep(3000 * Math.pow(2, a));
    return claude.call(this, system, user, maxTokens, temperature, a + 1);
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

async function findOrCreateDB08(rawName, role) {
  // role: 'person'（作者繪者譯者）or 'partner'（出版社發行商）
  const name = normalizeName(rawName);
  if (!name || name.length < 2) return null;

  // 查 DB08：title exact OR 同義備註 contains
  const q = await notion.call(this, 'POST', '/databases/' + DB08_ID + '/query', {
    filter: { or: [
      { property: '對象名稱', title: { equals: name } },
      { property: '同義備註', rich_text: { contains: name } }
    ]},
    page_size: 1
  });
  if ((q.results || []).length > 0) return q.results[0].id;

  // 沒找到 → 建新
  const props = {
    '對象名稱': { title: [{ type: 'text', text: { content: name } }] },
    '經營類型': { select: { name: '紀錄' } },
    '關係選項': { select: { name: role === 'person' ? '個人' : '合作夥伴' } },
    '發佈狀態': { status: { name: '已發佈' } }
  };
  try {
    const created = await notion.call(this, 'POST', '/pages', {
      parent: { database_id: DB08_ID },
      properties: props
    });
    return created.id;
  } catch (e) { return null; }
}

function pickCoverUrl(refPages) {
  // 從資料參考 page 的「上傳檔案」（files）挑封面，優先 external、忽略 expiring file
  for (const ref of refPages) {
    const files = (ref.properties['上傳檔案'] || {}).files || [];
    for (const f of files) {
      if (f.type === 'external' && f.external && f.external.url) return f.external.url;
    }
  }
  // 沒有 external 就退而求其次：拿 file (即使會過期)
  for (const ref of refPages) {
    const files = (ref.properties['上傳檔案'] || {}).files || [];
    for (const f of files) {
      if (f.type === 'file' && f.file && f.file.url) return f.file.url;
    }
  }
  return null;
}

// 從 findbook 資料參考 page 的簡介摘要解析權威書目（格式固定：作者:X、Y...,出版社:Z,出版日期:...）
function parseFindbookMeta(refPages) {
  const result = { authors: [], publisher: null };
  let line = '';
  for (const ref of refPages) {
    const url = (ref.properties['對應連結'] || {}).url || '';
    if (url.indexOf('findbook.com.tw') < 0) continue;
    const sm = rt((ref.properties['簡介摘要'] || {}).rich_text || []);
    if (sm.indexOf('作者') >= 0 && sm.indexOf('出版社') >= 0) { line = sm.split('：').join(':'); break; }
  }
  if (!line) return result;
  const aStart = line.indexOf('作者:');
  if (aStart >= 0) {
    let chunk = line.slice(aStart + 3);
    const stops = [',出版社', ',譯者', ',繪者', ',出版日期', ',語言', ',出版'];
    let cut = chunk.length;
    for (const st of stops) { const i = chunk.indexOf(st); if (i >= 0 && i < cut) cut = i; }
    chunk = chunk.slice(0, cut);
    result.authors = chunk.split('、').join(',').split(',').map((s) => s.trim()).filter(Boolean);
  }
  const pStart = line.indexOf('出版社:');
  if (pStart >= 0) {
    let chunk = line.slice(pStart + 4);
    let cut = chunk.length;
    const i = chunk.indexOf(','); if (i >= 0) cut = i;
    result.publisher = chunk.slice(0, cut).trim();
  }
  return result;
}

const log = [];

// ── 0. 挑下一筆文案工項 ──
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
  return [{ json: { done: true, message: '批次完成:已無待執行且有對應庫存的文案工項' } }];
}

const wenanGx = pick.results[0];
const db07Rel = (wenanGx.properties['對應庫存'] && wenanGx.properties['對應庫存'].relation) || [];
const db07Id = nodash(db07Rel[0].id);

const db07 = await notion.call(this, 'GET', '/pages/' + dash(db07Id));
const p = db07.properties || {};
const titleProp = Object.values(p).find((x) => x && x.type === 'title');
const db07Name = rt(titleProp ? titleProp.title : []) || '(未命名商品)';
const isbn = rt((p['商品ID'] || {}).rich_text || []);

// 6 棒工項
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

// ── 1. 清空舊資料（簡介摘要 + 對應作者 + 對應發行 + 庫存原價 + 產品照片）──
try {
  await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), { properties: {
    '簡介摘要': { rich_text: [] },
    '對應作者': { relation: [] },
    '對應發行': { relation: [] }
  } });
} catch (e) {}

const today = new Date().toISOString().slice(0,10);

// ── 2. 嗨嗨企劃 ──
try {
  await markBat.call(this, gxByMode['企劃'], '完成', '嗨嗨企劃 ' + today + ':書類商品專題,採 ISBN／書名驅動的外部書源採集,再由嗨嗨分析萃取、嗨嗨文案成稿。');
  log.push('企劃 ok');
} catch (e) { log.push('企劃 err:' + e.message); }

// ── 3. 嗨嗨搜查（WF1b）──
try {
  const r = await this.helpers.httpRequest({
    method: 'POST', url: WF1B_URL, body: { page_id: db07Id }, json: true,
    timeout: 290000, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
  const created = (r.body && r.body.created != null) ? r.body.created : '?';
  await markBat.call(this, gxByMode['搜查'], '完成', '嗨嗨搜查 WF1b 完成(HTTP' + r.statusCode + '),新建資料參考 ' + created + ' 筆。');
  log.push('搜查 created=' + created);
} catch (e) {
  await markBat.call(this, gxByMode['搜查'], '完成', '嗨嗨搜查 失敗:' + e.message);
  log.push('搜查 err:' + e.message);
}

// ── 4. 收集材料 ──
const refResp = await notion.call(this, 'POST', '/databases/' + DB06_ID + '/query', {
  filter: { and: [
    { property: '對應庫存', relation: { contains: dash(db07Id) } },
    { property: '明細類型', select: { equals: '資料參考' } }
  ] },
  page_size: 100
});
const refPages = refResp.results || [];
const materialParts = [];
for (const ref of refPages.slice(0, 12)) {
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

// ── 5. 嗨嗨分析（結構化 JSON 輸出）──
let extracted = { authors: [], illustrators: [], translators: [], publisher: null, distributor: null, original_price: null, summary_points: '' };
let analysisStr = '';
try {
  if (materialLen >= 60) {
    const aSys = [
      '你是 makesense 旅人書店的選品嗨嗨分析。從採集素材中萃取結構化欄位。',
      '輸出純 JSON（不加 markdown 代碼塊、不加說明文字），格式如下：',
      '{',
      '  "authors": [作者名陣列],',
      '  "illustrators": [繪者名陣列],',
      '  "translators": [譯者名陣列],',
      '  "publisher": "出版社名稱 或 null",',
      '  "distributor": "發行商名稱 或 null（≠ 進貨經銷商）",',
      '  "original_price": 定價數字(NTD) 或 null,',
      '  "summary_points": "主題類別、內容重點 200 字內"',
      '}',
      '規則：',
      '1. authors 要放所有貢獻文字內容的人：作者、主編、編者、合著者、選錄／收錄作家全部都算（選集的編者與被選錄作家都要列出）。繪者放 illustrators、譯者放 translators。',
      '2. 素材裡出現的作者名要「全部」列出，不可只挑代表性的幾個；選集若列了十幾位作家就十幾位都列。',
      '3. 人名只留純名字，去掉括號或頓號後的角色補述（如「呂美親（主編）」→「呂美親」）。',
      '4. publisher 與 original_price 一定要再三確認素材裡有沒有，有就一定要填，不要漏。',
      '5. 沒抓到的欄位給 null 或空陣列，不要硬編；嚴禁臆測。'
    ].join(NL);
    const aUser = '商品名稱:' + db07Name + NL + 'ISBN:' + (isbn || '(無)') + NL + NL + '採集素材:' + NL + material;
    analysisStr = await claude.call(this, aSys, aUser, 1200, 0);
    // 剝 markdown code block 包裝（如有）
    let jsonStr = analysisStr.trim();
    if (jsonStr.indexOf('\`\`\`') === 0) {
      const m = jsonStr.match(/\\{[\\s\\S]*\\}/);
      if (m) jsonStr = m[0];
    }
    try { extracted = Object.assign(extracted, JSON.parse(jsonStr)); } catch (e) {}
  }
} catch (e) { log.push('分析 claude err:' + e.message); }

// findbook meta 為權威來源：作者 + 出版社 覆寫 Claude 的猜測
const fbMeta = parseFindbookMeta(refPages);
if (fbMeta.authors.length) extracted.authors = fbMeta.authors;
if (fbMeta.publisher) extracted.publisher = fbMeta.publisher;
log.push('findbook meta: authors=' + fbMeta.authors.length + ' pub=' + (fbMeta.publisher || '-'));

// 寫入分析備註 + 庫存原價
const analysisNote = [
  '作者：' + (extracted.authors || []).join('、') + (extracted.illustrators && extracted.illustrators.length ? '；繪者：' + extracted.illustrators.join('、') : '') + (extracted.translators && extracted.translators.length ? '；譯者：' + extracted.translators.join('、') : ''),
  '出版社：' + (extracted.publisher || '未知') + (extracted.distributor ? '；發行：' + extracted.distributor : ''),
  '原價：' + (extracted.original_price != null ? extracted.original_price : '未知'),
  '重點：' + (extracted.summary_points || '未知')
].join(NL);

try {
  const patchProps = {
    '分析備註': { rich_text: [{ type: 'text', text: { content: clean(analysisNote).slice(0, 1900) } }] }
  };
  if (typeof extracted.original_price === 'number' && extracted.original_price > 0) {
    patchProps['庫存原價'] = { number: extracted.original_price };
  }
  await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), { properties: patchProps });
} catch (e) { log.push('分析 PATCH err:' + e.message); }

// ── 6. 解析作者 / 發行 → DB08 lookup-or-create ──
const personNames = []
  .concat(extracted.authors || [])
  .concat(extracted.illustrators || [])
  .concat(extracted.translators || []);
const partnerNames = []
  .concat(extracted.publisher ? [extracted.publisher] : [])
  .concat(extracted.distributor ? [extracted.distributor] : []);

const seenPerson = {};
const personIds = [];
for (const nm of personNames) {
  const norm = normalizeName(nm);
  if (!norm || seenPerson[norm]) continue;
  seenPerson[norm] = true;
  try {
    const id = await findOrCreateDB08.call(this, norm, 'person');
    if (id) personIds.push(id);
  } catch (e) {}
  await sleep(250);
}
const seenPartner = {};
const partnerIds = [];
for (const nm of partnerNames) {
  const norm = normalizeName(nm);
  if (!norm || seenPartner[norm]) continue;
  seenPartner[norm] = true;
  try {
    const id = await findOrCreateDB08.call(this, norm, 'partner');
    if (id) partnerIds.push(id);
  } catch (e) {}
  await sleep(250);
}

// 寫入對應作者 + 對應發行
try {
  const relProps = {};
  if (personIds.length) relProps['對應作者'] = { relation: personIds.map((id) => ({ id })) };
  if (partnerIds.length) relProps['對應發行'] = { relation: partnerIds.map((id) => ({ id })) };
  if (Object.keys(relProps).length) {
    await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), { properties: relProps });
  }
} catch (e) { log.push('relation PATCH err:' + e.message); }

// ── 7. 產品照片（從資料參考 上傳檔案 挑封面）──
let coverPicked = false;
try {
  const coverUrl = pickCoverUrl(refPages);
  if (coverUrl) {
    await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), {
      properties: { '產品照片': { files: [{ type: 'external', name: '封面', external: { url: coverUrl } }] } }
    });
    coverPicked = true;
  }
} catch (e) { log.push('產品照片 err:' + e.message); }

// 嗨嗨分析棒 工項標記
await markBat.call(this, gxByMode['分析'], '完成',
  '嗨嗨分析 完成。' +
  '作者' + personIds.length + '筆／' + '發行' + partnerIds.length + '筆／' +
  (typeof extracted.original_price === 'number' ? '原價=' + extracted.original_price : '原價未知') + '／' +
  (coverPicked ? '封面已上' : '封面未取') + '。素材 ' + materialLen + ' 字。'
);
log.push('分析 ok p=' + personIds.length + ' pub=' + partnerIds.length + ' price=' + (extracted.original_price || '?') + ' cover=' + coverPicked);

// ── 8. 嗨嗨聯想（DB07 對應標籤 traversal）──
try {
  const tagRel = (p['對應標籤'] && p['對應標籤'].relation) || [];
  if (!tagRel.length) {
    await markBat.call(this, gxByMode['聯想'], '完成', '嗨嗨聯想 DB07 無對應標籤,跳過。');
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
      ? '嗨嗨聯想 同標籤關聯商品 ' + related.length + ' 筆:' + related.slice(0,15).join('、')
      : '嗨嗨聯想 標籤池內無其他關聯商品。';
    await markBat.call(this, gxByMode['聯想'], '完成', note);
    log.push('聯想 related=' + related.length);
  }
} catch (e) {
  await markBat.call(this, gxByMode['聯想'], '完成', '嗨嗨聯想 失敗:' + e.message);
  log.push('聯想 err:' + e.message);
}

// ── 9. 嗨嗨文案（寫簡介摘要）──
let summary = '';
let wenanNote = '';
const insufficientNote = '⚠️ 資料不足:外部採集素材撐不起一段可信簡介,未撰寫(依鐵律不臆測)。請人工補資料後,將此工項 ai狀態 改回待執行重跑。';

if (materialLen < MIN_MATERIAL) {
  wenanNote = insufficientNote + '(素材僅 ' + materialLen + ' 字)';
  log.push('文案 skip thin=' + materialLen);
} else {
  try {
    const sys = [
      '你是 makesense(現思文化創藝有限公司,宜蘭在地文化事業,旗下旅人書店)的嗨嗨文案。',
      '為一件即將在 makesense.ink 上架的商品撰寫「簡介摘要」。',
      '',
      '== 鐵律 ==',
      '1. 字數目標 380 至 460 字(繁體中文,標點計入),不可超過 500、不可少於 320。',
      '2. 只能根據下方「分析重點」與「採集素材」撰寫,嚴禁杜撰素材中沒有的情節、得獎、推薦、評論。',
      '3. 直接寫簡介本文,不要開場白、不要標題、不要任何說明或前後綴。',
      '4. 語氣溫厚、有文化感,獨立書店選書調性,不要電商促銷腔。',
      '5. 若你判斷素材不足以寫出一段可信簡介,請「只回覆兩個字:不足」,不要解釋、不要嘗試撰寫。'
    ].join(NL);
    const userBase = [
      '商品名稱:' + db07Name,
      'ISBN／商品ID:' + (isbn || '(無)'),
      '',
      '分析重點:',
      clean(analysisNote) || '(無)',
      '',
      '採集素材:',
      material
    ].join(NL);
    let draft = await claude.call(this, sys, userBase + NL + NL + '請撰寫 380-460 字簡介摘要。', 1200);
    if (draft === '不足' || draft.length < 12 || isRefusal(draft)) {
      wenanNote = insufficientNote;
      log.push('文案 model-says-thin');
    } else {
      if (draft.length > 500 || draft.length < 320) {
        const redo = await claude.call(this, sys, userBase + NL + NL + '你前一稿字數為 ' + draft.length + ' 字,不符規範。請改寫成約 420 字(嚴格 380-460 字之間)。', 1200);
        if (redo && redo !== '不足' && !isRefusal(redo) && redo.length >= 12) draft = redo;
      }
      summary = draft;
      await notion.call(this, 'PATCH', '/pages/' + dash(db07Id), {
        properties: { '簡介摘要': { rich_text: [{ type: 'text', text: { content: summary.slice(0,2000) } }] } }
      });
      wenanNote = '嗨嗨文案 已產出簡介摘要(字數 ' + summary.length + '),已寫回 DB07。';
      log.push('文案 len=' + summary.length);
    }
  } catch (e) {
    wenanNote = '⚠️ 嗨嗨文案 Claude 連續失敗:' + e.message + '。簡介摘要留空,請重設此工項 ai狀態 待執行重跑。';
    log.push('文案 err:' + e.message);
  }
}
await markBat.call(this, gxByMode['文案'], '完成', wenanNote);

// ── 10. 嗨嗨檢核 ──
try {
  let verdict;
  if (!summary) verdict = '嗨嗨檢核 ⚠️ 無簡介摘要產出(資料不足或失敗),待人工處理。';
  else if (summary.length < 320) verdict = '嗨嗨檢核 ⚠️ 字數 ' + summary.length + ' 偏少,建議人工補寫。';
  else if (summary.length > 500) verdict = '嗨嗨檢核 ⚠️ 字數 ' + summary.length + ' 偏多,建議人工精簡。';
  else verdict = '嗨嗨檢核 ✅ 通過,字數 ' + summary.length + '。';
  // 附帶結構化結果摘要
  verdict += ' | 作者' + personIds.length + '／發行' + partnerIds.length + '／原價' + (extracted.original_price || '?') + '／封面' + (coverPicked ? '✓' : '✗');
  await markBat.call(this, gxByMode['檢核'], '完成', verdict);
  log.push(clean(verdict).slice(0,30));
} catch (e) { log.push('檢核 err:' + e.message); }

// ── 11. 自接力 ──
try {
  await this.helpers.httpRequest({ method: 'POST', url: SELF_URL, body: { chained: true }, json: true, timeout: 3000, returnFullResponse: true, ignoreHttpStatusErrors: true });
} catch (e) {}

return [{ json: {
  done: false,
  db07Id,
  db07Name,
  isbn,
  material_len: materialLen,
  summary_length: summary.length,
  authors_linked: personIds.length,
  publishers_linked: partnerIds.length,
  original_price: extracted.original_price,
  cover_picked: coverPicked,
  log
} }];
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
  output: [{
    done: false,
    db07Id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    db07Name: '範例書名',
    isbn: '9789860000000',
    material_len: 1200,
    summary_length: 420,
    authors_linked: 2,
    publishers_linked: 1,
    original_price: 500,
    cover_picked: true,
    log: ['搜查 created=8', '分析 ok p=2 pub=1 price=500 cover=true', '文案 len=420']
  }]
});

export default workflow('db07-batch-scheduler', 'DB07 無關卡批次調度器')
  .add(webhookTrigger)
  .to(scheduler);
