import type { Metadata } from "next";
import Link from "next/link";
import Calendar from "@/components/calendar/Calendar";
import HeroCarousel from "@/components/ui/HeroCarousel";
import { fetchSBEvents, fetchSBArticles, fetchSBTopics, fetchSBProducts } from "@/lib/fetch-supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SafeImage from "@/components/ui/SafeImage";

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
  const topics = await fetchSBTopics("viewpoint", 4);
  const tags = await fetchSBTopics("tag", 10);
  const products = await fetchSBProducts(undefined, 6);
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
          {events.length > 0 ? events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="flex-shrink-0 w-[280px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                <SafeImage src={ev.cover_url} alt={ev.title} placeholderType="event" />
              </div>
              <div className="p-3">
                <h3 className="text-[0.9em] line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{ev.title}</h3>
                <p className="text-[0.75em]" style={{ color: "#999" }}>{ev.date?.substring(0, 10)}</p>
              </div>
            </Link>
          )) : (
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

      {/* ── 區塊 4: 話題觀點（原「脈絡觀點」）── 跟書店「主題策展」同格式 */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>話題觀點</h2>
          <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多文化觀點 →</Link>
        </div>
        <div className="hscroll-track">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/viewpoint/${topic.slug}`}
              className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-square flex items-center justify-center relative" style={{ background: "#f2ede6" }}>
                <ImagePlaceholder type="topic" />
                <span className="absolute bottom-2 right-2 text-[0.65em] px-1.5 py-0.5 rounded-[3px]" style={{ background: "#E3F2FD", color: "#1565C0" }}>
                  觀點
                </span>
              </div>
              <div className="p-2.5">
                <h4 className="text-[0.85em] line-clamp-2 font-medium" style={{ color: "#1a1612" }}>{topic.name}</h4>
                {topic.summary && <p className="text-[0.7em] line-clamp-2 mt-1" style={{ color: "#8b7355" }}>{topic.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 區塊 5: 選書選物 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>選書選物</h2>
          <Link href="/bookstore" className="text-xs" style={{ color: "var(--color-teal)" }}>前往旅人書店看見更多選書選物 →</Link>
        </div>
        <div className="hscroll-track">
          {products.map((g) => (
            <Link
              key={g.id}
              href={`/product/${g.slug}`}
              className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-square flex items-center justify-center" style={{ background: "#f2ede6" }}>
                <SafeImage src={g.photo} alt={g.name} placeholderType="product" />
              </div>
              <div className="p-2.5">
                <h3 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{g.name}</h3>
                <p className="text-[0.8em] font-medium mt-0.5" style={{ color: "#b5522a" }}>NT$ {g.price}</p>
                {g.author && g.author !== "—" && (
                  <p className="text-[0.7em] mt-0.5" style={{ color: "#999" }}>{g.author} / {g.publisher}</p>
                )}
              </div>
            </Link>
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
