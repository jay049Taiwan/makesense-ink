// 修正 嗨嗨構想 時事補充 v1 的節點 bug
// 1. 建 DB06 明細：HTTP Request body 不送問題 → 改 Code 節點
// 2. 順便修 data_source_id → database_id（Notion 官方 API 格式）
// 3. 更新執行備註（若為 HTTP Request）→ 改 Code 節點
// 用法：N8N_API_KEY=xxx node scripts/n8n/fix_idea_context_nodes.mjs

const N8N = 'https://makesense.zeabur.app/api/v1';
const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('缺 N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const NAME = '嗨嗨構想 時事補充 v1';

// 找工作流
const r = await fetch(N8N + '/workflows?limit=250', { headers: H });
const raw = await r.json();
if (!r.ok) { console.error('API 錯誤', r.status, JSON.stringify(raw)); process.exit(1); }
const allWfs = raw.data || [];
const wf = allWfs.find(w => w.name === NAME);
if (!wf) {
  console.error(`找不到「${NAME}」（共 ${allWfs.length} 個 WF）`);
  console.log('\n現有 workflows:');
  for (const w of allWfs) console.log(`  [${w.id}] ${w.name}  active=${w.active}`);
  if (allWfs.length === 0) console.log('  （清單空，請確認 N8N_API_KEY 是否正確）');
  process.exit(1);
}
console.log(`找到 WF: ${wf.id}  ${NAME}`);

// 取完整 JSON
const fr = await fetch(N8N + `/workflows/${wf.id}`, { headers: H });
if (!fr.ok) { console.error('取 WF 失敗:', fr.status, await fr.text()); process.exit(1); }
const fullWf = await fr.json();

// 印出所有節點，方便確認
console.log('現有節點:');
for (const n of fullWf.nodes) console.log(`  [${n.id}] ${n.name}  type=${n.type}`);

// ── 替換「建 DB06 明細」──
const buildDb06Code = `
const pageBody = $json.pageBody;
const token = $env.NOTION_INTEGRATION_TOKEN;
if (!token) throw new Error('缺 NOTION_INTEGRATION_TOKEN');
if (!pageBody) throw new Error('缺 pageBody');

// 官方 API 用 parent.database_id，不用 data_source_id
const body = JSON.parse(JSON.stringify(pageBody));
if (body.parent?.data_source_id && !body.parent?.database_id) {
  body.parent.database_id = body.parent.data_source_id;
  delete body.parent.data_source_id;
}

const resp = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.notion.com/v1/pages',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: body,
  json: true,
});

return [{ json: { ...($input.first().json), createdPageId: resp.id, createdPageUrl: resp.url } }];
`.trim();

// ── 替換「更新執行備註」（如為 HTTP Request）──
const patchNoteCode = `
const pageId = $json.trigger_page_id;
const richText = $json.rich_text;
const token = $env.NOTION_INTEGRATION_TOKEN;
if (!token) throw new Error('缺 NOTION_INTEGRATION_TOKEN');
if (!pageId) throw new Error('缺 trigger_page_id');

await this.helpers.httpRequest({
  method: 'PATCH',
  url: 'https://api.notion.com/v1/pages/' + pageId,
  headers: {
    'Authorization': 'Bearer ' + token,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: { properties: { '執行備註': { rich_text: richText } } },
  json: true,
});

return [{ json: { updated: true, trigger_page_id: pageId } }];
`.trim();

let changed = 0;
for (const node of fullWf.nodes) {
  if (node.name === '建 DB06 明細' && node.type === 'n8n-nodes-base.httpRequest') {
    console.log(`\n🔧 替換「建 DB06 明細」: ${node.id}`);
    node.type = 'n8n-nodes-base.code';
    node.typeVersion = 2;
    node.parameters = { language: 'javaScript', jsCode: buildDb06Code };
    changed++;
  }
  if (node.name === '更新執行備註' && node.type === 'n8n-nodes-base.httpRequest') {
    console.log(`\n🔧 替換「更新執行備註」: ${node.id}`);
    node.type = 'n8n-nodes-base.code';
    node.typeVersion = 2;
    node.parameters = { language: 'javaScript', jsCode: patchNoteCode };
    changed++;
  }
}

if (changed === 0) {
  console.log('\n⚠️  沒有找到需要替換的 HTTP Request 節點（可能已是 Code 節點，或名稱不同）');
  console.log('請手動確認節點名稱並視需要修改本腳本的 node.name 判斷條件');
  process.exit(0);
}

// 更新工作流
const wasActive = fullWf.active;
if (wasActive) {
  await fetch(`${N8N}/workflows/${wf.id}/deactivate`, { method: 'POST', headers: H });
  console.log('暫停 WF...');
}

const ur = await fetch(N8N + `/workflows/${wf.id}`, {
  method: 'PUT',
  headers: H,
  body: JSON.stringify(fullWf),
});
if (!ur.ok) { console.error('更新失敗:', ur.status, await ur.text()); process.exit(1); }
console.log(`\n✅ 成功替換 ${changed} 個節點`);

if (wasActive) {
  await fetch(`${N8N}/workflows/${wf.id}/activate`, { method: 'POST', headers: H });
  console.log('重新啟動 WF ✓');
}
