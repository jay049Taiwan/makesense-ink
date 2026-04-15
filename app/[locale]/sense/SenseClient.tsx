"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════
   核心能力 — 七項服務（品牌定位，靜態文字）
   ═══════════════════════════════════════════ */
const capabilities = [
  { name: "行旅走讀", color: "#5ba3d9", desc: "設計城鎮散步路線，以雙腳丈量土地，喚醒在地記憶" },
  { name: "風格市集", color: "#4ECDC4", desc: "策劃主題市集，串連在地職人與消費者的文化對話" },
  { name: "青創育成", color: "#e8935a", desc: "陪伴返鄉與移居青年，從品牌孵化到永續經營" },
  { name: "空間經營", color: "#5c6b4a", desc: "活化閒置空間，讓文化場域成為社區的客廳" },
  { name: "產品開發", color: "#b5522a", desc: "將地方故事轉化為選物與出版品，讓文化走進日常" },
  { name: "地方研究", color: "#b8943c", desc: "田野調查與文史考據，建立宜蘭在地知識資料庫" },
  { name: "主題策展", color: "#8b7355", desc: "為場域策展，創造沉浸式的地方文化體驗" },
];

interface Props {
  yearCounts: Record<number, number>;
}

export default function SenseClient({ yearCounts }: Props) {
  const [activeCap, setActiveCap] = useState<number | null>(null);

  // 從真實資料建立年度時間軸
  const years = Object.keys(yearCounts).map(Number).sort();
  const startYear = years.length > 0 ? years[0] : 2012;
  const endYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();

  // 累計活動數
  let cumulative = 0;
  const yearTimeline = [];
  for (let y = startYear; y <= endYear; y++) {
    const count = yearCounts[y] || 0;
    cumulative += count;
    if (count > 0) {
      yearTimeline.push({ year: y, count, cumulative });
    }
  }

  return (
    <>
      {/* ════════════════════════════════════════
          發展歷程（真實活動數據）
          ════════════════════════════════════════ */}
      {yearTimeline.length > 0 && (
        <section style={{ background: "#fff" }}>
          <div className="mx-auto px-4 py-10" style={{ maxWidth: 1200 }}>
            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--color-teal)" }}>發展歷程</h2>
            <div className="h-[1px] mb-6" style={{ background: "var(--color-teal)" }} />

            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <div className="flex items-end gap-3 pb-4" style={{ minWidth: yearTimeline.length * 80 }}>
                {yearTimeline.map((yt) => {
                  const maxCount = Math.max(...yearTimeline.map(y => y.count));
                  const height = Math.max(20, (yt.count / maxCount) * 150);
                  return (
                    <div key={yt.year} className="flex flex-col items-center" style={{ minWidth: 60 }}>
                      <span className="text-xs font-bold mb-1" style={{ color: "var(--color-ink)" }}>
                        {yt.count}
                      </span>
                      <div
                        className="rounded-t-md transition-all"
                        style={{
                          width: 36,
                          height,
                          background: "var(--color-teal)",
                          opacity: 0.7 + (yt.count / maxCount) * 0.3,
                        }}
                      />
                      <span className="text-[0.65em] mt-2" style={{ color: "var(--color-bark)" }}>
                        {yt.year}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[0.7em] text-center mt-4" style={{ color: "var(--color-mist)" }}>
              各年度已發佈活動場次（僅含已發佈的活動）
            </p>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          核心能力（品牌定位，靜態文字）
          ════════════════════════════════════════ */}
      <div style={{ background: "var(--color-warm-white)" }}>
        <div className="mx-auto px-4 py-12" style={{ maxWidth: 1000 }}>
          <div className="text-center mb-8">
            <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)" }}>— CORE CAPABILITIES —</p>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>核心能力</h2>
            <p className="text-sm" style={{ color: "var(--color-mist)" }}>以地方文化為核心，七項能力彼此串連、相互支撐</p>
          </div>

          {/* 核心能力環形圖 */}
          <div className="flex justify-center">
            <div className="relative mx-auto" style={{ width: 380, height: 380 }}>
              {/* SVG 連接線 */}
              <svg className="absolute inset-0" width="380" height="380" style={{ pointerEvents: "none" }}>
                {capabilities.map((cap, i) => {
                  const a1 = (i / 7) * Math.PI * 2 - Math.PI / 2;
                  const a2 = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2;
                  const r = 145;
                  const x1 = 190 + Math.cos(a1) * r;
                  const y1 = 190 + Math.sin(a1) * r;
                  const x2 = 190 + Math.cos(a2) * r;
                  const y2 = 190 + Math.sin(a2) * r;
                  const isAdj = activeCap !== null && (activeCap === i || activeCap === (i + 1) % 7);
                  return (
                    <line key={`link-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isAdj ? cap.color : "#d0c8bc"} strokeWidth={isAdj ? 2.5 : 1.5}
                      strokeDasharray={isAdj ? "none" : "6 4"} opacity={isAdj ? 1 : 0.5}
                    />
                  );
                })}
              </svg>

              {/* 中心文字 */}
              <div className="absolute flex flex-col items-center justify-center rounded-full" style={{ width: 80, height: 80, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--color-parchment)" }}>
                <span className="text-[0.65em] font-medium" style={{ color: "var(--color-bark)" }}>現思文化</span>
              </div>

              {/* 七個節點 */}
              {capabilities.map((cap, i) => {
                const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
                const r = 145;
                const x = 190 + Math.cos(angle) * r;
                const y = 190 + Math.sin(angle) * r;
                const isActive = activeCap === i;
                const size = isActive ? 76 : 62;
                return (
                  <button
                    key={cap.name}
                    onClick={() => setActiveCap(isActive ? null : i)}
                    className="absolute rounded-full flex flex-col items-center justify-center transition-all"
                    style={{
                      width: size,
                      height: size,
                      left: x,
                      top: y,
                      transform: "translate(-50%,-50%)",
                      background: isActive ? cap.color : "var(--color-parchment)",
                      border: `2px solid ${isActive ? cap.color : "#c8bfb0"}`,
                      zIndex: isActive ? 10 : 1,
                      boxShadow: isActive ? `0 4px 16px ${cap.color}40` : "none",
                    }}
                  >
                    <span style={{ fontSize: isActive ? 12 : 10, fontWeight: 700, lineHeight: 1, color: isActive ? "#fff" : "var(--color-ink)" }}>{cap.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選中的能力詳情 */}
          <div className="mt-4 text-center" style={{ minHeight: 48 }}>
            {activeCap !== null ? (
              <div className="rounded-lg px-4 py-3 mx-auto" style={{ maxWidth: 340, background: "#fff", border: `1.5px solid ${capabilities[activeCap].color}30` }}>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink)" }}>
                  {capabilities[activeCap].desc}
                </p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-mist)" }}>點擊任一節點，了解該項能力</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
