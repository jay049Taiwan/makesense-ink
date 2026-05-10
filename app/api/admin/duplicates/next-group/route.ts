import { NextResponse } from "next/server";
import { requireStaff } from "@/app/api/staff/_guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/admin/duplicates/next-group?threshold=5&site=xxx
// 回傳一張隨機未審代表照 + 它的所有相似群成員
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const threshold = Number(url.searchParams.get("threshold") ?? 5);
  const site = url.searchParams.get("site") ?? null;

  // 1) 找一張未審 + 有鄰居的代表
  const { data: candidates, error: candErr } = await supabaseAdmin.rpc(
    "phash_next_unreviewed_with_neighbors",
    { p_threshold: threshold, p_site: site, p_min_neighbors: 1 },
  );
  if (candErr) return NextResponse.json({ error: candErr.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ group: null, message: "目前沒有待審的相似群" });
  }

  const rep = candidates[0];

  // 2) 撈代表 + 它的所有相似（distance 0 = 自己）
  const { data: repRow } = await supabaseAdmin
    .from("photo_phash")
    .select("page_id, pixels, filesize, width, height, taken_at, site_name, folder_rel, r2_url, review_action")
    .eq("page_id", rep.page_id)
    .maybeSingle();

  const { data: similar, error: simErr } = await supabaseAdmin.rpc(
    "phash_find_similar",
    { p_page_id: rep.page_id, p_threshold: threshold, p_limit: 50 },
  );
  if (simErr) return NextResponse.json({ error: simErr.message }, { status: 500 });

  const members = [
    { ...repRow, distance: 0, is_representative: true },
    ...(similar ?? []).map((s: any) => ({ ...s, is_representative: false })),
  ];

  // 推薦保留：pixels 最大 → filesize 最大
  const recommendedKeep = [...members].sort(
    (a, b) => (b.pixels ?? 0) - (a.pixels ?? 0) || (b.filesize ?? 0) - (a.filesize ?? 0),
  )[0]?.page_id;

  return NextResponse.json({
    group: {
      representative_page_id: rep.page_id,
      neighbor_count: rep.neighbor_count,
      members,
      recommended_keep: recommendedKeep,
    },
  });
}
