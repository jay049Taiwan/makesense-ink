import { Client } from "@notionhq/client";

// Notion client singleton
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  timeoutMs: 120_000, // 2 分鐘，大量分頁查詢需要更長時間
});

// Database IDs from environment
export const DB = {
  DB01_RESOURCE: process.env.NOTION_DB01_RESOURCE!,
  DB02_PERFORMANCE: process.env.NOTION_DB02_PERFORMANCE!,
  DB03_PROGRESS: process.env.NOTION_DB03_PROGRESS!,
  DB04_COLLABORATION: process.env.NOTION_DB04_COLLABORATION!,
  DB05_REGISTRATION: process.env.NOTION_DB05_REGISTRATION!,
  DB06_TRANSACTION: process.env.NOTION_DB06_TRANSACTION!,
  DB07_INVENTORY: process.env.NOTION_DB07_INVENTORY!,
  DB08_RELATIONSHIP: process.env.NOTION_DB08_RELATIONSHIP!,
  DB09_DATE_RANGE: process.env.NOTION_DB09_DATE_RANGE!,
} as const;

// Query a Notion database with optional filter and sorts
// Note: In @notionhq/client v5, query moved from databases to dataSources
export async function queryDatabase(
  databaseId: string,
  filter?: object,
  sorts?: object[],
  pageSize: number = 100
) {
  const allResults: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    let response: any;
    // 最多重試 3 次，遇到 502/504/429/timeout 時指數退避重試
    const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await notion.dataSources.query({
          data_source_id: databaseId,
          filter: filter as any,
          sorts: sorts as any,
          page_size: pageSize,
          ...(cursor ? { start_cursor: cursor } : {}),
        });
        break; // 成功，跳出重試
      } catch (err: any) {
        const status = err?.status || err?.code;
        const isRetryable = status === 502 || status === 504 || status === 429 ||
          err?.code === "notionhq_client_request_timeout";
        if (isRetryable && attempt < 2) {
          const wait = RETRY_DELAYS[attempt];
          console.warn(`[notion] queryDatabase retry ${attempt + 1}/3 for db ${databaseId.slice(0, 8)}... — waiting ${wait / 1000}s (status: ${status || err.code})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.error(`[notion] queryDatabase failed after ${attempt + 1} attempts for db ${databaseId.slice(0, 8)}... (status: ${status || err.code})`);
        throw err;
      }
    }
    allResults.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
    // 分頁間短暫延遲，避免觸發限流
    if (cursor) await new Promise(r => setTimeout(r, 200));
  } while (cursor);

  return allResults;
}

// Get a single page by ID
export async function getPage(pageId: string) {
  return notion.pages.retrieve({ page_id: pageId });
}

// Create a page in a database
export async function createPage(
  databaseId: string,
  properties: Record<string, any>
) {
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

// Update a page's properties
export async function updatePage(
  pageId: string,
  properties: Record<string, any>
) {
  return notion.pages.update({
    page_id: pageId,
    properties,
  });
}

// Helper: extract plain text from a Notion rich_text property
export function extractText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text).join("");
}

// Helper: extract title from a Notion title property
export function extractTitle(titleProp: any[]): string {
  return extractText(titleProp);
}

// Helper: extract select value
export function extractSelect(selectProp: any): string | null {
  return selectProp?.name ?? null;
}

// Helper: extract multi-select values
export function extractMultiSelect(multiSelectProp: any[]): string[] {
  if (!multiSelectProp || !Array.isArray(multiSelectProp)) return [];
  return multiSelectProp.map((item) => item.name);
}

// Helper: extract date
export function extractDate(dateProp: any): {
  start: string | null;
  end: string | null;
} {
  if (!dateProp) return { start: null, end: null };
  return { start: dateProp.start, end: dateProp.end };
}

// Helper: extract relation IDs
export function extractRelation(relationProp: any[]): string[] {
  if (!relationProp || !Array.isArray(relationProp)) return [];
  return relationProp.map((item) => item.id);
}

// Helper: extract number
export function extractNumber(numberProp: any): number | null {
  return numberProp ?? null;
}

// Helper: extract checkbox
export function extractCheckbox(checkboxProp: any): boolean {
  return checkboxProp ?? false;
}

// Helper: extract URL
export function extractUrl(urlProp: any): string | null {
  return urlProp ?? null;
}

// Helper: extract status
export function extractStatus(statusProp: any): string | null {
  return statusProp?.name ?? null;
}

// ── 讀取頁面內容（blocks → HTML）──
export async function getPageContent(pageId: string): Promise<string> {
  const blocks: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res: any = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // 轉換每個 block，然後合併相鄰的列表項
  const rawHtml = blocks.map(blockToHtml).filter(Boolean);

  // 把相鄰的 <li> 包上 <ul> 或 <ol>
  const merged: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  for (const html of rawHtml) {
    if (html.startsWith("<li-bullet>")) {
      if (listType === "ol") { merged.push(`<ol>${listBuffer.join("")}</ol>`); listBuffer = []; }
      listType = "ul";
      listBuffer.push(html.replace("<li-bullet>", "<li>").replace("</li-bullet>", "</li>"));
    } else if (html.startsWith("<li-number>")) {
      if (listType === "ul") { merged.push(`<ul>${listBuffer.join("")}</ul>`); listBuffer = []; }
      listType = "ol";
      listBuffer.push(html.replace("<li-number>", "<li>").replace("</li-number>", "</li>"));
    } else {
      if (listBuffer.length > 0) {
        merged.push(`<${listType}>${listBuffer.join("")}</${listType}>`);
        listBuffer = [];
        listType = null;
      }
      merged.push(html);
    }
  }
  if (listBuffer.length > 0) {
    merged.push(`<${listType}>${listBuffer.join("")}</${listType}>`);
  }

  return merged.join("\n");
}

function richTextToHtml(rt: any[]): string {
  if (!rt || !Array.isArray(rt)) return "";
  return rt.map((t) => {
    let text = t.plain_text || "";
    // 轉義 HTML
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // 換行轉 <br>
    text = text.replace(/\n/g, "<br>");
    if (t.annotations?.bold) text = `<strong>${text}</strong>`;
    if (t.annotations?.italic) text = `<em>${text}</em>`;
    if (t.annotations?.strikethrough) text = `<del>${text}</del>`;
    if (t.annotations?.code) text = `<code>${text}</code>`;
    if (t.href) text = `<a href="${t.href}" target="_blank" rel="noopener">${text}</a>`;
    return text;
  }).join("");
}

function blockToHtml(block: any): string {
  const type = block.type;
  if (!type) return "";

  switch (type) {
    case "paragraph": {
      const html = richTextToHtml(block.paragraph?.rich_text);
      return html ? `<p>${html}</p>` : "";  // 跳過空段落
    }
    case "heading_1":
      return `<h2>${richTextToHtml(block.heading_1?.rich_text)}</h2>`;
    case "heading_2":
      return `<h3>${richTextToHtml(block.heading_2?.rich_text)}</h3>`;
    case "heading_3":
      return `<h4>${richTextToHtml(block.heading_3?.rich_text)}</h4>`;
    case "bulleted_list_item":
      return `<li-bullet>${richTextToHtml(block.bulleted_list_item?.rich_text)}</li-bullet>`;
    case "numbered_list_item":
      return `<li-number>${richTextToHtml(block.numbered_list_item?.rich_text)}</li-number>`;
    case "quote":
      return `<blockquote>${richTextToHtml(block.quote?.rich_text)}</blockquote>`;
    case "callout": {
      const icon = block.callout?.icon?.emoji || "💡";
      return `<div class="callout"><span class="callout-icon">${icon}</span> ${richTextToHtml(block.callout?.rich_text)}</div>`;
    }
    case "divider":
      return "<hr />";
    case "image": {
      const url = block.image?.file?.url || block.image?.external?.url || "";
      const caption = richTextToHtml(block.image?.caption) || "";
      return url ? `<figure><img src="${url}" alt="${caption}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>` : "";
    }
    case "toggle":
      return `<details><summary>${richTextToHtml(block.toggle?.rich_text)}</summary></details>`;
    case "code":
      return `<pre><code>${richTextToHtml(block.code?.rich_text)}</code></pre>`;
    case "bookmark": {
      const bookmarkUrl = block.bookmark?.url || "";
      return bookmarkUrl ? `<p><a href="${bookmarkUrl}" target="_blank" rel="noopener">${bookmarkUrl}</a></p>` : "";
    }
    case "embed": {
      const embedUrl = block.embed?.url || "";
      return embedUrl ? `<p><a href="${embedUrl}" target="_blank" rel="noopener">${embedUrl}</a></p>` : "";
    }
    case "video": {
      const videoUrl = block.video?.external?.url || block.video?.file?.url || "";
      return videoUrl ? `<p><a href="${videoUrl}" target="_blank" rel="noopener">📹 影片連結</a></p>` : "";
    }
    default:
      return "";
  }
}

export default notion;
