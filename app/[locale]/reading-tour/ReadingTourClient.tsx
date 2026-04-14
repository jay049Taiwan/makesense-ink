"use client";

import { useState } from "react";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

interface LocationItem { name: string; type: string; slug: string }
interface KeywordItem { name: string; slug: string }

const typeIcons: Record<string, string> = {
  老街: "🏘", 博物館: "🏛", 海岸: "🏖", 溫泉: "♨️", 步道: "🥾",
  景點: "📍", 地景: "🏜", 古蹟: "🏯", 觀光工廠: "🏭", 藝文: "🎨",
  林場: "🌲", 公園: "🌿", 文化園區: "🎭", 湖泊: "🏞", 夜市: "🌃",
  水利: "💧", 車站: "🚉", 鐵道: "🚂", 空間: "🏠", 場域: "🎯",
  關鍵字: "🔑", tag: "🏷",
};

export default function ReadingTourClient({
  keywords,
  regions,
  tourTotal,
}: {
  keywords: KeywordItem[];
  regions: Record<string, LocationItem[]>;
  tourTotal: number;
}) {
  const regionNames = Object.keys(regions).filter(r => regions[r].length > 0);
  const [activeRegion, setActiveRegion] = useState<string>(regionNames[0] || "溪北");

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：文案 ═══ */}
      <section className="py-12">
        <div className="max-w-[1000px] mx-auto">
          <div
            className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center"
            style={{ background: "var(--color-parchment)" }}
          >
            <ImagePlaceholder type="default" />
          </div>
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            走讀漫遊
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)" }}>
            走進宜蘭的每一個角落
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>
              我們相信，最好的學習發生在移動之中。自 2012 年起，旅人書店持續策劃走讀旅行，
              帶領參與者用腳步丈量宜蘭的土地，用眼睛閱讀在地的故事。
              從頭城到南澳，從溪北到溪南，每一條路線都是一堂活的文化課。
            </p>
            <p>
              我們的走讀不只是導覽，而是一場有脈絡的文化體驗。
              每一趟旅程都結合了在地職人、歷史場域、自然生態與人文敘事，
              讓參與者不只是經過，而是真正理解這片土地。
              至今我們已累積超過 {tourTotal} 個走讀主題，
              足跡遍及宜蘭 12 鄉鎮以及鄰近縣市。
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 下半部 ═══ */}

      {/* ── 1. 走讀旅行總覽 ── */}
      <section className="py-8" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="md:flex md:gap-8 md:items-start">
          <div
            className="rounded-xl p-6 text-center mb-6 md:mb-0 md:w-[240px] flex-shrink-0"
            style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}
          >
            <p className="text-sm mb-2" style={{ color: "var(--color-mist)" }}>累計走讀主題</p>
            <p
              className="text-5xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {tourTotal}
            </p>
            <p className="text-sm" style={{ color: "var(--color-teal)" }}>個</p>
          </div>

          <div className="flex-1">
            <h2 className="text-[1.3em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
              走讀旅行關鍵字
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>
              我們走過的主題與地區
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <a
                  key={kw.slug}
                  href={`/viewpoint/${kw.slug}`}
                  className="px-4 py-2 rounded-full text-sm transition-all hover:shadow-sm"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)", border: "1px solid var(--color-dust)" }}
                >
                  {kw.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. 我們去過的地點 ── */}
      <section className="py-8 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          我們去過的地方
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--color-mist)" }}>
          足跡遍及宜蘭 12 鄉鎮及鄰近縣市
        </p>

        {regionNames.length > 0 && (
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--color-parchment)", width: "fit-content" }}>
            {regionNames.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRegion(r)}
                className="px-5 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: activeRegion === r ? "var(--color-teal)" : "transparent",
                  color: activeRegion === r ? "#fff" : "var(--color-mist)",
                }}
              >
                {r}
                <span className="ml-1 text-xs opacity-70">({regions[r]?.length || 0})</span>
              </button>
            ))}
          </div>
        )}

        <div className="hscroll-track">
          {(regions[activeRegion] || []).map((loc) => (
            <a
              key={loc.slug}
              href={`/viewpoint/${loc.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 px-2 group"
              style={{ width: 100 }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all group-hover:scale-110 group-hover:shadow-md"
                style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}
              >
                {typeIcons[loc.type] || "📍"}
              </div>
              <span
                className="text-[0.75em] text-center line-clamp-1 font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                {loc.name}
              </span>
              <span className="text-[0.6em]" style={{ color: "var(--color-mist)" }}>
                {loc.type}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
