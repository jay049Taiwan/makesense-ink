/**
 * LINE Image Carousel 組裝工具
 * Rich Menu 的「地方通訊 / 活動體驗 / 話題推薦」三顆按鈕點下去後，
 * 用 LINE 原生 image_carousel template 送出可橫向滑動、點圖進詳情的卡片。
 */

import { supabaseAdmin } from "@/lib/supabase";
import { buildLiffUrl } from "@/lib/line";

const CLOUD_NAME = "drypcu6lg";
const BRAND_BROWN = "7a5c40";
const BRAND_CREAM = "faf8f4";

/** 把任何圖片 URL 轉成 LINE image_carousel 接受的 1024x1024 JPG */
export function toSquareImage(url: string | null | undefined, fallbackText = "旅人書店"): string {
  if (!url || typeof url !== "string") {
    return dynamicPlaceholder(fallbackText);
  }
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/c_fill,ar_1:1,w_1024,q_auto,f_jpg/");
  }
  // 外部圖：透過 Cloudinary fetch 裁切優化
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/c_fill,ar_1:1,w_1024,q_auto,f_jpg/${encodeURIComponent(url)}`;
}

/** 動態產生 1024x1024 品牌色 banner（自家 /api/placeholder，支援中文） */
function dynamicPlaceholder(text: string): string {
  const clean = text.slice(0, 20);
  return `https://makesense.ink/api/placeholder?text=${encodeURIComponent(clean)}&bg=${BRAND_BROWN}&fg=${BRAND_CREAM}`;
}

/** 截短成 LINE action.label 上限（12 字元） */
function trimLabel(s: string, limit = 12): string {
  if (!s) return "查看";
  return s.length > limit ? s.slice(0, limit - 1) + "…" : s;
}

/** 從 images jsonb 欄位取第一張 */
function firstImage(raw: any): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] || null;
  if (typeof raw === "string") {
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr[0] : null; } catch { return null; }
  }
  return null;
}

type ImageCarouselColumn = { imageUrl: string; action: { type: "uri"; label: string; uri: string } };
type ImageCarouselMessage = {
  type: "template";
  altText: string;
  template: { type: "image_carousel"; columns: ImageCarouselColumn[] };
};

function buildCarousel(altText: string, columns: ImageCarouselColumn[]): ImageCarouselMessage {
  return {
    type: "template",
    altText,
    template: { type: "image_carousel", columns: columns.slice(0, 10) },
  };
}

// ═══════════════════════════════════════════
// 地方通訊 (articles)
// ═══════════════════════════════════════════
export async function buildNewsletterCarousel(): Promise<ImageCarouselMessage> {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("id, notion_id, title, cover_url, related_product_ids")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(10);

  const rows = data || [];
  if (rows.length === 0) {
    return buildCarousel("地方通訊", [{
      imageUrl: dynamicPlaceholder("地方通訊"),
      action: { type: "uri", label: "前往文章列表", uri: buildLiffUrl("liff/newsletter") },
    }]);
  }

  // cover_url 為空時，退到第一個對應商品圖（與話題推薦一致）
  const firstProdIds = Array.from(new Set(
    rows.map((a: any) => (a.related_product_ids || [])[0]).filter(Boolean)
  ));
  const { data: prods } = firstProdIds.length
    ? await supabaseAdmin.from("products").select("id, images").in("id", firstProdIds)
    : { data: [] as any[] };
  const prodImageMap = new Map((prods || []).map((p: any) => [p.id, firstImage(p.images)]));

  const columns = rows.map((r: any) => {
    const firstProdId = (r.related_product_ids || [])[0];
    const cover = r.cover_url || (firstProdId ? prodImageMap.get(firstProdId) : null) || null;
    return {
      imageUrl: toSquareImage(cover, r.title || "地方通訊"),
      action: {
        type: "uri" as const,
        label: trimLabel(r.title || "閱讀文章"),
        uri: buildLiffUrl(`post/${r.notion_id || r.id}`),
      },
    };
  });
  return buildCarousel("地方通訊", columns);
}

// ═══════════════════════════════════════════
// 活動體驗 (events)
// ═══════════════════════════════════════════
export async function buildEventsCarousel(): Promise<ImageCarouselMessage> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("events")
    .select("id, notion_id, title, cover_url, event_date")
    .eq("status", "active")
    .gte("event_date", todayISO)
    .order("event_date", { ascending: true })
    .limit(10);

  const rows = data || [];
  if (rows.length === 0) {
    return buildCarousel("活動體驗", [{
      imageUrl: dynamicPlaceholder("近期活動"),
      action: { type: "uri", label: "查看所有活動", uri: buildLiffUrl("liff/events") },
    }]);
  }

  const columns = rows.map((r: any) => ({
    imageUrl: toSquareImage(r.cover_url, r.title || "活動"),
    action: {
      type: "uri" as const,
      label: trimLabel(r.title || "查看活動"),
      uri: buildLiffUrl(`events/${r.notion_id || r.id}`),
    },
  }));
  return buildCarousel("活動體驗", columns);
}

// ═══════════════════════════════════════════
// 話題推薦 (DB05 articles where web_tag 包含「話題推薦」)
// 每張卡片：主題名稱 + 對應庫存（取第一張商品圖）
// ═══════════════════════════════════════════
export async function buildTopicCarousel(): Promise<ImageCarouselMessage> {
  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("id, notion_id, title, cover_url, related_product_ids")
    .eq("status", "published")
    .contains("web_tag", ["話題推薦"])
    .order("updated_at", { ascending: false })
    .limit(10);

  const rows = articles || [];
  if (rows.length === 0) {
    return buildCarousel("話題推薦", [{
      imageUrl: dynamicPlaceholder("話題推薦"),
      action: { type: "uri", label: "逛逛書店", uri: buildLiffUrl("bookstore") },
    }]);
  }

  // 每個話題取 related_product_ids 第一個，一次撈所有商品圖
  const firstProdIds = Array.from(new Set(
    rows.map((a: any) => (a.related_product_ids || [])[0]).filter(Boolean)
  ));
  const { data: prods } = firstProdIds.length
    ? await supabaseAdmin.from("products").select("id, images").in("id", firstProdIds)
    : { data: [] as any[] };
  const prodImageMap = new Map((prods || []).map((p: any) => [p.id, firstImage(p.images)]));

  const columns = rows.map((a: any) => {
    const firstProdId = (a.related_product_ids || [])[0];
    const cover = a.cover_url || (firstProdId ? prodImageMap.get(firstProdId) : null) || null;
    return {
      imageUrl: toSquareImage(cover, a.title || "話題"),
      action: {
        type: "uri" as const,
        label: trimLabel(a.title || "話題"),
        uri: buildLiffUrl(`post/${a.notion_id || a.id}`),
      },
    };
  });

  return buildCarousel("話題推薦", columns);
}
