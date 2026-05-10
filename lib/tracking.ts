// Tracking functions that write to Supabase analytics tables
// Uses anon key (supabase, not supabaseAdmin) since these are client-side calls

import { supabase } from "./supabase";

// Generate or retrieve session ID from sessionStorage
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("ms_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("ms_session_id", sid);
  }
  return sid;
}

// Get device type from user agent
function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

// Get UTM params from URL
function getUtmParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || (params.get("liff_mode") === "true" ? "line_liff" : null),
    utm_medium: params.get("utm_medium") || null,
    utm_campaign: params.get("utm_campaign") || null,
  };
}

// Get source (web/liff)
function getSource(): string {
  if (typeof window === "undefined") return "web";
  return new URLSearchParams(window.location.search).get("liff_mode") === "true" ? "liff" : "web";
}

/** Track a page view */
export async function trackPageView(path: string, contentType?: string, itemId?: string) {
  try {
    const utm = getUtmParams();
    await supabase.from("page_views").insert({
      path,
      session_id: getSessionId(),
      content_type: contentType || null,
      item_id: itemId || null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      source: getSource(),
      device_type: getDeviceType(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    });
  } catch (e) {
    // Silently fail — analytics should never break the app
    console.debug("[tracking] pageview error:", e);
  }
}

/** Track a search query */
export async function trackSearch(keyword: string, resultCount: number, clickedId?: string) {
  try {
    await supabase.from("search_logs").insert({
      keyword,
      result_count: resultCount,
      clicked_id: clickedId || null,
      session_id: getSessionId(),
      source: getSource(),
    });
  } catch (e) {
    console.debug("[tracking] search error:", e);
  }
}

/** Track add to wishlist (only works for logged-in members) */
export async function trackWishlistToggle(itemType: string, itemId: string, memberId?: string) {
  if (!memberId) {
    console.debug("[tracking] wishlist toggle skipped — no member_id");
    return null;
  }

  // Check if already wishlisted
  const { data: existing } = await supabase
    .from("wishlist")
    .select("id")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    // Remove from wishlist
    await supabase.from("wishlist").delete().eq("id", existing.id);
    return false; // removed
  } else {
    // Add to wishlist
    await supabase.from("wishlist").insert({
      member_id: memberId,
      item_type: itemType,
      item_id: itemId,
    });
    return true; // added
  }
}

/** Send GA4 custom event via gtag */
export function sendGAEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
}

// ─────────────────────────────────────────────────────────────
// Cart / Commerce events → cart_events table + GA4
// ─────────────────────────────────────────────────────────────

interface CartEventBase {
  itemId?: string;
  itemType?: string;     // product / event / ticket / addon
  itemName?: string;
  price?: number;
  qty?: number;
  cartTotal?: number;
  cartCount?: number;
  orderId?: string;      // for checkout_complete
  meta?: Record<string, any>;
  path?: string;
}

async function insertCartEvent(eventType: string, payload: CartEventBase) {
  try {
    await supabase.from("cart_events").insert({
      event_type: eventType,
      item_id: payload.itemId || null,
      item_type: payload.itemType || null,
      item_name: payload.itemName || null,
      price: payload.price ?? null,
      qty: payload.qty ?? null,
      cart_total: payload.cartTotal ?? null,
      cart_count: payload.cartCount ?? null,
      order_id: payload.orderId || null,
      meta: payload.meta || null,
      session_id: getSessionId(),
      source: getSource(),
      device_type: getDeviceType(),
      path: payload.path || (typeof window !== "undefined" ? window.location.pathname : null),
    });
  } catch (e) {
    console.debug(`[tracking] ${eventType} error:`, e);
  }
}

/** 加入購物車 */
export function trackAddToCart(item: { id: string; type: string; name: string; price: number; qty: number }, cartSnapshot?: { total: number; count: number }) {
  insertCartEvent("add_to_cart", {
    itemId: item.id, itemType: item.type, itemName: item.name,
    price: item.price, qty: item.qty,
    cartTotal: cartSnapshot?.total, cartCount: cartSnapshot?.count,
  });
  sendGAEvent("add_to_cart", {
    currency: "TWD",
    value: item.price * item.qty,
    items: [{ item_id: item.id, item_name: item.name, item_category: item.type, price: item.price, quantity: item.qty }],
  });
}

/** 移除購物車 */
export function trackRemoveFromCart(item: { id: string; type: string; name: string; price: number; qty: number }, cartSnapshot?: { total: number; count: number }) {
  insertCartEvent("remove_from_cart", {
    itemId: item.id, itemType: item.type, itemName: item.name,
    price: item.price, qty: item.qty,
    cartTotal: cartSnapshot?.total, cartCount: cartSnapshot?.count,
  });
  sendGAEvent("remove_from_cart", {
    currency: "TWD",
    value: item.price * item.qty,
    items: [{ item_id: item.id, item_name: item.name, item_category: item.type, price: item.price, quantity: item.qty }],
  });
}

/** 結帳開始（checkout 頁載入時呼叫） */
export function trackCheckoutStart(cartSnapshot: { total: number; count: number; items?: Array<{ id: string; name: string; price: number; qty: number; type?: string }> }) {
  insertCartEvent("checkout_start", {
    cartTotal: cartSnapshot.total,
    cartCount: cartSnapshot.count,
    meta: cartSnapshot.items ? { items: cartSnapshot.items } : undefined,
  });
  sendGAEvent("begin_checkout", {
    currency: "TWD",
    value: cartSnapshot.total,
    items: (cartSnapshot.items || []).map(i => ({
      item_id: i.id, item_name: i.name, item_category: i.type, price: i.price, quantity: i.qty,
    })),
  });
}

/** 結帳完成 */
export function trackCheckoutComplete(orderId: string, cartSnapshot: { total: number; count: number; items?: Array<{ id: string; name: string; price: number; qty: number; type?: string }> }) {
  insertCartEvent("checkout_complete", {
    orderId,
    cartTotal: cartSnapshot.total,
    cartCount: cartSnapshot.count,
    meta: cartSnapshot.items ? { items: cartSnapshot.items } : undefined,
  });
  sendGAEvent("purchase", {
    transaction_id: orderId,
    currency: "TWD",
    value: cartSnapshot.total,
    items: (cartSnapshot.items || []).map(i => ({
      item_id: i.id, item_name: i.name, item_category: i.type, price: i.price, quantity: i.qty,
    })),
  });
}

/** Outbound click（點擊離站連結，例：LINE / FB icon / 電話） */
export function trackOutboundClick(target: string, meta?: Record<string, any>) {
  insertCartEvent("outbound_click", { itemId: target, meta });
  sendGAEvent("click", { link_url: target, outbound: true, ...meta });
}

/** Scroll depth（每頁最多 4 個 milestone：25/50/75/100） */
export function trackScrollDepth(depth: 25 | 50 | 75 | 100, path?: string) {
  insertCartEvent("scroll_depth", { qty: depth, path });
  sendGAEvent("scroll", { percent_scrolled: depth });
}

/** 更新 page_views.duration_sec — 用 sendBeacon 確保在頁面離開前送出 */
export function trackPageDuration(sessionId: string, path: string, durationSec: number) {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    const blob = new Blob([JSON.stringify({ session_id: sessionId, path, duration_sec: durationSec })], { type: "application/json" });
    navigator.sendBeacon("/api/track/duration", blob);
  } catch (e) {
    console.debug("[tracking] duration beacon error:", e);
  }
}

// 暴露 helper 給其他元件用
export { getSessionId };
