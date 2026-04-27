import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_CATEGORIES = ["logo", "image", "product", "activity", "performance"];

async function getMemberId() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return null;
  const { data } = await supabaseAdmin.from("members").select("id").eq("email", email).maybeSingle();
  return data?.id || null;
}

/**
 * GET /api/vendor-photos?include_archived=1
 * 列出登入會員的所有照片
 */
export async function GET(req: NextRequest) {
  const memberId = await getMemberId();
  if (!memberId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const includeArchived = req.nextUrl.searchParams.get("include_archived") === "1";

  let query = supabaseAdmin
    .from("vendor_photos")
    .select("id, category, url, filename, archived_at, created_at")
    .eq("member_id", memberId);

  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: data || [] });
}

/**
 * POST /api/vendor-photos
 * multipart/form-data: file + category
 * 上傳新照片到 Cloudinary 並寫入 vendor_photos
 */
export async function POST(req: NextRequest) {
  const memberId = await getMemberId();
  if (!memberId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const category = (form.get("category") as string) || "";

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "category 不正確" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少檔案" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const folder = `makesense/vendor-photos/${memberId}/${category}`;
    const url = await uploadBufferToCloudinary(buf, folder);
    if (!url) return NextResponse.json({ error: "Cloudinary 上傳失敗" }, { status: 500 });

    const { data, error } = await supabaseAdmin
      .from("vendor_photos")
      .insert({
        member_id: memberId,
        category,
        url,
        filename: file.name,
      })
      .select("id, category, url, filename, archived_at, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ photo: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
