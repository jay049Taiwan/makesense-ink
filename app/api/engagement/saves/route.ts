import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

// GET /api/engagement/saves — 目前登入用戶的收藏清單
export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("members").select("id").eq("email", email).maybeSingle();
  if (!member) return NextResponse.json({ saves: [] });

  const { data: saves } = await supabaseAdmin
    .from("page_saves")
    .select("id, item_type, item_id, item_title, item_path, created_at")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ saves: saves || [] });
}
