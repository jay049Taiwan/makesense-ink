import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SenseClient from "./SenseClient";

export const revalidate = 300;

export default async function SensePage() {
  // ── 從 Supabase 計算真實統計 ──
  const [
    { count: eventCount },
    { count: productCount },
    { count: partnerCount },
    { count: personCount },
    { count: articleCount },
    { count: topicCount },
    { data: eventsByYear },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("partners").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("persons").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("topics").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("events").select("event_date").eq("status", "active").order("event_date", { ascending: true }),
  ]);

  // 按年聚合活動數量
  const yearCounts: Record<number, number> = {};
  for (const ev of eventsByYear || []) {
    if (ev.event_date) {
      const y = new Date(ev.event_date).getFullYear();
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  }

  const stats = {
    events: eventCount || 0,
    products: productCount || 0,
    partners: partnerCount || 0,
    persons: personCount || 0,
    articles: articleCount || 0,
    topics: topicCount || 0,
    yearCounts,
  };

  return (
    <div>
      {/* ════════════════════════════════════════
          Hero：品牌介紹（S0 靜態文字）
          ════════════════════════════════════════ */}
      <section className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
          <ImagePlaceholder type="default" />
        </div>
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            現思文化創藝術
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>
            Culture Makes Sense
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>現思文化創藝術有限公司成立於 2012 年，以宜蘭在地文化為核心，透過旅人書店與宜蘭文化俱樂部兩大品牌，串連地方文化、創意產業與社群網絡，致力於打造地方文化的永續生態系。</p>
            <p>我們相信，文化不只是被保存的對象，更是可以被體驗、被參與、被創造的日常。從一間街角書店出發，我們走進社區、走入田野、走上舞台，用市集連結在地職人，用走讀喚醒土地記憶，用出版記錄時代切片。</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          營運數據（S-D1/D2：前端聚合，自動計算）
          ════════════════════════════════════════ */}
      <section style={{ background: "#fff" }}>
        <div className="mx-auto px-4 py-10" style={{ maxWidth: 1000 }}>
          <div className="text-center mb-8">
            <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)" }}>— BY THE NUMBERS —</p>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>營運實績</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: "活動場次", value: stats.events, unit: "場", color: "#4ECDC4" },
              { label: "上架商品", value: stats.products, unit: "件", color: "#b5522a" },
              { label: "合作夥伴", value: stats.partners, unit: "個", color: "#e8935a" },
              { label: "連結人物", value: stats.persons, unit: "位", color: "#5c6b4a" },
              { label: "發佈文章", value: stats.articles, unit: "篇", color: "#b8943c" },
              { label: "文化觀點", value: stats.topics, unit: "個", color: "#8b7355" },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-lg p-4" style={{ background: "var(--color-parchment)" }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[0.7em] mt-1" style={{ color: "var(--color-mist)" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[0.7em] text-center mt-3" style={{ color: "var(--color-mist)" }}>
            以上數據為官網已發佈的即時統計
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          互動區（核心能力 + 發展歷程）— Client Component
          ════════════════════════════════════════ */}
      <SenseClient yearCounts={stats.yearCounts} />
    </div>
  );
}
