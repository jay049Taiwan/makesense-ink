import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import nodePath from "path";
import { requireStaff } from "../../../_guard";
import { supabaseAdmin } from "@/lib/supabase";

// 允許的副檔名白名單（防止上傳可執行檔或危險格式）
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg",
  ".mp4", ".mov", ".avi", ".webm",
  ".mp3", ".wav", ".m4a", ".ogg",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".zip",
]);

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const BUCKET = "staff-uploads";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/staff/page/[id]/upload — multipart/form-data 接檔案
//   1. 上傳到 Supabase Storage（public bucket）
//   2. 拿 public URL 加 Notion external file/image/video block 進 page
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "需 multipart form-data" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺 file 欄位" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `檔案超過 ${MAX_BYTES / 1024 / 1024} MB 上限` }, { status: 413 });
  }

  // 副檔名白名單驗證
  const ext = nodePath.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `不支援此檔案格式（${ext || "無副檔名"}）` }, { status: 400 });
  }

  // 1. 上傳到 Supabase Storage
  const safeName = (file.name || "file").replace(/[^\w.\-]+/g, "_");
  const path = `${id}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin
    .storage.from(BUCKET)
    .upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    console.error("[upload] storage error:", upErr.message);
    return NextResponse.json({ error: "儲存失敗：" + upErr.message }, { status: 500 });
  }
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // 2. 加 Notion block
  const mime = (file.type || "").toLowerCase();
  let blockType: "image" | "video" | "audio" | "file" = "file";
  if (mime.startsWith("image/")) blockType = "image";
  else if (mime.startsWith("video/")) blockType = "video";
  else if (mime.startsWith("audio/")) blockType = "audio";

  const block: any = {
    object: "block",
    type: blockType,
    [blockType]: {
      type: "external",
      external: { url },
      caption: [{ type: "text", text: { content: file.name || "" } }],
    },
  };

  try {
    await notion.blocks.children.append({ block_id: id, children: [block] });
    return NextResponse.json({ success: true, url, blockType });
  } catch (err: any) {
    console.error("[upload] notion append error:", err.message);
    return NextResponse.json({ error: "Notion 寫入失敗：" + err.message, url }, { status: 500 });
  }
}
