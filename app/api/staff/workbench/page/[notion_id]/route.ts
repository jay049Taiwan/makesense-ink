import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../../../_guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * GET /api/staff/workbench/page/:notion_id
 *
 * 取一個 Notion page 的「唯讀預覽」內容，給工作台動態 Tab 點選後彈窗用。
 * 回傳：
 *   - title: page 標題
 *   - properties: 主要 properties（人類可讀字串）
 *   - contentHtml: 內容 blocks → HTML（含內嵌 child_database 的表格 render）
 *   - notionUrl: 跳到 Notion 編輯的連結
 */
export async function GET(req: Request, { params }: { params: Promise<{ notion_id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const { notion_id } = await params;
  if (!notion_id) {
    return NextResponse.json({ error: "missing notion_id" }, { status: 400 });
  }

  // Notion API 接受帶 dash 跟不帶 dash 的 ID
  const pageId = notion_id;

  try {
    const page: any = await notion.pages.retrieve({ page_id: pageId });
    const title = extractPageTitle(page);
    const properties = formatProperties(page.properties || {});
    const contentHtml = await renderPageBlocks(pageId);
    return NextResponse.json({
      ok: true,
      title,
      properties,
      contentHtml,
      notionUrl: page.url || `https://notion.so/${notion_id.replace(/-/g, "")}`,
    });
  } catch (err: any) {
    console.error("[workbench/page] error:", err);
    return NextResponse.json({ error: err?.message || "fetch failed" }, { status: 500 });
  }
}

// ── Page properties → 人類可讀 list ───────────────────
type PropEntry = { name: string; value: string };

function formatProperties(props: Record<string, any>): PropEntry[] {
  const out: PropEntry[] = [];
  for (const [name, p] of Object.entries(props as Record<string, any>)) {
    const value = formatProperty(p);
    if (value) out.push({ name, value });
  }
  return out;
}

function formatProperty(p: any): string {
  if (!p) return "";
  switch (p.type) {
    case "title":
      return rich(p.title);
    case "rich_text":
      return rich(p.rich_text);
    case "number":
      return p.number != null ? String(p.number) : "";
    case "select":
      return p.select?.name || "";
    case "multi_select":
      return (p.multi_select || []).map((s: any) => s.name).join("、");
    case "status":
      return p.status?.name || "";
    case "date":
      if (!p.date?.start) return "";
      return p.date.end ? `${p.date.start} ~ ${p.date.end}` : p.date.start;
    case "people":
      return (p.people || []).map((u: any) => u.name || "").filter(Boolean).join("、");
    case "checkbox":
      return p.checkbox ? "✓" : "";
    case "url":
      return p.url || "";
    case "email":
      return p.email || "";
    case "phone_number":
      return p.phone_number || "";
    case "relation":
      return (p.relation || []).length > 0 ? `${p.relation.length} 筆關聯` : "";
    case "rollup":
      if (p.rollup?.type === "number" && p.rollup.number != null) return String(p.rollup.number);
      if (p.rollup?.type === "array") return `${p.rollup.array.length} 項`;
      return "";
    case "formula":
      return formulaValue(p.formula);
    case "files":
      return (p.files || []).length > 0 ? `${p.files.length} 個檔案` : "";
    case "created_time":
      return formatDate(p.created_time);
    case "last_edited_time":
      return formatDate(p.last_edited_time);
    case "created_by":
      return p.created_by?.name || "";
    case "last_edited_by":
      return p.last_edited_by?.name || "";
    case "unique_id":
      return p.unique_id ? `${p.unique_id.prefix || ""}${p.unique_id.number || ""}` : "";
    default:
      return "";
  }
}

function formulaValue(f: any): string {
  if (!f) return "";
  switch (f.type) {
    case "string": return f.string || "";
    case "number": return f.number != null ? String(f.number) : "";
    case "boolean": return f.boolean ? "✓" : "";
    case "date": return f.date?.start || "";
    default: return "";
  }
}

function rich(rt: any[] | undefined): string {
  if (!rt || !Array.isArray(rt)) return "";
  return rt.map((t) => t.plain_text || "").join("");
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

// ── Page blocks → HTML（含 child_database 表格 render）─
async function renderPageBlocks(pageId: string): Promise<string> {
  const blocks = await fetchAllBlocks(pageId);
  return await blocksToHtml(blocks);
}

async function fetchAllBlocks(blockId: string, depth = 0): Promise<any[]> {
  if (depth > 3) return [];  // 安全：最多 3 層巢狀
  const out: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const block of res.results) {
      out.push(block);
      // 遞迴抓有子 blocks 的（toggle、quote、callout、column_list、column 等）
      if (block.has_children && shouldRecurse(block.type)) {
        const children = await fetchAllBlocks(block.id, depth + 1);
        block._children = children;
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

function shouldRecurse(type: string): boolean {
  return ["toggle", "callout", "quote", "column_list", "column", "synced_block",
    "bulleted_list_item", "numbered_list_item", "to_do"].includes(type);
}

async function blocksToHtml(blocks: any[]): Promise<string> {
  const parts: string[] = [];
  for (const block of blocks) {
    parts.push(await blockToHtmlAsync(block));
  }
  // 合併相鄰的 list items
  return mergeListItems(parts.filter(Boolean));
}

async function blockToHtmlAsync(block: any): Promise<string> {
  const type = block.type;
  if (!type) return "";

  switch (type) {
    case "paragraph": {
      const html = richToHtml(block.paragraph?.rich_text);
      return html ? `<p>${html}</p>` : "<p>&nbsp;</p>";
    }
    case "heading_1":
      return `<h2>${richToHtml(block.heading_1?.rich_text)}</h2>`;
    case "heading_2":
      return `<h3>${richToHtml(block.heading_2?.rich_text)}</h3>`;
    case "heading_3":
      return `<h4>${richToHtml(block.heading_3?.rich_text)}</h4>`;
    case "bulleted_list_item":
      return `<li-bullet>${richToHtml(block.bulleted_list_item?.rich_text)}${await childrenHtml(block)}</li-bullet>`;
    case "numbered_list_item":
      return `<li-number>${richToHtml(block.numbered_list_item?.rich_text)}${await childrenHtml(block)}</li-number>`;
    case "to_do": {
      const checked = block.to_do?.checked ? "checked" : "";
      return `<div class="todo"><input type="checkbox" disabled ${checked} /> ${richToHtml(block.to_do?.rich_text)}</div>`;
    }
    case "quote":
      return `<blockquote>${richToHtml(block.quote?.rich_text)}${await childrenHtml(block)}</blockquote>`;
    case "callout": {
      const icon = block.callout?.icon?.emoji || "💡";
      return `<div class="callout"><span class="callout-icon">${icon}</span> <div class="callout-body">${richToHtml(block.callout?.rich_text)}${await childrenHtml(block)}</div></div>`;
    }
    case "divider":
      return "<hr />";
    case "image": {
      const url = block.image?.file?.url || block.image?.external?.url || "";
      const caption = richToHtml(block.image?.caption) || "";
      return url ? `<figure><img src="${url}" alt="${caption}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>` : "";
    }
    case "toggle":
      return `<details><summary>${richToHtml(block.toggle?.rich_text)}</summary>${await childrenHtml(block)}</details>`;
    case "code":
      return `<pre><code>${richToHtml(block.code?.rich_text)}</code></pre>`;
    case "bookmark":
    case "link_preview": {
      const url = block.bookmark?.url || block.link_preview?.url || "";
      return url ? `<p><a href="${url}" target="_blank" rel="noopener">${escapeHtml(url)}</a></p>` : "";
    }
    case "embed": {
      const url = block.embed?.url || "";
      return url ? `<div class="embed"><iframe src="${url}" loading="lazy"></iframe></div>` : "";
    }
    case "video": {
      const url = block.video?.file?.url || block.video?.external?.url || "";
      return url ? `<video src="${url}" controls style="max-width:100%"></video>` : "";
    }
    case "file": {
      const url = block.file?.file?.url || block.file?.external?.url || "";
      const name = rich(block.file?.caption) || "下載檔案";
      return url ? `<p>📎 <a href="${url}" target="_blank" rel="noopener">${escapeHtml(name)}</a></p>` : "";
    }
    case "table":
      // table block 自己有 children = table_row blocks
      return await renderTableBlock(block);
    case "column_list":
      return `<div class="column-list">${await childrenHtml(block)}</div>`;
    case "column":
      return `<div class="column">${await childrenHtml(block)}</div>`;
    case "child_database":
      return await renderChildDatabase(block);
    case "child_page":
      return `<p>📄 子頁面：${escapeHtml(block.child_page?.title || "")}</p>`;
    case "synced_block":
      return await childrenHtml(block);
    default:
      return "";
  }
}

async function childrenHtml(block: any): Promise<string> {
  if (!block._children || block._children.length === 0) return "";
  return await blocksToHtml(block._children);
}

// ── Table block render ──────────────────────────────
async function renderTableBlock(block: any): Promise<string> {
  if (!block._children) return "";
  const rows = block._children.filter((b: any) => b.type === "table_row");
  if (rows.length === 0) return "";
  const hasHeader = block.table?.has_column_header;
  const html = ["<table class='notion-table'>"];
  rows.forEach((row: any, idx: number) => {
    const cells = (row.table_row?.cells || []).map((cell: any[]) => richToHtml(cell));
    if (idx === 0 && hasHeader) {
      html.push("<thead><tr>");
      cells.forEach((c: string) => html.push(`<th>${c}</th>`));
      html.push("</tr></thead><tbody>");
    } else {
      html.push("<tr>");
      cells.forEach((c: string) => html.push(`<td>${c}</td>`));
      html.push("</tr>");
    }
  });
  if (hasHeader) html.push("</tbody>");
  html.push("</table>");
  return html.join("");
}

// ── Child database (內嵌 DB view) → HTML 表格 ─────────
async function renderChildDatabase(block: any): Promise<string> {
  const dbId = block.id;  // child_database 的 block.id 就是 database id
  const title = block.child_database?.title || "（資料庫）";
  try {
    // 1. 拿 data_source_id（Notion API v5 把 db 跟 data_source 拆開了）
    let dsId: string | null = null;
    try {
      const dsList: any = await notion.dataSources.list({ database_id: dbId });
      dsId = dsList.data_sources?.[0]?.id || null;
    } catch {
      // fallback: 嘗試直接用 dbId 當 data_source_id
      dsId = dbId;
    }
    if (!dsId) {
      return `<div class="notion-childdb"><p class="notion-childdb-title">📊 ${escapeHtml(title)}</p><p class="text-xs">（無法載入資料）</p></div>`;
    }

    // 2. Query 該 DB 的前 20 筆
    const res: any = await notion.dataSources.query({
      data_source_id: dsId,
      page_size: 20,
    });
    const records: any[] = res.results || [];
    if (records.length === 0) {
      return `<div class="notion-childdb"><p class="notion-childdb-title">📊 ${escapeHtml(title)}</p><p class="text-xs">（無資料）</p></div>`;
    }

    // 3. 找出有用的欄位（title + 前幾個 select/status/date/number）
    const sample = records[0].properties || {};
    const titleField = Object.keys(sample).find(k => sample[k]?.type === "title") || "";
    const otherFields = Object.keys(sample)
      .filter(k => k !== titleField)
      .filter(k => ["select", "status", "multi_select", "date", "number", "people", "checkbox"].includes(sample[k]?.type))
      .slice(0, 4);  // 最多顯示 4 個其他欄位
    const cols = titleField ? [titleField, ...otherFields] : otherFields;

    // 4. Render 成 HTML table
    const html = [`<div class="notion-childdb">`];
    html.push(`<p class="notion-childdb-title">📊 ${escapeHtml(title)} <span class="text-xs">（${records.length} 筆）</span></p>`);
    html.push(`<table class="notion-table">`);
    html.push("<thead><tr>");
    for (const c of cols) html.push(`<th>${escapeHtml(c)}</th>`);
    html.push("</tr></thead><tbody>");
    for (const rec of records) {
      const props = rec.properties || {};
      html.push("<tr>");
      for (const c of cols) {
        const cellHtml = formatProperty(props[c]) || "—";
        html.push(`<td>${escapeHtml(cellHtml)}</td>`);
      }
      html.push("</tr>");
    }
    html.push("</tbody></table>");
    if (res.has_more) {
      html.push(`<p class="text-xs notion-childdb-more">… 還有更多（顯示前 20 筆）</p>`);
    }
    html.push("</div>");
    return html.join("");
  } catch (err: any) {
    console.error("[renderChildDatabase] failed:", err?.message);
    return `<div class="notion-childdb"><p class="notion-childdb-title">📊 ${escapeHtml(title)}</p><p class="text-xs">（載入失敗：${escapeHtml(err?.message || "未知")}）</p></div>`;
  }
}

// ── Helpers ─────────────────────────────────────────
function richToHtml(rt: any[] | undefined): string {
  if (!rt || !Array.isArray(rt)) return "";
  return rt.map((t) => {
    let text = escapeHtml(t.plain_text || "");
    text = text.replace(/\n/g, "<br>");
    if (t.annotations?.bold) text = `<strong>${text}</strong>`;
    if (t.annotations?.italic) text = `<em>${text}</em>`;
    if (t.annotations?.strikethrough) text = `<del>${text}</del>`;
    if (t.annotations?.underline) text = `<u>${text}</u>`;
    if (t.annotations?.code) text = `<code>${text}</code>`;
    if (t.href) text = `<a href="${t.href}" target="_blank" rel="noopener">${text}</a>`;
    return text;
  }).join("");
}

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function extractPageTitle(page: any): string {
  const props = page.properties || {};
  for (const [_name, p] of Object.entries(props as Record<string, any>)) {
    if (p?.type === "title") {
      return rich(p.title);
    }
  }
  return "（未命名）";
}

function mergeListItems(parts: string[]): string {
  const merged: string[] = [];
  let buf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const flush = () => {
    if (buf.length > 0 && listType) {
      merged.push(`<${listType}>${buf.join("")}</${listType}>`);
      buf = [];
      listType = null;
    }
  };
  for (const html of parts) {
    if (html.startsWith("<li-bullet>")) {
      if (listType === "ol") flush();
      listType = "ul";
      buf.push(html.replace("<li-bullet>", "<li>").replace("</li-bullet>", "</li>"));
    } else if (html.startsWith("<li-number>")) {
      if (listType === "ul") flush();
      listType = "ol";
      buf.push(html.replace("<li-number>", "<li>").replace("</li-number>", "</li>"));
    } else {
      flush();
      merged.push(html);
    }
  }
  flush();
  return merged.join("\n");
}
