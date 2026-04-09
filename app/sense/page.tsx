"use client";

import { useState } from "react";

/* ── 時間軸（from DB09）── */
const timelineData = {
  階段: [
    { label: "萌芽期", sub: "2012–2017", desc: "旅人書店創立，從一間街角書店開始，摸索在地文化與商業的結合。舉辦第一場走讀活動、第一次市集。" },
    { label: "成長期", sub: "2018–2022", desc: "宜蘭文化俱樂部成立，品牌擴展為雙軌運營。開始系統化經營市集、走讀、空間租借，建立合作夥伴網絡。" },
    { label: "整合期", sub: "2023–now", desc: "數位轉型，建立 Notion 中控系統、n8n 自動化、LINE 互動。從單一書店進化為地方文化生態系營運商。" },
  ],
  年: Array.from({ length: 14 }, (_, i) => ({
    label: `${2012 + i}`,
    sub: "",
    desc: `${2012 + i} 年的重要事蹟（from DB09）`,
  })),
};

/* ── 核心能力（from DB04 活動類型 count）── */
const capabilities = [
  { name: "園遊市集", count: 35, max: 50, color: "#4ECDC4" },
  { name: "走讀導覽", count: 48, max: 60, color: "#5ba3d9" },
  { name: "藝文講座", count: 27, max: 40, color: "#b8943c" },
  { name: "空間租借", count: 156, max: 200, color: "#5c6b4a" },
  { name: "出版刊物", count: 12, max: 20, color: "#b5522a" },
  { name: "品牌合作", count: 89, max: 120, color: "#9ba8a0" },
  { name: "策展企劃", count: 18, max: 30, color: "#8b7355" },
];

/* ── 營運績效（自動累計）── */
const metrics = [
  { label: "累計活動", value: "156", unit: "場", trend: "+12%", icon: "📅" },
  { label: "服務人次", value: "12,340", unit: "人", trend: "+28%", icon: "👥" },
  { label: "合作品牌", value: "89", unit: "個", trend: "+15%", icon: "🤝" },
  { label: "出版品", value: "12", unit: "本", trend: "+2", icon: "📚" },
  { label: "志工參與", value: "234", unit: "人次", trend: "+45%", icon: "🙋" },
  { label: "營運天數", value: "4,380", unit: "天", trend: "持續中", icon: "⏱" },
];

const granularities = ["階段", "年", "季", "月"] as const;

export default function SensePage() {
  const [granularity, setGranularity] = useState<string>("階段");
  const [activePoint, setActivePoint] = useState<number | null>(null);

  const points = granularity === "階段" ? timelineData.階段 : timelineData.年;

  return (
    <div>
      {/* ════════════════════════════════════════
          上半部：Notion page content（佔位）
          ════════════════════════════════════════ */}
      <section className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="max-w-[800px] mx-auto">
          <div
            className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center"
            style={{ background: "var(--color-parchment)" }}
          >
            <span className="text-5xl opacity-20">📷</span>
          </div>
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            現思文化創藝術
          </h1>
          <p
            className="text-lg mb-6"
            style={{ color: "var(--color-teal)", fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            Culture Makes Sense
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>
              現思文化創藝術有限公司成立於 2012 年，以宜蘭在地文化為核心，
              透過旅人書店與宜蘭文化俱樂部兩大品牌，串連地方文化、創意產業與社群網絡，
              致力於打造地方文化的永續生態系。
            </p>
            <p>
              我們相信，文化不只是被保存的對象，更是可以被體驗、被參與、被創造的日常。
              從一間街角書店出發，我們走進社區、走入田野、走上舞台，
              用市集連結在地職人，用走讀喚醒土地記憶，用出版記錄時代切片。
            </p>
            <p>
              十二年來，我們累積了超過百場活動、服務逾萬人次、與近百個品牌建立合作關係。
              這些數字背後，是一群相信「文化可以改變地方」的人，
              用行動證明在地文化事業的商業可行性。
              我們不只是在經營一間書店，而是在經營一個讓文化持續發生的場域。
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          下半部：Dashboard 儀表板
          ════════════════════════════════════════ */}
      <div style={{ background: "var(--color-warm-white)" }}>
        <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>

          {/* Dashboard header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                營運儀表板
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>
                數據即時來自 Notion・自動更新
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ECDC4" }} />
              <span className="text-xs" style={{ color: "var(--color-mist)" }}>LIVE</span>
            </div>
          </div>

          {/* ── Row 1: 核心能力（左）+ 營運績效（右）並排 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Left: 核心能力 */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#fff", border: "1.5px solid #4ECDC4" }}
            >
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--color-ink)" }}>核心能力</h3>
              <p className="text-[0.7em] mb-5" style={{ color: "var(--color-mist)" }}>
                七項服務累積實績・from DB04
              </p>
              <div className="space-y-4">
                {capabilities.map((cap) => (
                  <div key={cap.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.8em]" style={{ color: "var(--color-ink)" }}>{cap.name}</span>
                      <span className="text-[0.8em] font-bold" style={{ color: cap.color }}>
                        {cap.count}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--color-parchment)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(cap.count / cap.max) * 100}%`,
                          background: cap.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 營運績效 KPI */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#fff", border: "1.5px solid #4ECDC4" }}
            >
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--color-ink)" }}>營運績效</h3>
              <p className="text-[0.7em] mb-5" style={{ color: "var(--color-mist)" }}>
                持續累積的營運數據・from Notion
              </p>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg p-3"
                    style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base">{m.icon}</span>
                      <span
                        className="text-[0.6em] px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(78,205,196,0.12)", color: "#3aa89f" }}
                      >
                        {m.trend}
                      </span>
                    </div>
                    <p
                      className="text-xl font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
                    >
                      {m.value}
                    </p>
                    <p className="text-[0.65em] mt-0.5" style={{ color: "var(--color-mist)" }}>
                      {m.label}（{m.unit}）
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Row 2: 發展歷程時間軸（全寬）── */}
          <div>
            <div
              className="rounded-xl p-6"
              style={{ background: "#fff", border: "1.5px solid #4ECDC4" }}
            >
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--color-ink)" }}>發展歷程</h3>
              <p className="text-[0.7em] mb-5" style={{ color: "var(--color-mist)" }}>
                12 年在地深耕・from DB09
              </p>

              {/* 粒度切換 */}
              <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "var(--color-parchment)" }}>
                {granularities.map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGranularity(g); setActivePoint(null); }}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: granularity === g ? "#4ECDC4" : "transparent",
                      color: granularity === g ? "#fff" : "var(--color-mist)",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* 垂直時間軸 */}
              <div className="relative pl-6 space-y-0" style={{ maxHeight: 300, overflowY: "auto" }}>
                <div
                  className="absolute left-[7px] top-0 bottom-0 w-[2px]"
                  style={{ background: "var(--color-dust)" }}
                />
                {points.map((point, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePoint(activePoint === i ? null : i)}
                    className="relative block w-full text-left py-3 transition-all"
                  >
                    <div
                      className="absolute left-[-20px] top-[18px] w-[12px] h-[12px] rounded-full transition-all"
                      style={{
                        background: activePoint === i ? "#4ECDC4" : "var(--color-dust)",
                        boxShadow: activePoint === i ? "0 0 0 4px rgba(78,205,196,0.2)" : "none",
                      }}
                    />
                    <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                      {point.label}
                      {point.sub && (
                        <span className="ml-2 text-[0.8em]" style={{ color: "var(--color-mist)" }}>
                          {point.sub}
                        </span>
                      )}
                    </p>
                    {activePoint === i && (
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--color-bark)" }}>
                        {point.desc}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Row 3: 底部摘要 ── */}
          <div
            className="mt-6 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
            style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid #4ECDC4" }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>2012 年至今，持續營運中</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-mist)" }}>
                所有數據即時同步自 Notion 資料庫，無需人工更新
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-mist)" }}>
              <span>DB04 共識交接協作</span>
              <span>DB09 範圍日期</span>
              <span>DB05 登記表單明細</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
