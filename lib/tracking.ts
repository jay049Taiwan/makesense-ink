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
