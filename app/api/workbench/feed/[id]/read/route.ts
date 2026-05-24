import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { requireStaff } from "@/app/api/staff/_guard";

/**
 * POST /api/workbench/feed/[id]/read
 * Mark an announcement as read by the current member.
 * Idempotent — safe to call multiple times.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const { id: feedItemId } = await params;
  if (!feedItemId) {
    return NextResponse.json({ error: "缺少 feed item id" }, { status: 400 });
  }

  // Resolve memberId
  let memberId: string | null = null;
  if (auth.source === "telegram") {
    memberId = auth.memberId ?? null;
  } else if (auth.email) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", auth.email)
      .maybeSingle();
    memberId = member?.id ?? null;
  }

  if (!memberId) {
    return NextResponse.json({ error: "找不到會員資料" }, { status: 400 });
  }

  // Verify feed item exists and is an announcement
  const { data: feedItem, error: fetchErr } = await supabase
    .from("feed_items")
    .select("id, type")
    .eq("id", feedItemId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!feedItem) return NextResponse.json({ error: "找不到此 feed item" }, { status: 404 });
  if (feedItem.type !== "announcement") {
    return NextResponse.json({ error: "只有公告可以標記已讀" }, { status: 400 });
  }

  // Upsert read record
  const { error } = await supabase
    .from("feed_reads")
    .upsert(
      { feed_item_id: feedItemId, member_id: memberId },
      { onConflict: "feed_item_id,member_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
