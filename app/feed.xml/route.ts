import { supabase } from "@/lib/supabase";

const SITE_URL = "https://makesense.ink";
const SITE_TITLE = "現思文化創藝術";
const SITE_DESC = "旅人書店・宜蘭文化俱樂部 — 地方通訊、文化活動、走讀漫遊";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  // 取最新文章
  const { data: articles } = await supabase
    .from("articles")
    .select("notion_id, title, cover_url, published_at, status")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  // 取最新活動
  const { data: events } = await supabase
    .from("events")
    .select("notion_id, title, event_date, cover_url, status")
    .eq("status", "active")
    .order("event_date", { ascending: false })
    .limit(20);

  const items: string[] = [];

  for (const a of articles || []) {
    items.push(`<item>
      <title>${escapeXml(a.title || "")}</title>
      <link>${SITE_URL}/post/${a.notion_id}</link>
      <guid isPermaLink="true">${SITE_URL}/post/${a.notion_id}</guid>
      <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ""}</pubDate>
      <category>地方通訊</category>
    </item>`);
  }

  for (const e of events || []) {
    items.push(`<item>
      <title>${escapeXml(e.title || "")}</title>
      <link>${SITE_URL}/events/${e.notion_id}</link>
      <guid isPermaLink="true">${SITE_URL}/events/${e.notion_id}</guid>
      <pubDate>${e.event_date ? new Date(e.event_date).toUTCString() : ""}</pubDate>
      <category>活動</category>
    </item>`);
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.join("\n    ")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
