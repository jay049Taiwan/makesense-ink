import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../../../_guard";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// GET /api/staff/page/[id]/content — 列出 Notion page 的 blocks（簡化結構）
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const all: any[] = [];
    let cursor: string | undefined = undefined;
    do {
      const res: any = await notion.blocks.children.list({
        block_id: id,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      all.push(...(res.results || []));
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    // 簡化成前端好用的格式
    const blocks = all.map((b: any) => normalizeBlock(b));
    return NextResponse.json({ blocks });
  } catch (err: any) {
    console.error("[page/content GET] error:", err.message);
    return NextResponse.json({ error: "讀取失敗：" + err.message }, { status: 500 });
  }
}

// POST /api/staff/page/[id]/content — 附加文字段落
// Body: { text: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ error: "text 不可為空" }, { status: 400 });

  try {
    // Notion paragraph 文字長度限制 2000 字，超過分多塊
    const chunks = splitText(text, 1900);
    const children = chunks.map((chunk) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: chunk } }],
      },
    }));
    const res: any = await notion.blocks.children.append({
      block_id: id,
      children: children as any,
    });
    return NextResponse.json({ success: true, appended: (res.results || []).length });
  } catch (err: any) {
    console.error("[page/content POST] error:", err.message);
    return NextResponse.json({ error: "寫入失敗：" + err.message }, { status: 500 });
  }
}

function splitText(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
  return out;
}

function normalizeBlock(b: any): any {
  const type = b.type;
  const inner = b[type] || {};
  const richText: any[] = inner.rich_text || [];
  const plain = richText.map((t: any) => t.plain_text || "").join("");
  // 對應 file/image/video/external block
  let url: string | null = null;
  let fileType: string | null = null;
  if (type === "image" || type === "file" || type === "video" || type === "audio") {
    fileType = type;
    url = inner.external?.url || inner.file?.url || null;
  }
  return {
    id: b.id,
    type,
    text: plain,
    url,
    fileType,
    caption: (inner.caption || []).map((t: any) => t.plain_text || "").join(""),
    created_time: b.created_time,
    last_edited_time: b.last_edited_time,
  };
}
