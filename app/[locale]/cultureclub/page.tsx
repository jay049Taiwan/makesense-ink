import type { Metadata } from "next";
import Link from "next/link";
import Calendar from "@/components/calendar/Calendar";
import HeroCarousel from "@/components/ui/HeroCarousel";
import { fetchSBEvents, fetchSBArticles, fetchSBTopics, fetchSBProducts } from "@/lib/fetch-supabase";
import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SafeImage from "@/components/ui/SafeImage";
import AddToCartButton from "@/components/ui/AddToCartButton";
import QuickBookButton from "@/components/ui/QuickBookButton";

export const metadata: Metadata = {
  title: "宜蘭文化俱樂部",
  description: "宜蘭文化俱樂部 — 集結宜蘭在地的文化力量，建構屬於宜蘭人的文化社群。",
};

export const revalidate = 300;

const eventCatStyles: Record<string, { bg: string; text: string }> = {
  園遊市集: { bg: "#FFF3E0", text: "#E65100" },
  講座課程: { bg: "#E3F2FD", text: "#1565C0" },
  工坊手作: { bg: "#FCE4EC", text: "#C62828" },
  陳列展售: { bg: "#E0F2F1", text: "#00695C" },
  文化冊展: { bg: "#F3E5F5", text: "#6A1B9A" },
  數位活動: { bg: "#FFF8E1", text: "#F57F17" },
  典禮儀式: { bg: "#E8F5E9", text: "#2E7D32" },
};

export default async function CultureClubPage() {
  const events = await fetchSBEvents(5);
  const articles = await fetchSBArticles(5);
  const tags = await fetchSBTopics("tag", 10);
  const products = await fetchSBProducts(undefined, 6);

  // ── 話題觀點：每筆觀點 + 其關聯的產品/活動/文章/標籤卡片（全部以 updated_at DESC 混排）──
  // 只顯示已發佈、有官網頁面的項目（因此自動跳過未同步進 Supabase 的原始資料）
  const { data: vps } = await supabase
    .from("topics")
    .select("id, notion_id, name, summary, related_product_ids, related_event_ids, related_article_ids, related_tag_ids, updated_at")
    .eq("tag_type", "viewpoint")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(4);

  const parseIds = (v: any): string[] => Array.isArray(v) ? v : (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return []; } })() : []);
  const prodIds = new Set<string>();
  const eventIds = new Set<string>();
  const articleIds = new Set<string>();
  const tagIds = new Set<string>();
  (vps || []).forEach((v: any) => {
    parseIds(v.related_product_ids).forEach((id: string) => prodIds.add(id));
    parseIds(v.related_event_ids).forEach((id: string) => eventIds.add(id));
    parseIds(v.related_article_ids).forEach((id: string) => articleIds.add(id));
    parseIds(v.related_tag_ids).forEach((id: string) => tagIds.add(id));
  });

  const [prodsRes, eventsRes, artsRes, tagsRes] = await Promise.all([
    prodIds.size ? supabase.from("products").select("id, notion_id, name, price, images, updated_at").in("id", [...prodIds]).eq("status", "active") : Promise.resolve({ data: [] as any[] }),
    eventIds.size ? supabase.from("events").select("id, notion_id, title, cover_url, event_date, updated_at").in("id", [...eventIds]).eq("status", "active") : Promise.resolve({ data: [] as any[] }),
    articleIds.size ? supabase.from("articles").select("id, notion_id, title, cover_url, updated_at, web_tag").in("id", [...articleIds]).eq("status", "published") : Promise.resolve({ data: [] as any[] }),
    tagIds.size ? supabase.from("topics").select("id, notion_id, name, updated_at").in("id", [...tagIds]).eq("tag_type", "tag").eq("status", "active") : Promise.resolve({ data: [] as any[] }),
  ]);

  const prodMap = new Map((prodsRes.data || []).map((r: any) => {
    let photo: string | null = null;
    try { const imgs = JSON.parse(r.images || "[]"); photo = imgs[0] || null; } catch {}
    return [r.id, { type: "product", id: r.notion_id || r.id, title: r.name, photo, price: r.price, updated_at: r.updated_at }];
  }));
  const eventMap = new Map((eventsRes.data || []).map((r: any) => [r.id, { type: "event", id: r.notion_id || r.id, title: r.title, photo: r.cover_url, date: r.event_date, updated_at: r.updated_at }]));
  // 話題推薦類的 article 沒有獨立頁面 → 不收進卡片
  const artMap = new Map((artsRes.data || []).filter((r: any) => !Array.isArray(r.web_tag) || !r.web_tag.includes("話題推薦")).map((r: any) => [r.id, { type: "article", id: r.notion_id || r.id, title: r.title, photo: r.cover_url, updated_at: r.updated_at }]));
  const tagMap = new Map((tagsRes.data || []).map((r: any) => [r.id, { type: "tag", id: r.notion_id || r.id, title: r.name, updated_at: r.updated_at }]));

  const viewpointRows = (vps || []).map((v: any) => {
    const items: any[] = [];
    parseIds(v.related_product_ids).forEach((id: string) => { const x = prodMap.get(id); if (x) items.push(x); });
    parseIds(v.related_event_ids).forEach((id: string) => { const x = eventMap.get(id); if (x) items.push(x); });
    parseIds(v.related_article_ids).forEach((id: string) => { const x = artMap.get(id); if (x) items.push(x); });
    parseIds(v.related_tag_ids).forEach((id: string) => { const x = tagMap.get(id); if (x) items.push(x); });
    items.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    return { id: v.id, title: v.name, summary: v.summary, items };
  }).filter((v: any) => v.items.length > 0);
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: Hero 輪播 ── */}
      <section className="py-8">
        <HeroCarousel slides={events.map((ev) => ({
          image: ev.cover_url || null,
          title: ev.title,
          subtitle: ev.date?.substring(0, 10) || "",
          cta: { text: "了解更多", href: `/events/${ev.slug}` },
        }))} />
      </section>

      {/* ── 區塊 2: 近期活動 ── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>近期活動</h2>
        <div className="hscroll-track">
          {events.length > 0 ? events.map((ev) => {
            const ended = ev.date ? new Date(ev.date) < new Date() : false;
            return (
              <div
                key={ev.id}
                className="flex-shrink-0 w-[280px] rounded-lg overflow-hidden transition-shadow hover:shadow-md flex flex-col"
                style={{ border: "1px solid #e8e0d4", background: "#fff" }}
              >
                <Link href={`/events/${ev.slug}`} className="block">
                  <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                    <SafeImage src={ev.cover_url} alt={ev.title} placeholderType="event" />
                  </div>
                  <div className="p-3 pb-1.5">
                    <h3 className="text-[0.9em] line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{ev.title}</h3>
                    <p className="text-[0.75em]" style={{ color: "#999" }}>{ev.date?.substring(0, 10)}</p>
                  </div>
                </Link>
                <div className="px-3 pb-3 mt-auto">
                  <QuickBookButton slug={ev.slug} ended={ended} size="sm" />
                </div>
              </div>
            );
          }) : (
            <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有近期活動</p>
          )}
        </div>
      </section>

      {/* ── 區塊 3: 地方通訊 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>地方通訊</h2>
          <Link href="/local-newsletter" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多地方通訊 →</Link>
        </div>
        <div>
          {articles.length > 0 ? articles.map((article) => (
            <Link
              key={article.id}
              href={`/post/${article.slug}`}
              className="flex items-start gap-4 py-4 px-2 -mx-2 rounded transition-colors hover:bg-[#faf8f5]"
              style={{ borderBottom: "1px solid #f0f0f0" }}
            >
              <span className="text-[0.8em] flex-shrink-0 min-w-[100px]" style={{ color: "#999" }}>
                {article.date ? new Date(article.date).toLocaleDateString("zh-TW") : ""}
              </span>
              <span className="text-[0.95em]" style={{ color: "#1a1612" }}>
                {article.title}
              </span>
            </Link>
          )) : (
            <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有文章</p>
          )}
        </div>
      </section>

      {/* ── 區塊 4: 話題觀點 ── 每筆觀點 + 關聯卡片（產品/活動/文章/標籤，按更新時間 DESC 混排） */}
      {viewpointRows.length > 0 && (
        <div className="py-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>話題觀點</h2>
            <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多文化觀點 →</Link>
          </div>
          {viewpointRows.map((vp: any) => (
            <section key={vp.id} className="py-4">
              <div className="mb-3">
                <Link href={`/viewpoint/${vp.id}`} className="text-[1.15em] font-semibold hover:underline" style={{ color: "#1a1612" }}>{vp.title}</Link>
                {vp.summary && <p className="text-[0.8em] mt-1" style={{ color: "#8b7355" }}>{vp.summary}</p>}
              </div>
              <div className="hscroll-track">
                {vp.items.map((item: any) => {
                  const hrefMap: Record<string, string> = {
                    product: `/product/${item.id}`,
                    event: `/events/${item.id}`,
                    article: `/post/${item.id}`,
                    tag: `/viewpoint/${item.id}`,
                  };
                  const labelMap: Record<string, { text: string; bg: string; color: string }> = {
                    product: { text: "選書/選物", bg: "#FFF3E0", color: "#E65100" },
                    event: { text: "活動", bg: "#E3F2FD", color: "#1565C0" },
                    article: { text: "文章", bg: "#E0F2F1", color: "#00695C" },
                    tag: { text: "關鍵字", bg: "#F3E5F5", color: "#6A1B9A" },
                  };
                  const label = labelMap[item.type];
                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={hrefMap[item.type]}
                      className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                      style={{ border: "1px solid #e8e0d4", background: "#fff" }}
                    >
                      <div className="aspect-square flex items-center justify-center relative overflow-hidden" style={{ background: "#f2ede6" }}>
                        {item.photo ? <SafeImage src={item.photo} alt={item.title} placeholderType={item.type === "event" ? "event" : item.type === "article" ? "article" : "product"} /> : <ImagePlaceholder type={item.type === "event" ? "event" : item.type === "article" ? "article" : item.type === "tag" ? "topic" : "product"} />}
                        <span className="absolute bottom-2 right-2 text-[0.65em] px-1.5 py-0.5 rounded-[3px]" style={{ background: label.bg, color: label.color }}>
                          {label.text}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{item.title}</h4>
                        {item.type === "product" && item.price != null && <p className="text-[0.8em]" style={{ color: "#b5522a" }}>NT$ {item.price}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── 區塊 5: 選書選物 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>選書選物</h2>
          <Link href="/bookstore" className="text-xs" style={{ color: "var(--color-teal)" }}>前往旅人書店看見更多選書選物 →</Link>
        </div>
        <div className="hscroll-track">
          {products.map((g) => (
            <div
              key={g.id}
              className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md flex flex-col"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <Link href={`/product/${g.slug}`} className="block">
                <div className="aspect-square flex items-center justify-center" style={{ background: "#f2ede6" }}>
                  <SafeImage src={g.photo} alt={g.name} placeholderType="product" />
                </div>
                <div className="p-2.5 pb-1.5">
                  <h3 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{g.name}</h3>
                  <p className="text-[0.8em] font-medium mt-0.5" style={{ color: "#b5522a" }}>NT$ {g.price}</p>
                  {g.author && g.author !== "—" && (
                    <p className="text-[0.7em] mt-0.5" style={{ color: "#999" }}>{g.author} / {g.publisher}</p>
                  )}
                </div>
              </Link>
              <div className="px-2.5 pb-2.5 mt-auto">
                <AddToCartButton productId={g.id} notionId={g.slug} name={g.name} price={g.price} stock={g.stock} subCategory={g.category} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 活動行事曆 ── */}
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>活動行事曆</h2>
        <Calendar mode="default" fetchUrl="/api/calendar/events" />
      </section>
    </div>
  );
}
