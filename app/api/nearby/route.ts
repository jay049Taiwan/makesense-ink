import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * GET /api/nearby?productId=xxx&lat=24.67&lng=121.78
 *
 * 「附近看看」：找出 20km 內、有賣同類別的觀點店（最多 5 家）
 *
 * 邏輯：
 * 1. 商品 → 反查所屬零售類別（topics where tag_type='tag' AND related_product_ids contains productId）
 * 2. 找賣這些類別的觀點店（topics where tag_type='viewpoint' AND retail_category_ids overlaps）
 * 3. 用 db08_places.place.lat/lon 算 Haversine 距離，篩 ≤ 20km，order by 距離 asc，limit 5
 */

const RADIUS_KM = 20;
const LIMIT = 5;

// Haversine 距離公式（km）
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
    const lng = parseFloat(req.nextUrl.searchParams.get("lng") || "");

    if (!productId) {
      return NextResponse.json({ ok: false, error: "missing productId" }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "missing or invalid lat/lng" }, { status: 400 });
    }

    // 1. 找此商品所屬的「零售類別 標籤」
    //    topics.related_product_ids 是 jsonb，存 supabase product UUID 陣列
    const { data: catTopics, error: catErr } = await supabase
      .from("topics")
      .select("notion_id, name")
      .eq("tag_type", "tag")
      .contains("related_product_ids", JSON.stringify([productId]));

    if (catErr) throw new Error(`cat lookup: ${catErr.message}`);
    const categoryNids = (catTopics || []).map((c: any) => c.notion_id);
    if (categoryNids.length === 0) {
      return NextResponse.json({ ok: true, shops: [], reason: "no_category" });
    }

    // 2. 找有賣這些類別的觀點店（retail_category_ids 與 categoryNids 有交集）
    //    用 PostgREST 的 ?| operator 透過 .or filter 拼
    const { data: viewpoints, error: vpErr } = await supabase
      .from("topics")
      .select("notion_id, name, address_text, region, retail_category_ids")
      .eq("tag_type", "viewpoint")
      .eq("status", "active");

    if (vpErr) throw new Error(`viewpoint lookup: ${vpErr.message}`);

    const catSet = new Set(categoryNids);
    const matchedShops = (viewpoints || []).filter((vp: any) => {
      const rcats = Array.isArray(vp.retail_category_ids) ? vp.retail_category_ids : [];
      return rcats.some((cn: string) => catSet.has(cn));
    });
    if (matchedShops.length === 0) {
      return NextResponse.json({ ok: true, shops: [], reason: "no_matching_shops" });
    }

    // 3. 撈這些觀點店的 GPS 座標（從 db08_places）
    const shopNids = matchedShops.map((s: any) => s.notion_id);
    const { data: places, error: placesErr } = await supabase
      .from("db08_places")
      .select("notion_id, place")
      .in("notion_id", shopNids);

    if (placesErr) throw new Error(`places lookup: ${placesErr.message}`);
    const placeByNid = new Map<string, any>();
    (places || []).forEach((pl: any) => {
      const lat = pl.place?.lat;
      const lon = pl.place?.lon;
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        placeByNid.set(pl.notion_id, { lat, lon });
      }
    });

    // 4. 算距離 + 篩 20km + 排序 + 取 5 家
    const withDistance = matchedShops
      .map((shop: any) => {
        const place = placeByNid.get(shop.notion_id);
        if (!place) return null;
        const distKm = haversineKm(lat, lng, place.lat, place.lon);
        return {
          notion_id: shop.notion_id,
          name: shop.name,
          address_text: shop.address_text || null,
          region: Array.isArray(shop.region) && shop.region.length > 0 ? shop.region[0] : null,
          distance_km: Math.round(distKm * 10) / 10, // 一位小數
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s.distance_km <= RADIUS_KM)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, LIMIT);

    return NextResponse.json({ ok: true, shops: withDistance, radius_km: RADIUS_KM });
  } catch (err: any) {
    console.error("[nearby]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
