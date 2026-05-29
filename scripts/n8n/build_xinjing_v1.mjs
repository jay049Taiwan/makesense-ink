const N8N_URL=(process.env.N8N_URL||'https://makesense.zeabur.app').replace(/\/$/,'');
const API_KEY=process.env.N8N_API_KEY;
if(!API_KEY){ console.error('✗ 缺 N8N_API_KEY'); process.exit(1); }
const h={'X-N8N-API-KEY':API_KEY,'accept':'application/json','content-type':'application/json'};
const uuid=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;const v=c==='x'?r:(r&0x3|0x8);return v.toString(16);});

const xinjingCode = String.raw`
const NH = {
  'Authorization': 'Bearer ' + $env.NOTION_INTEGRATION_TOKEN,
  'Notion-Version': '2025-09-03',
  'Content-Type': 'application/json'
};
const TG_TOKEN = $env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = '8523155253';
const FOUR9 = '2ab21aee-3b46-4f89-a245-d1b9e7c4f3f3';
const DB06 = 'a809ff25-fdab-8236-b491-87496d236ac9';
const DB09 = '6547375e-ff14-4f24-ab0f-9f2a223a8580';
const DBS = [
  { id: '722f2478-7e61-4b4b-ad1c-d171b4a639db', name: 'DB01 資源提案', rel: '對應提案' },
  { id: 'c286e19b-9cf8-422b-8628-98b6d116040c', name: 'DB02 績效管考', rel: '對應管考' },
  { id: '968b23ea-da1f-4381-bd9a-253ee80b0656', name: 'DB03 項目進度', rel: '對應項目' },
  { id: '5ad63416-a7c5-4d84-812e-cddf56c8bc01', name: 'DB04 協作交接', rel: '對應協作' },
  { id: '28a667a9-ede1-466a-9f18-419da33a8810', name: 'DB05 登記內容', rel: '對應內容' },
  { id: '0f5a87d4-d1df-4271-ba00-2abfee01693d', name: 'DB07 庫存控管', rel: '對應庫存' },
  { id: '6934a808-b79b-4446-98dd-f699476408a0', name: 'DB08 關係對象', rel: '對應對象' }
];
const now = new Date();
const tpHour = parseInt(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'numeric',hour12:false}).format(now),10);
const tpTimeStr = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).formatToParts(now);
const yr = parts.find(p=>p.type==='year').value;
const mo = parts.find(p=>p.type==='month').value;
const dy = parts.find(p=>p.type==='day').value;
const todayISO = yr+'-'+mo+'-'+dy;
const MODE = tpHour < 12 ? 'overdue' : 'today-due';

const getTitle = (page) => {
  for (const v of Object.values(page.properties||{})) {
    if (v.type === 'title') return (v.title||[]).map(t=>t.plain_text).join('') || '(未命名)';
  }
  return '(未命名)';
};
const getDue = (page) => {
  const d1 = page.properties['截止時間'] && page.properties['截止時間'].date && page.properties['截止時間'].date.start;
  const d2 = page.properties['執行時間'] && page.properties['執行時間'].date && page.properties['執行時間'].date.start;
  return d1 || d2 || null;
};
const daysAgo = (s) => { if(!s) return 0; const tgt = new Date(s+'T00:00:00+08:00'); const t = new Date(todayISO+'T00:00:00+08:00'); return Math.floor((t-tgt)/86400000); };

// 1) 取或建今日 DB09 Day page
let dayId;
try {
  const r = await this.helpers.httpRequest({
    method:'POST', url:'https://api.notion.com/v1/data_sources/'+DB09+'/query', headers:NH,
    body:{ filter:{ and:[
      { property:'紀錄類型', select:{ equals:'Day' } },
      { property:'範圍日期', date:{ equals: todayISO } }
    ]}, page_size:1 }, json:true
  });
  if (r.results && r.results.length>0) { dayId = r.results[0].id; }
  else {
    const c = await this.helpers.httpRequest({
      method:'POST', url:'https://api.notion.com/v1/pages', headers:NH,
      body:{ parent:{ data_source_id: DB09 }, properties:{
        '紀錄名稱': { title:[{ text:{ content: todayISO+' Day' } }] },
        '紀錄類型': { select:{ name:'Day' } },
        '範圍日期': { date:{ start: todayISO } }
      } }, json:true
    });
    dayId = c.id;
  }
} catch(e) {
  await this.helpers.httpRequest({ method:'POST', url:'https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage', body:{ chat_id:TG_CHAT, text:'⚠️ 神經 WF 抓今日 DB09 page 失敗：'+(e.message||e) }, json:true }).catch(()=>{});
  return [{ json:{ error:'db09 fetch failed' } }];
}

// 2) 對 7 個 DB query
const filter = {
  and: [
    { property:'執行狀態', status:{ does_not_equal:'完成' } },
    MODE === 'overdue' ? {
      or: [
        { property:'截止時間', date:{ before: todayISO } },
        { and:[
          { property:'截止時間', date:{ is_empty:true } },
          { property:'執行時間', date:{ before: todayISO } }
        ]}
      ]
    } : {
      or: [
        { property:'截止時間', date:{ equals: todayISO } },
        { and:[
          { property:'截止時間', date:{ is_empty:true } },
          { property:'執行時間', date:{ equals: todayISO } }
        ]}
      ]
    }
  ]
};
const items = [];
for (const db of DBS) {
  let cursor; let safety=0;
  do {
    safety++; if(safety>10) break;
    try {
      const r = await this.helpers.httpRequest({
        method:'POST', url:'https://api.notion.com/v1/data_sources/'+db.id+'/query', headers:NH,
        body:{ filter, page_size:100, start_cursor: cursor||undefined }, json:true
      });
      for (const p of (r.results||[])) items.push({ pageId:p.id, db, title:getTitle(p), due:getDue(p) });
      cursor = r.has_more ? r.next_cursor : null;
    } catch(e) { cursor = null; }
  } while(cursor);
}

// 3) 對每筆 → 查 DB06 既有提醒通知 → 沒有就建
const results = [];
for (const it of items) {
  let existed = false;
  try {
    const ex = await this.helpers.httpRequest({
      method:'POST', url:'https://api.notion.com/v1/data_sources/'+DB06+'/query', headers:NH,
      body:{ filter:{ and:[
        { property:'步驟選項', select:{ equals:'提醒通知' } },
        { property: it.db.rel, relation:{ contains: it.pageId } }
      ]}, page_size:1 }, json:true
    });
    existed = !!(ex.results && ex.results.length>0);
  } catch(e) {}
  const days = daysAgo(it.due);
  if (!existed) {
    const titleText = (MODE==='overdue' ? '🔴 逾期 '+days+' 天: ' : '⏰ 今日到期: ') + it.title;
    const props = {
      '明細名稱': { title:[{ text:{ content: titleText.slice(0,200) } }] },
      '步驟選項': { select:{ name:'提醒通知' } },
      '責任執行': { people:[{ id: FOUR9 }] },
      '對應日期': { relation:[{ id: dayId }] }
    };
    props[it.db.rel] = { relation:[{ id: it.pageId }] };
    try {
      await this.helpers.httpRequest({
        method:'POST', url:'https://api.notion.com/v1/pages', headers:NH,
        body:{ parent:{ data_source_id: DB06 }, properties: props }, json:true
      });
    } catch(e) {}
  }
  results.push({ db: it.db.name, dbShort: it.db.name.split(' ')[0], pageId: it.pageId, title: it.title, days, existed });
}

// 4) log 進今日 DB09 page body
if (results.length > 0) {
  const heading = (MODE==='overdue' ? '🌅 神經晨報 ' : '🌆 神經晚提醒 ') + tpTimeStr;
  const children = [{ object:'block', type:'heading_3', heading_3:{ rich_text:[{ type:'text', text:{ content: heading } }] } }];
  for (const r of results) {
    const mark = MODE==='overdue' ? '🔴 逾期 '+r.days+' 天' : '⏰ 今日到期';
    const tag = r.existed ? '(既有提醒)' : '(新建提醒)';
    const line = tpTimeStr + ' | ' + r.dbShort + ' | ' + r.title + ' | ' + mark + ' ' + tag;
    children.push({ object:'block', type:'paragraph', paragraph:{ rich_text:[
      { type:'text', text:{ content: line.slice(0,1900) } },
      { type:'text', text:{ content:'  ↗', link:{ url:'https://www.notion.so/'+r.pageId.replace(/-/g,'') } } }
    ] } });
  }
  try {
    await this.helpers.httpRequest({
      method:'PATCH', url:'https://api.notion.com/v1/blocks/'+dayId+'/children', headers:NH,
      body:{ children }, json:true
    });
  } catch(e) {}
}

// 5) Telegram
let tgText;
if (results.length > 0) {
  const lead = MODE==='overdue' ? '📛 早安！以下 '+results.length+' 筆已逾期需處理：' : '⏰ 晚提醒！以下 '+results.length+' 筆今日到期還沒完成：';
  const lines = results.slice(0,30).map(r => '• ['+r.dbShort+'] '+r.title + (MODE==='overdue' ? ' (逾期 '+r.days+' 天)' : ''));
  tgText = lead + '\n\n' + lines.join('\n');
  if (results.length > 30) tgText += '\n…還有 '+(results.length-30)+' 筆未列出';
} else {
  tgText = MODE==='overdue' ? '🌅 早安！沒有逾期事項，加油 ✨' : '🌆 今天到期的都搞定了，辛苦 ✨';
}
try {
  await this.helpers.httpRequest({
    method:'POST', url:'https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',
    body:{ chat_id: TG_CHAT, text: tgText, disable_web_page_preview:true }, json:true
  });
} catch(e) {}

return [{ json:{ mode: MODE, count: results.length, dayId } }];
`;

const wf = {
  name: '嗨嗨檢核 神經 v1',
  nodes: [
    { id: uuid(), name: '排程 08:30 / 17:30', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0,0],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '30 8,17 * * *' }] } } },
    { id: uuid(), name: '神經邏輯', type: 'n8n-nodes-base.code', typeVersion: 2, position: [260,0],
      parameters: { jsCode: xinjingCode } }
  ],
  connections: {
    '排程 08:30 / 17:30': { main: [[{ node:'神經邏輯', type:'main', index:0 }]] }
  },
  settings: { executionOrder:'v1', timezone:'Asia/Taipei' }
};

(async()=>{
  // 砍掉同名舊版(若有)
  const list=await (await fetch(`${N8N_URL}/api/v1/workflows?limit=100`,{headers:h})).json();
  for(const w of (list.data||[])){
    if((w.name||'') === wf.name){
      try{ await fetch(`${N8N_URL}/api/v1/workflows/${w.id}/deactivate`,{method:'POST',headers:h}); }catch(e){}
      try{ const d=await fetch(`${N8N_URL}/api/v1/workflows/${w.id}`,{method:'DELETE',headers:h}); console.log('🗑  刪舊 WF:',w.id,d.status); }catch(e){}
    }
  }
  let r=await fetch(`${N8N_URL}/api/v1/workflows`,{method:'POST',headers:h,body:JSON.stringify(wf)});
  let j=await r.json();
  if(!r.ok){ console.error('✗ 建立失敗',r.status,JSON.stringify(j).slice(0,800)); process.exit(1); }
  const id=j.id;
  console.log('✅ 建立成功:',id,j.name);
  r=await fetch(`${N8N_URL}/api/v1/workflows/${id}/activate`,{method:'POST',headers:h});
  if(!r.ok){ const t=await r.text(); console.error('✗ 啟用失敗',r.status,t.slice(0,500)); process.exit(1); }
  console.log('✅ 已啟用,排程:每天 08:30 / 17:30 (Asia/Taipei)');
})().catch(e=>{ console.error('✗',e.message); process.exit(1); });
