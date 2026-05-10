import { NextResponse } from "next/server";
import { requireStaff } from "@/app/api/staff/_guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// POST /api/admin/duplicates/review
// body: { keep_page_id?: string, archive_page_ids?: string[], skip_page_ids?: string[] }
// 標記 review action（實際刪 R2 / archive Notion 之後另外排程）
export async function POST(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const keep_page_id = body.keep_page_id ?? null;
  const archive_page_ids = Array.isArray(body.archive_page_ids) ? body.archive_page_ids : [];
  const skip_page_ids = Array.isArray(body.skip_page_ids) ? body.skip_page_ids : [];

  if (!keep_page_id && archive_page_ids.length === 0 && skip_page_ids.length === 0) {
    return NextResponse.json({ error: "沒有任何決策" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("phash_mark_review", {
    p_keep_page_id: keep_page_id,
    p_archive_page_ids: archive_page_ids,
    p_skip_page_ids: skip_page_ids,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data });
}
