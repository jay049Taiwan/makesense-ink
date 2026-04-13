import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Culture Makes Sense | 現思文化創藝術",
  description: "現思文化創藝術有限公司 — 以宜蘭在地文化為核心，打造地方文化永續生態系。",
};

const highlights = [
  { label: "走讀活動", count: "48+", unit: "場", href: "/viewpoint-stroll" },
  { label: "園遊市集", count: "35+", unit: "場", href: "/market-booking" },
  { label: "合作品牌", count: "89+", unit: "個", href: "/sense" },
  { label: "服務人次", count: "12,340+", unit: "人", href: "/sense" },
];

const upcomingEvents = [
  { id: "a1", title: "走讀行旅｜宜蘭舊城散步", date: "04/21（一）", type: "走讀", color: "#5ba3d9" },
  { id: "a3", title: "講座｜宜蘭的前世今生", date: "04/28（一）", type: "講座", color: "#b8943c" },
  { id: "a2", title: "走讀行旅｜羅東林場文學散步", date: "05/05（一）", type: "走讀", color: "#5ba3d9" },
  { id: "a4", title: "森本集市｜春日好物市集", date: "05/10（六）", type: "市集", color: "#4ECDC4" },
];

const brands = [
  { name: "旅人書店", desc: "用書連結地方的街角書店", href: "/bookstore" },
  { name: "宜蘭文化俱樂部", desc: "地方文化的分享與探索平台", href: "/cultureclub" },
];

export default function HomePage() {
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
                <div
                  className="aspect-[16/7] flex items-center justify-center"
                  style={{ background: "var(--color-parchment)" }}
                >
                  <span className="text-4xl opacity-20">📷</span>
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
            近期活動
          </h2>
          <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingEvents.map((ev) => (
            <Link
              key={ev.id}
              href={`/activity/${ev.id}`}
              className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
              style={{ background: "#fff", border: "1px solid var(--color-dust)" }}
            >
              <div
                className="aspect-[16/9] flex items-center justify-center"
                style={{ background: "var(--color-parchment)" }}
              >
                <span className="text-3xl opacity-20">📷</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[0.6em] px-2 py-0.5 rounded-full text-white"
                    style={{ background: ev.color }}
                  >
                    {ev.type}
                  </span>
                  <span className="text-[0.65em]" style={{ color: "var(--color-mist)" }}>{ev.date}</span>
                </div>
                <h3 className="text-sm font-medium line-clamp-2" style={{ color: "var(--color-ink)" }}>
                  {ev.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
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
