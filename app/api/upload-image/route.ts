import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToR2 } from "@/lib/r2";
import { requireStaff } from "@/app/api/staff/_guard";

export const runtime = "nodejs";
export const maxDuration = 60;

// 允許的 R2 folder 前綴白名單（防止 path traversal / 任意路徑污染）
const ALLOWED_FOLDER_PREFIXES = [
  "makesense/uploads",
  "makesense/products",
  "makesense/events",
  "makesense/articles",
  "makesense/staff",
];

/**
 * POST /api/upload-image — 上傳圖片到 R2（僅 L2 工作人員）
 * multipart/form-data with field "file" + optional "folder"
 * Returns { url } or { error }
 */
export async function POST(req: NextRequest) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const rawFolder = (form.get("folder") as string) || "makesense/uploads";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }

    // folder 白名單：只允許已知前綴，防止 path traversal 或任意路徑污染
    const folder = ALLOWED_FOLDER_PREFIXES.some((p) => rawFolder.startsWith(p))
      ? rawFolder.replace(/\.\./g, "").replace(/\/+/g, "/")  // 再順手移除 ..
      : "makesense/uploads";

    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadBufferToR2(buf, folder);
    if (!url) return NextResponse.json({ error: "upload failed" }, { status: 500 });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
