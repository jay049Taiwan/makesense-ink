import { NextResponse } from "next/server";
import { requireStaff } from "@/app/api/staff/_guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const { data, error } = await supabaseAdmin.from("phash_overview").select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    overview: data ?? {
      total_photos: 0, pending: 0, kept: 0, archived: 0, skipped: 0,
      sites: 0, total_size: "0 bytes", freeable_size: "0 bytes",
    },
  });
}
