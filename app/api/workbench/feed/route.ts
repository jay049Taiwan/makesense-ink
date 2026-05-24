import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { requireStaff } from "@/app/api/staff/_guard";

const VALID_TYPES = ["announcement", "ai_reporter", "external_ref", "progress_report"] as const;
type FeedType = (typeof VALID_TYPES)[number];

const ADMIN_EMAIL = "jay.049@gmail.com";
const ADMIN_TG_UID = "8523155253";

/**
 * GET /api/workbench/feed
 * Query params:
 *   type    — one of the 4 types or 'all' (default: 'all')
 *   cursor  — ISO timestamp for cursor-based pagination (published_at < cursor)
 *   limit   — default 20
 *
 * Returns: { ok: true, items: FeedItemWithRead[], nextCursor: string|null, memberId: string }
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  const typeParam = req.nextUrl.searchParams.get("type") || "all";
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 100);

  // Resolve memberId
  let memberId: string | null = null;
  if (auth.source === "telegram") {
    memberId = auth.memberId ?? null;
  } else {
    // web — look up member by email
    const email = auth.email;
    if (email) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      memberId = member?.id ?? null;
    }
  }

  // Build query
  let query = supabase
    .from("feed_items")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect next page

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  if (typeParam !== "all" && VALID_TYPES.includes(typeParam as FeedType)) {
    query = query.eq("type", typeParam as FeedType);
  }

  const { data: rawItems, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = rawItems || [];
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;

  // Fetch read status for announcements
  let readSet = new Set<string>();
  if (memberId && pageItems.length > 0) {
    const announcementIds = pageItems
      .filter((item) => item.type === "announcement")
      .map((item) => item.id);

    if (announcementIds.length > 0) {
      const { data: reads } = await supabase
        .from("feed_reads")
        .select("feed_item_id")
        .eq("member_id", memberId)
        .in("feed_item_id", announcementIds);

      readSet = new Set((reads || []).map((r) => r.feed_item_id));
    }
  }

  const itemsWithRead = pageItems.map((item) => ({
    ...item,
    is_read: item.type === "announcement" ? readSet.has(item.id) : false,
  }));

  const nextCursor =
    hasMore ? pageItems[pageItems.length - 1].published_at : null;

  return NextResponse.json({
    ok: true,
    items: itemsWithRead,
    nextCursor,
    memberId,
  });
}

/**
 * POST /api/workbench/feed
 * Admin only — create an announcement
 * Body: { title: string, content: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("error" in auth) return auth.error;

  // Admin check
  const isAdmin =
    auth.email === ADMIN_EMAIL ||
    ("telegramUid" in auth && auth.telegramUid === ADMIN_TG_UID);

  if (!isAdmin) {
    return NextResponse.json({ error: "僅限管理員" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content } = body as { title?: string; content?: string };

  if (!title?.trim()) {
    return NextResponse.json({ error: "標題不能空白" }, { status: 400 });
  }

  // Resolve createdBy memberId
  let createdBy: string | null = null;
  if (auth.source === "telegram") {
    createdBy = auth.memberId ?? null;
  } else if (auth.email) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", auth.email)
      .maybeSingle();
    createdBy = member?.id ?? null;
  }

  const { data: item, error } = await supabase
    .from("feed_items")
    .insert({
      type: "announcement",
      title: title.trim(),
      content: content?.trim() ?? "",
      is_pinned: true,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item });
}
