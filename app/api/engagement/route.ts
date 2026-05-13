import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

// GET /api/engagement?item_type=article&item_id=xxx
// 回傳：按讚數、收藏數、目前用戶是否已按讚/收藏
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const item_type = searchParams.get("item_type");
  const item_id = searchParams.get("item_id");
  if (!item_type || !item_id) {
    return NextResponse.json({ likeCount: 0, saveCount: 0, userLiked: false, userSaved: false });
  }

  // 並行查詢數量
  const [likesRes, savesRes] = await Promise.all([
    supabaseAdmin.from("page_likes").select("id, member_id", { count: "exact" })
      .eq("item_type", item_type).eq("item_id", item_id),
    supabaseAdmin.from("page_saves").select("id, member_id", { count: "exact" })
      .eq("item_type", item_type).eq("item_id", item_id),
  ]);

  const likeCount = likesRes.count ?? 0;
  const saveCount = savesRes.count ?? 0;

  // 若登入，檢查目前用戶狀態
  let userLiked = false;
  let userSaved = false;
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (email) {
    const { data: member } = await supabaseAdmin
      .from("members").select("id").eq("email", email).maybeSingle();
    if (member) {
      const [likedRow, savedRow] = await Promise.all([
        supabaseAdmin.from("page_likes").select("id")
          .eq("member_id", member.id).eq("item_type", item_type).eq("item_id", item_id).maybeSingle(),
        supabaseAdmin.from("page_saves").select("id")
          .eq("member_id", member.id).eq("item_type", item_type).eq("item_id", item_id).maybeSingle(),
      ]);
      userLiked = !!likedRow.data;
      userSaved = !!savedRow.data;
    }
  }

  return NextResponse.json({ likeCount, saveCount, userLiked, userSaved });
}

// POST /api/engagement
// Body: { action: "like"|"save", item_type, item_id, item_title?, item_path? }
// 回傳：{ ok, state: bool（true=已按/已收藏, false=已取消）, count: number }
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ ok: false, error: "請先登入" }, { status: 401 });

  const { action, item_type, item_id, item_title, item_path } = await req.json();
  if (!action || !item_type || !item_id) {
    return NextResponse.json({ ok: false, error: "缺少必要參數" }, { status: 400 });
  }

  const { data: member } = await supabaseAdmin
    .from("members").select("id").eq("email", email).maybeSingle();
  if (!member) return NextResponse.json({ ok: false, error: "找不到會員" }, { status: 404 });

  const table = action === "like" ? "page_likes" : "page_saves";

  // 檢查是否已存在
  const { data: existing } = await supabaseAdmin
    .from(table).select("id")
    .eq("member_id", member.id).eq("item_type", item_type).eq("item_id", item_id)
    .maybeSingle();

  let state: boolean;
  if (existing) {
    // 已存在 → 取消
    await supabaseAdmin.from(table).delete().eq("id", existing.id);
    state = false;
  } else {
    // 不存在 → 新增
    const row: Record<string, any> = { member_id: member.id, item_type, item_id };
    if (action === "save") {
      if (item_title) row.item_title = item_title;
      if (item_path) row.item_path = item_path;
    }
    await supabaseAdmin.from(table).insert(row);
    state = true;
  }

  // 回傳最新數量
  const { count } = await supabaseAdmin
    .from(table).select("id", { count: "exact", head: true })
    .eq("item_type", item_type).eq("item_id", item_id);

  return NextResponse.json({ ok: true, state, count: count ?? 0 });
}
