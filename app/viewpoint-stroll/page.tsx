"use client";

import type { Metadata } from "next";
import { useState } from "react";

const types = ["全部", "地方", "主題", "人物", "單位"];
const categories = ["書籍", "商品", "活動", "文章", "預約"];
const sortOptions = ["預設", "最新", "價格", "瀏覽數"];

const sampleKeywords = [
  "黃春明", "宜蘭線鐵路", "蘭東案內", "礁溪溫泉", "頭城老街",
  "三星蔥", "冬山河", "龜山島", "宜蘭酒廠", "羅東夜市",
];

const sampleItems = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `內容項目 ${i + 1}`,
  type: categories[i % categories.length],
  date: "2026-04-01",
  image: null,
}));

export default function ViewpointStrollPage() {
  const [activeType, setActiveType] = useState("全部");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState("預設");

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1
        className="text-[1.5em] font-bold mb-6"
        style={{ color: "var(--color-ink)" }}
      >
        觀點漫遊
      </h1>

      {/* Vp-S1: Keyword carousel */}
      <div className="hscroll-track mb-6">
        {sampleKeywords.map((kw) => (
          <button
            key={kw}
            className="flex-shrink-0 px-4 py-2 rounded-full border text-sm transition-all"
            style={{
              borderColor: "var(--color-dust)",
              background: "var(--color-warm-white)",
              color: "var(--color-bark)",
            }}
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Vp-S2: Type tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background:
                activeType === t ? "var(--color-teal)" : "var(--color-warm-white)",
              color: activeType === t ? "#fff" : "var(--color-muted)",
              border: `1px solid ${activeType === t ? "var(--color-teal)" : "var(--color-dust)"}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Vp-S3: Keyword capsules */}
      <div className="hscroll-track mb-6">
        {sampleKeywords.slice(0, 6).map((kw) => (
          <span
            key={kw}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs"
            style={{
              background: "var(--color-parchment)",
              color: "var(--color-bark)",
            }}
          >
            {kw}
          </span>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Vp-S4: Category sidebar */}
        <aside className="hidden lg:block w-[160px] flex-shrink-0">
          <div
            className="sticky top-20 rounded-lg p-4"
            style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-bark)" }}>
              內容類別
            </p>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className="block w-full text-left px-2 py-1.5 rounded text-sm transition-colors"
                style={{
                  color: activeCategory === cat ? "var(--color-teal)" : "var(--color-muted)",
                  fontWeight: activeCategory === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Vp-S5: Sort controls */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>
              共 {sampleItems.length} 筆
            </span>
            <div className="flex gap-1">
              {sortOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSort(s)}
                  className="px-2 py-1 text-xs rounded transition-colors"
                  style={{
                    background: activeSort === s ? "var(--color-ink)" : "transparent",
                    color: activeSort === s ? "#fff" : "var(--color-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Vp-S6: Content grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sampleItems.map((item) => {
              const badgeMap: Record<string, { bg: string; text: string }> = {
                書籍: { bg: "var(--color-badge-product-bg)", text: "var(--color-badge-product-text)" },
                商品: { bg: "var(--color-badge-product-bg)", text: "var(--color-badge-product-text)" },
                活動: { bg: "var(--color-badge-event-bg)", text: "var(--color-badge-event-text)" },
                文章: { bg: "var(--color-badge-article-bg)", text: "var(--color-badge-article-text)" },
                預約: { bg: "var(--color-badge-experience-bg)", text: "var(--color-badge-experience-text)" },
              };
              const badge = badgeMap[item.type] || badgeMap["文章"];
              return (
                <div
                  key={item.id}
                  className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
                >
                  <div
                    className="aspect-[4/3] flex items-center justify-center"
                    style={{ background: "var(--color-parchment)" }}
                  >
                    <span className="text-2xl opacity-30">📄</span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex-shrink-0 text-[0.7em] px-1.5 py-0.5 rounded-[3px]"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {item.type}
                      </span>
                      <h3
                        className="text-[0.85em] line-clamp-1"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
