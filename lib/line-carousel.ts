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
    .select("id, notion_id, title, cover_url")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(10);

  const rows = data || [];
  if (rows.length === 0) {
    return buildCarousel("地方通訊", [{
      imageUrl: dynamicPlaceholder("地方通訊"),
      action: { type: "uri", label: "前往文章列表", uri: buildLiffUrl("liff/newsletter") },
    }]);
  }

  const columns = rows.map((r: any) => ({
    imageUrl: toSquareImage(r.cover_url, r.title || "地方通訊"),
    action: {
      type: "uri" as const,
      label: trimLabel(r.title || "閱讀文章"),
      uri: buildLiffUrl(`post/${r.notion_id || r.id}`),
    },
  }));
  return buildCarousel("📮 地方通訊", columns);
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
  return buildCarousel("🎪 活動體驗", columns);
}

// ═══════════════════════════════════════════
// 話題推薦 (topics / viewpoints)
// ═══════════════════════════════════════════
export async function buildTopicCarousel(): Promise<ImageCarouselMessage> {
  const { data: topics } = await supabaseAdmin
    .from("topics")
    .select("id, notion_id, name, summary, related_product_ids, related_event_ids, related_article_ids")
    .eq("status", "active")
    .eq("tag_type", "viewpoint")
    .limit(30);

  const rows = (topics || []).sort(() => Math.random() - 0.5).slice(0, 10);
  if (rows.length === 0) {
    return buildCarousel("話題推薦", [{
      imageUrl: dynamicPlaceholder("觀點漫遊"),
      action: { type: "uri", label: "前往觀點列表", uri: buildLiffUrl("liff/viewpoints") },
    }]);
  }

  // 撈所有相關商品/活動/文章的 cover 一次，再 map 到各 topic
  const prodIds = Array.from(new Set(rows.flatMap((r: any) => r.related_product_ids || []))).slice(0, 50);
  const eventIds = Array.from(new Set(rows.flatMap((r: any) => r.related_event_ids || []))).slice(0, 50);
  const articleIds = Array.from(new Set(rows.flatMap((r: any) => r.related_article_ids || []))).slice(0, 50);

  const [prods, events, articles] = await Promise.all([
    prodIds.length ? supabaseAdmin.from("products").select("id, images").in("id", prodIds) : Promise.resolve({ data: [] } as any),
    eventIds.length ? supabaseAdmin.from("events").select("id, cover_url").in("id", eventIds) : Promise.resolve({ data: [] } as any),
    articleIds.length ? supabaseAdmin.from("articles").select("id, cover_url").in("id", articleIds) : Promise.resolve({ data: [] } as any),
  ]);

  const prodMap = new Map((prods.data || []).map((p: any) => [p.id, firstImage(p.images)]));
  const eventMap = new Map((events.data || []).map((e: any) => [e.id, e.cover_url]));
  const articleMap = new Map((articles.data || []).map((a: any) => [a.id, a.cover_url]));

  const columns = rows.map((t: any) => {
    let cover: string | null = null;
    for (const id of t.related_product_ids || []) { cover = prodMap.get(id) || null; if (cover) break; }
    if (!cover) for (const id of t.related_event_ids || []) { cover = eventMap.get(id) || null; if (cover) break; }
    if (!cover) for (const id of t.related_article_ids || []) { cover = articleMap.get(id) || null; if (cover) break; }

    return {
      imageUrl: toSquareImage(cover, t.name || "觀點"),
      action: {
        type: "uri" as const,
        label: trimLabel(t.name || "觀點"),
        uri: buildLiffUrl(`viewpoint/${t.notion_id || t.id}`),
      },
    };
  });

  return buildCarousel("🎲 話題推薦", columns);
}
