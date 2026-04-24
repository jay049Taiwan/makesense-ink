import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "旅人書店/宜蘭文化俱樂部",
  description: "現思文化創藝術有限公司 — 旅人書店、宜蘭文化俱樂部，以宜蘭在地文化為核心，打造地方文化永續生態系。",
};

export default function HomePage() {
  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4"
        style={{ minHeight: "80vh", background: "linear-gradient(180deg, var(--color-warm-white) 0%, #fff 100%)" }}
      >
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
            前往宜蘭文化俱樂部
          </Link>
        </div>
      </section>
    </div>
  );
}
