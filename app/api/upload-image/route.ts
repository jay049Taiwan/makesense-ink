import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/upload-image
 * multipart/form-data with field "file" + optional "folder"
 * Returns { url } or { error }
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = (form.get("folder") as string) || "makesense/uploads";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadBufferToR2(buf, folder);
    if (!url) return NextResponse.json({ error: "upload failed" }, { status: 500 });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
