import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/dashboard
 * Body: { accessToken: string }
 *
 * 廠商銷售概覽 — 摘要數字 + 最近 5 筆動態
 *
 * 摘要：
 *   - 本月營收（涉及我商品/活動的 order_items 加總）
 *   - 本月訂單數（涉及我的不同 orders 數）
 *   - 平均評價（reviews on my items）
 *   - 待簽到人數（活動票券 orders.checkin_status = pending）
 *
 * 動態（最近 5 筆，混排）：
 *   - 訂單 / 報名 / 評價 — 依 created_at 倒序
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "缺少 accessToken" }, { status: 400 });
    }

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ ok: false, message: "LINE token 無效" }, { status: 401 });
    }
    const { userId: lineUid } = await profileRes.json();

    // 1. 找 member → partner
    const { data: member } = await supabase
      .from("members")
      .select("id, email")
      .eq("line_uid", lineUid)
      .maybeSingle();
    if (!member?.email) {
      return NextResponse.json({ ok: true, partner: null });
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("id, notion_id, name")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();
    if (!partner) {
      return NextResponse.json({ ok: true, partner: null });
    }

    // 2. 找我名下的商品 + 活動
    const [{ data: products }, { data: events }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .eq("publisher_notion_id", partner.notion_id),
      supabase
        .from("events")
        .select("id, title, event_date")
        .contains("related_partner_ids", [partner.notion_id]),
    ]);

    const productIds = (products || []).map((p) => p.id);
    const eventIds = (events || []).map((e) => e.id);
    const itemIds = [...productIds, ...eventIds];

    if (itemIds.length === 0) {
      return NextResponse.json({
        ok: true,
        partner: { id: partner.id, name: partner.name },
        summary: { mtdRevenue: 0, mtdOrders: 0, avgRating: null, pendingCheckin: 0 },
        recent: [],
        productCount: 0,
        eventCount: 0,
      });
    }

    // 3. 撈我的 order_items（最近 200 筆即可）
    const { data: items } = await supabase
      .from("order_items")
      .select("id, order_id, item_type, item_id, quantity, price, meta, created_at")
      .in("item_id", itemIds)
      .order("created_at", { ascending: false })
      .limit(200);

    const itemList = items || [];
    const orderIds = [...new Set(itemList.map((i) => i.order_id))];

    // 4. 對應 orders（拿 status 排除取消、checkin_status 算待簽）
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, checkin_status, created_at, total")
      .in("id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]);

    const ordersById = new Map((orders || []).map((o) => [o.id, o]));

    // 5. 本月起算
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let mtdRevenue = 0;
    const mtdOrderSet = new Set<string>();
    let pendingCheckin = 0;

    for (const it of itemList) {
      const o = ordersById.get(it.order_id);
      if (!o || o.status === "cancelled") continue;
      if (it.created_at >= monthStart) {
        mtdRevenue += Number(it.price || 0) * Number(it.quantity || 0);
        mtdOrderSet.add(it.order_id);
      }
      // 待簽到只看活動票
      if (it.item_type !== "商品" && o.checkin_status === "pending") {
        pendingCheckin += Number(it.quantity || 0);
      }
    }

    // 6. reviews 平均
    const itemPkSet = new Set(itemList.map((i) => i.id));
    let avgRating: number | null = null;
    if (itemPkSet.size > 0) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .in("order_item_id", [...itemPkSet]);
      if (reviews && reviews.length > 0) {
        avgRating = reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length;
      }
    }

    // 7. 最近 5 筆動態（混排訂單、報名、評價）
    const productById = new Map((products || []).map((p) => [p.id, p.name]));
    const eventById = new Map((events || []).map((e) => [e.id, e.title]));

    const recentOrders = itemList
      .filter((it) => {
        const o = ordersById.get(it.order_id);
        return o && o.status !== "cancelled";
      })
      .slice(0, 10)
      .map((it) => ({
        type: it.item_type !== "商品" ? "registration" : "order",
        title:
          it.item_type !== "商品"
            ? eventById.get(it.item_id) || "活動"
            : productById.get(it.item_id) || "商品",
        qty: it.quantity,
        amount: Number(it.price) * Number(it.quantity),
        at: it.created_at,
      }));

    const { data: recentReviews } = itemPkSet.size
      ? await supabase
          .from("reviews")
          .select("rating, comment, order_item_id, created_at")
          .in("order_item_id", [...itemPkSet])
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] as any[] };

    const reviewItemMap = new Map(itemList.map((i) => [i.id, i]));
    const recentReviewItems = (recentReviews || []).map((r: any) => {
      const it = reviewItemMap.get(r.order_item_id);
      return {
        type: "review",
        title: it
          ? it.item_type !== "商品"
            ? eventById.get(it.item_id) || "活動"
            : productById.get(it.item_id) || "商品"
          : "—",
        rating: r.rating,
        comment: r.comment || "",
        at: r.created_at,
      };
    });

    const recent = [...recentOrders, ...recentReviewItems]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 8);

    return NextResponse.json({
      ok: true,
      partner: { id: partner.id, name: partner.name },
      summary: {
        mtdRevenue,
        mtdOrders: mtdOrderSet.size,
        avgRating: avgRating != null ? Number(avgRating.toFixed(1)) : null,
        pendingCheckin,
      },
      recent,
      productCount: productIds.length,
      eventCount: eventIds.length,
    });
  } catch (err: any) {
    console.error("[liff/partner/dashboard] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
