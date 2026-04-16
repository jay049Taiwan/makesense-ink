import type { Metadata } from "next";
import Link from "next/link";
import { fetchSBEvents } from "@/lib/fetch-supabase";
import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SafeImage from "@/components/ui/SafeImage";

export const metadata: Metadata = {
  title: "旅人書店/宜蘭文化俱樂部",
  description: "現思文化創藝術有限公司 — 旅人書店、宜蘭文化俱樂部，以宜蘭在地文化為核心，打造地方文化永續生態系。",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "走讀行旅": "#5ba3d9",
  "講座課程": "#b8943c",
  "園遊市集": "#4ECDC4",
  "陳列展售": "#e8935a",
  "文化冊展": "#7a5c40",
  "藝文表演": "#c87060",
  "典禮儀式": "#9575CD",
};

const brands = [
  { name: "旅人書店", desc: "用書連結地方的街角書店", href: "/bookstore" },
  { name: "宜蘭文化俱樂部", desc: "地方文化的分享與探索平台", href: "/cultureclub" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${mm}/${dd}（${weekdays[d.getDay()]}）`;
}

export default async function HomePage() {
  // 動態抓取近期活動（未來優先，不足時補最近的過去活動）
  const upcomingEvents = await fetchSBEvents(4);
  const now = new Date().toISOString();
  const hasFutureEvents = upcomingEvents.some(ev => ev.date && ev.date >= now);

  // 動態抓取統計數字
  const [
    { count: tourCount },
    { count: marketCount },
    { count: partnerCount },
  ] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "active").eq("event_type", "走讀行旅"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "active").eq("event_type", "園遊市集"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  // 累計活動場次（歷年所有已舉辦的活動）
  const { count: totalEventCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const highlights = [
    { label: "走讀活動", count: `${tourCount || 0}`, unit: "場", href: "/viewpoint-stroll" },
    { label: "園遊市集", count: `${marketCount || 0}`, unit: "場", href: "/market-booking" },
    { label: "合作品牌", count: `${partnerCount || 0}`, unit: "個", href: "/sense" },
    { label: "累計活動", count: `${(totalEventCount || 0).toLocaleString()}`, unit: "場", href: "/sense" },
  ];

  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative flex flex-col items-center justify-center text-center px-4" style={{ minHeight: "70vh", background: "linear-gradient(180deg, var(--color-warm-white) 0%, #fff 100%)" }}>
        <p className="text-sm tracking-widest mb-4" style={{ color: "var(--color-mist)", letterSpacing: "0.25em" }}>
          CULTURE MAKES SENSE
        </p>
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl mb-4"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)", fontWeight: 600, lineHeight: 1.3 }}
        >
          讓文化成為<br />日常的風景
        </h1>
        <p className="text-base sm:text-lg max-w-[520px] mb-8" style={{ color: "var(--color-bark)", lineHeight: 1.8 }}>
          現思文化以宜蘭為根，透過走讀、市集、講座與空間，
          串連在地職人、品牌與社群，打造地方文化的永續生態系。
        </p>
        <div className="flex gap-3">
          <Link
            href="/bookstore"
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--color-moss)" }}
          >
            探索旅人書店
          </Link>
          <Link
            href="/cultureclub"
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}
          >
            加入文化俱樂部
          </Link>
        </div>
      </section>

      {/* ═══ 數據亮點 ═══ */}
      <section className="mx-auto px-4 py-12" style={{ maxWidth: 1140 }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((h) => (
            <Link
              key={h.label}
              href={h.href}
              className="rounded-xl p-5 text-center transition-shadow hover:shadow-md"
              style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}
            >
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--color-teal)", fontFamily: "var(--font-display)" }}>
                {h.count}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>
                {h.label}（{h.unit}）
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 雙品牌 ═══ */}
      <section style={{ background: "var(--color-warm-white)" }}>
        <div className="mx-auto px-4 py-12" style={{ maxWidth: 1140 }}>
          <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            兩大品牌
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {brands.map((b) => (
              <Link
                key={b.name}
                href={b.href}
                className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
                style={{ background: "#fff", border: "1px solid var(--color-dust)" }}
              >
                <div className="aspect-[16/7]">
                  <ImagePlaceholder type="default" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--color-ink)" }}>{b.name}</h3>
                  <p className="text-sm" style={{ color: "var(--color-mist)" }}>{b.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 近期活動 ═══ */}
      <section className="mx-auto px-4 py-12" style={{ maxWidth: 1140 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            {hasFutureEvents ? "近期活動" : "精選活動"}
          </h2>
          <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>
            查看全部
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.slug}`}
                className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
                style={{ background: "#fff", border: "1px solid var(--color-dust)" }}
              >
                <div
                  className="aspect-[16/9] flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--color-parchment)" }}
                >
                  <SafeImage src={ev.cover_url} alt={ev.title} placeholderType="event" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {ev.theme && (
                      <span
                        className="text-[0.6em] px-2 py-0.5 rounded-full text-white"
                        style={{ background: EVENT_TYPE_COLORS[ev.theme] || "var(--color-mist)" }}
                      >
                        {ev.theme}
                      </span>
                    )}
                    <span className="text-[0.65em]" style={{ color: "var(--color-mist)" }}>
                      {formatDate(ev.date)}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2" style={{ color: "var(--color-ink)" }}>
                    {ev.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-sm" style={{ color: "var(--color-mist)" }}>
            目前沒有近期活動，請稍後再看
          </p>
        )}
      </section>

      {/* ═══ CTA ═══ */}
      <section
        className="text-center px-4 py-16"
        style={{ background: "linear-gradient(180deg, #fff 0%, var(--color-warm-white) 100%)" }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--color-mist)" }}>
          加入我們，一起讓文化持續發生
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/sense"
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--color-moss)" }}
          >
            認識現思
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}
          >
            加入會員
          </Link>
        </div>
      </section>
    </div>
  );
}
