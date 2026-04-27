import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

async function getMemberId() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return null;
  const { data } = await supabaseAdmin.from("members").select("id").eq("email", email).maybeSingle();
  return data?.id || null;
}

/**
 * PATCH /api/vendor-photos/[id]
 * body: { action: "archive" | "restore" }
 * 封存/取出照片（僅本人）
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const memberId = await getMemberId();
  if (!memberId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (!["archive", "restore"].includes(action)) {
    return NextResponse.json({ error: "action 不正確" }, { status: 400 });
  }

  // 驗證是本人的照片
  const { data: photo } = await supabaseAdmin
    .from("vendor_photos")
    .select("id, member_id")
    .eq("id", id)
    .maybeSingle();

  if (!photo || photo.member_id !== memberId) {
    return NextResponse.json({ error: "照片不存在或無權限" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_photos")
    .update({ archived_at: action === "archive" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, category, url, filename, archived_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data });
}
