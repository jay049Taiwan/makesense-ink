"use client";

import { useState } from "react";
import Calendar from "@/components/calendar/Calendar";
import RegistrationModal from "@/components/booking/RegistrationModal";

/* ── 走讀旅行假資料（from DB04）── */
const tourStats = {
  total: 48,
  keywords: ["頭城", "礁溪", "羅東", "冬山", "蘇澳", "三星", "員山", "大同", "南澳", "壯圍"],
};

/* ── 地點假資料（from DB08）── */
const regions = ["溪北", "溪南", "縣外"] as const;

const locations: Record<string, { name: string; type: string }[]> = {
  溪北: [
    { name: "頭城老街", type: "老街" },
    { name: "蘭陽博物館", type: "博物館" },
    { name: "外澳沙灘", type: "海岸" },
    { name: "礁溪溫泉公園", type: "溫泉" },
    { name: "林美石磐步道", type: "步道" },
    { name: "金車城堡", type: "景點" },
    { name: "壯圍沙丘", type: "地景" },
    { name: "員山機堡", type: "古蹟" },
    { name: "宜蘭酒廠", type: "觀光工廠" },
    { name: "幾米廣場", type: "藝文" },
  ],
  溪南: [
    { name: "羅東林場", type: "林場" },
    { name: "冬山河親水公園", type: "公園" },
    { name: "傳藝中心", type: "文化園區" },
    { name: "梅花湖", type: "湖泊" },
    { name: "三星青蔥文化館", type: "觀光工廠" },
    { name: "羅東夜市", type: "夜市" },
    { name: "安農溪分洪堰", type: "水利" },
    { name: "冬山舊車站", type: "車站" },
  ],
  縣外: [
    { name: "九份老街", type: "老街" },
    { name: "平溪線", type: "鐵道" },
    { name: "福隆海水浴場", type: "海岸" },
    { name: "草嶺古道", type: "步道" },
  ],
};

const typeIcons: Record<string, string> = {
  老街: "🏘", 博物館: "🏛", 海岸: "🏖", 溫泉: "♨️", 步道: "🥾",
  景點: "📍", 地景: "🏜", 古蹟: "🏯", 觀光工廠: "🏭", 藝文: "🎨",
  林場: "🌲", 公園: "🌿", 文化園區: "🎭", 湖泊: "🏞", 夜市: "🌃",
  水利: "💧", 車站: "🚉", 鐵道: "🚂",
};

export default function SpaceBookingPage() {
  const [activeRegion, setActiveRegion] = useState<string>("溪北");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：Notion page content（佔位）═══ */}
      <section className="py-12">
        <div className="max-w-[800px] mx-auto">
          {/* 照片 */}
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
            空間場域
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
              至今我們已累積超過 {tourStats.total} 場走讀旅行，
              足跡遍及宜蘭 12 鄉鎮以及鄰近縣市。
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 下半部 ═══ */}

      {/* ── 1. 走讀旅行總覽 ── */}
      <section className="py-8" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="md:flex md:gap-8 md:items-start">
          {/* 左：總數大字 */}
          <div
            className="rounded-xl p-6 text-center mb-6 md:mb-0 md:w-[240px] flex-shrink-0"
            style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}
          >
            <p className="text-sm mb-2" style={{ color: "var(--color-mist)" }}>累計走讀旅行</p>
            <p
              className="text-5xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {tourStats.total}
            </p>
            <p className="text-sm" style={{ color: "var(--color-teal)" }}>場・from DB04</p>
          </div>

          {/* 右：相關關鍵字 */}
          <div className="flex-1">
            <h2 className="text-[1.3em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
              走讀旅行關鍵字
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>
              我們走過的主題與地區・from DB08
            </p>
            <div className="flex flex-wrap gap-2">
              {tourStats.keywords.map((kw) => (
                <a
                  key={kw}
                  href={`/viewpoint/${kw}`}
                  className="px-4 py-2 rounded-full text-sm transition-all hover:shadow-sm"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)", border: "1px solid var(--color-dust)" }}
                >
                  {kw}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. 我們去過的地點（分頁 + 橫向滑動 icon）── */}
      <section className="py-8 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          我們去過的地方
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--color-mist)" }}>
          足跡遍及宜蘭 12 鄉鎮及鄰近縣市・from DB08
        </p>

        {/* 分頁 Tab：溪北 / 溪南 / 縣外 */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--color-parchment)", width: "fit-content" }}>
          {regions.map((r) => (
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
              <span className="ml-1 text-xs opacity-70">({locations[r].length})</span>
            </button>
          ))}
        </div>

        {/* 地點 icon 橫向滑動 */}
        <div className="hscroll-track">
          {locations[activeRegion].map((loc) => (
            <a
              key={loc.name}
              href={`/viewpoint/${loc.name}`}
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

      {/* ── 3. 空間租借行事曆 ── */}
      <section className="py-8 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          空間租借
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
          點選可預約的日期，進入租借表單
        </p>
        <Calendar
          mode="space"
          selectedDate={selectedDate}
          onDateClick={(date) => {
            setSelectedDate(date);
            setShowBooking(true);
          }}
        />
      </section>

      {/* 空間租借彈出表單 */}
      <RegistrationModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        formType="空間"
        eventTitle="空間租借"
        ticketSummary={selectedDate ? `預約日期：${selectedDate}` : ""}
      />
    </div>
  );
}
