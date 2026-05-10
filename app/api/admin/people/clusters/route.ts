import { NextResponse } from "next/server";
import { requireStaff } from "@/app/api/staff/_guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/admin/people/clusters — 列出所有人臉群組（按 member_count 降冪）
// 同時 join 取代表臉的 r2_url + bbox（讓前端能直接顯示縮圖）
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const onlyUnnamed = url.searchParams.get("unnamed") === "1";
  const limit = Number(url.searchParams.get("limit") ?? 100);

  let q = supabaseAdmin
    .from("face_clusters")
    .select("id, label, db08_page_id, sample_face_id, member_count, reviewed, updated_at")
    .order("member_count", { ascending: false })
    .limit(limit);

  if (onlyUnnamed) q = q.is("label", null);

  const { data: clusters, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 撈每群代表臉的縮圖資料
  const sampleIds = (clusters ?? []).map((c) => c.sample_face_id).filter(Boolean) as string[];
  let samplesById: Record<string, any> = {};
  if (sampleIds.length > 0) {
    const { data: faces } = await supabaseAdmin
      .from("face_embeddings")
      .select("id, page_id, bbox")
      .in("id", sampleIds);
    const pageIds = [...new Set((faces ?? []).map((f) => f.page_id))];
    const { data: photos } = await supabaseAdmin
      .from("photo_phash")
      .select("page_id, r2_url, width, height")
      .in("page_id", pageIds);
    const photoByPage: Record<string, any> = {};
    for (const p of photos ?? []) photoByPage[p.page_id] = p;
    for (const f of faces ?? []) {
      samplesById[f.id] = { ...f, photo: photoByPage[f.page_id] };
    }
  }

  return NextResponse.json({
    clusters: (clusters ?? []).map((c) => ({
      ...c,
      sample: c.sample_face_id ? samplesById[c.sample_face_id] : null,
    })),
  });
}
