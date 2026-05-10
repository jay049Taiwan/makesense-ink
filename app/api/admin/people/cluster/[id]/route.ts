import { NextResponse } from "next/server";
import { requireStaff } from "@/app/api/staff/_guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// PATCH /api/admin/people/cluster/[id]
// body: { label?: string, db08_page_id?: string, reviewed?: boolean }
// 命名 / 綁 DB08 / 標記已審
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.label !== undefined) update.label = body.label || null;
  if (body.db08_page_id !== undefined) update.db08_page_id = body.db08_page_id || null;
  if (body.reviewed !== undefined) update.reviewed = !!body.reviewed;

  const { data, error } = await supabaseAdmin
    .from("face_clusters")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cluster: data });
}

// GET /api/admin/people/cluster/[id]?members=1
// 列出該群所有臉 + 對應照片資訊
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;

  const { data: cluster, error: cErr } = await supabaseAdmin
    .from("face_clusters").select("*").eq("id", id).maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!cluster) return NextResponse.json({ error: "cluster not found" }, { status: 404 });

  const { data: faces, error: fErr } = await supabaseAdmin
    .from("face_embeddings")
    .select("id, page_id, face_idx, bbox, cluster_distance, blur_score")
    .eq("cluster_id", id)
    .order("cluster_distance", { ascending: true })
    .limit(100);
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const pageIds = [...new Set((faces ?? []).map((f) => f.page_id))];
  const { data: photos } = await supabaseAdmin
    .from("photo_phash")
    .select("page_id, r2_url, taken_at, site_name, folder_rel, width, height")
    .in("page_id", pageIds);
  const photoByPage: Record<string, any> = {};
  for (const p of photos ?? []) photoByPage[p.page_id] = p;

  return NextResponse.json({
    cluster,
    members: (faces ?? []).map((f) => ({ ...f, photo: photoByPage[f.page_id] })),
  });
}
