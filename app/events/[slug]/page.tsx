"use client";

import { useState } from "react";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";

// metadata moved to layout or generateMetadata in future

const routeStops = [
  { name: "旅人書店", desc: "宜蘭在地文化書店，走讀行旅的起點。", photo: null },
  { name: "羅東鎮", desc: "蘭陽平原南方的商業重鎮，夜市聞名全台。", photo: null },
  { name: "城隍廟", desc: "羅東鎮歷史悠久的信仰中心，見證地方發展。", photo: null },
  { name: "頭城老街", desc: "宜蘭最早開發的地區，保留清代街屋風貌。", photo: null },
];

export default function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const slug = "sample-event";

  return (
    <div>
      {/* SP-E0: Hero banner */}
      <div
        className="relative flex items-end"
        style={{
          background: "linear-gradient(135deg, var(--color-moss), #3a5230)",
          minHeight: 320,
          padding: "48px 40px",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 1160 }}>
          <p className="text-sm tracking-widest mb-2" style={{ color: "var(--color-mist)", fontFamily: "var(--font-sans)" }}>
            活動
          </p>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            活動名稱（{slug}）
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70 mt-1">
            <span>2026 年 5 月 1 日（四）09:00–17:00</span>
            <span>地點：宜蘭縣羅東鎮</span>
            <span>帶路人：<span className="text-white font-medium">帶路人名稱</span></span>
          </div>
          <p className="text-[0.7em] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>以上資訊來自 DB04</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-10 py-12" style={{ maxWidth: 1160 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Left: Event details */}
          <div>
            {/* Excerpt */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                關於這場活動
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                活動摘要（來自 DB04「簡介摘要」欄位）
              </p>
            </section>

            {/* Route — 每個地點可點擊彈出 DB08 觀點介紹 */}
            <section className="mb-8 relative">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                活動路線
              </h2>
              <div className="flex items-center flex-wrap gap-y-2">
                {routeStops.map((stop, i) => (
                  <div key={i} className="flex items-center">
                    {i > 0 && (
                      <span className="mx-2 text-sm" style={{ color: "var(--color-dust)" }}>→</span>
                    )}
                    <button
                      onClick={() => setPopupIndex(popupIndex === i ? null : i)}
                      className="relative px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:shadow-sm"
                      style={{
                        background: popupIndex === i ? "var(--color-teal)" : "var(--color-parchment)",
                        color: popupIndex === i ? "#fff" : "var(--color-bark)",
                        border: `1px solid ${popupIndex === i ? "var(--color-teal)" : "var(--color-dust)"}`,
                      }}
                    >
                      {stop.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Popup */}
              {popupIndex !== null && (
                <div
                  className="mt-3 rounded-lg overflow-hidden shadow-lg animate-in fade-in"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff", maxWidth: 400 }}
                >
                  {/* Photo placeholder */}
                  <div
                    className="h-[160px] flex items-center justify-center"
                    style={{ background: "var(--color-parchment)" }}
                  >
                    <span className="text-3xl opacity-20">📷</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                        {routeStops[popupIndex].name}
                      </h4>
                      <button
                        onClick={() => setPopupIndex(null)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: "var(--color-mist)" }}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-bark)" }}>
                      {routeStops[popupIndex].desc}
                    </p>
                    <p className="text-[0.7em] mt-2" style={{ color: "var(--color-mist)" }}>
                      資料來源：Notion DB08
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Full content */}
            <section className="mb-8">
              <div
                className="rounded-lg p-6 text-sm leading-relaxed"
                style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}
              >
                活動正文（來自 DB05 page content → HTML）
              </div>
            </section>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2">
              {["走讀行旅", "頭城", "文化資產"].map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Ticket + Add-ons sidebar (sticky, compact) */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
              <div className="p-4" style={{ background: "var(--color-warm-white)" }}>
                {/* 票券一列 */}
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>票券</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { name: "成人票", price: "$500" },
                    { name: "兒童票", price: "$250" },
                  ].map((t) => (
                    <div key={t.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                      <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{t.name}</p>
                      <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{t.price}</p>
                      <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                        <span className="w-5 h-6 flex items-center justify-center text-xs">0</span>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 加購一列 */}
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>加購</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "午餐便當", price: "$120" },
                    { name: "導覽手冊", price: "$50" },
                  ].map((a) => (
                    <div key={a.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                      <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{a.name}</p>
                      <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{a.price}</p>
                      <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                        <span className="w-5 h-6 flex items-center justify-center text-xs">0</span>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between mb-3">
                  <span className="text-sm" style={{ color: "var(--color-muted)" }}>合計</span>
                  <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>NT$ 0</span>
                </div>
                <button className="w-full h-10 rounded text-sm font-medium text-white" style={{ background: "var(--color-moss)" }}>
                  立即報名
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* 導購區 */}
        <div className="mx-auto px-10" style={{ maxWidth: 1160 }}>
          <AlsoWantToKnow />
          <MightAlsoLike />
        </div>
      </div>
    </div>
  );
}
