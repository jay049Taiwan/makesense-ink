import type { Metadata } from "next";
import Link from "next/link";
import Calendar from "@/components/calendar/Calendar";

export const metadata: Metadata = {
  title: "旅人書店",
  description:
    "旅人書店 — 宜蘭在地文化書店，提供展售合作、空間體驗、文化活動。",
};

/* ── 假資料（之後接 Notion API）── */

const sampleProducts = [
  { id: 1, title: "宜蘭散步地圖", price: 380, image: null },
  { id: 2, title: "蘭陽風土誌", price: 450, image: null },
  { id: 3, title: "旅人書店選書：山與海之間", price: 320, image: null },
  { id: 4, title: "宜蘭老街巡禮", price: 280, image: null },
];

const sampleNews = [
  {
    id: 1,
    date: "2026-04-08",
    type: "活動" as const,
    title: "森本集市 第02場｜五月春日篇",
  },
  {
    id: 2,
    date: "2026-04-05",
    type: "文章" as const,
    title: "清明時節：宜蘭的祭祀文化與地方記憶",
  },
  {
    id: 3,
    date: "2026-04-01",
    type: "商品" as const,
    title: "新書上架：《蘭陽平原的水路地景》",
  },
  {
    id: 4,
    date: "2026-03-28",
    type: "活動" as const,
    title: "走讀行旅：頭城老街人文散步",
  },
];

const samplePerspectives = [
  { id: 1, name: "黃春明", count: 12 },
  { id: 2, name: "林美吟", count: 8 },
  { id: 3, name: "陳阿土", count: 5 },
  { id: 4, name: "旅人選書", count: 23 },
];

const newsTypeStyles: Record<string, { bg: string; text: string }> = {
  文章: { bg: "#E8F5E9", text: "#2E7D32" },
  活動: { bg: "#FFF3E0", text: "#E65100" },
  商品: { bg: "#E3F2FD", text: "#1565C0" },
};

const yilanTowns = [
  "宜蘭市",
  "羅東鎮",
  "頭城鎮",
  "礁溪鄉",
  "壯圍鄉",
  "員山鄉",
  "蘇澳鎮",
  "三星鄉",
  "冬山鄉",
  "五結鄉",
  "大同鄉",
  "南澳鄉",
];

export default function BookstorePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4">
      {/* ── Section 1: 商品輪播 ── */}
      <section className="py-12">
        <h2 className="text-[1.5em] font-bold text-[#333] mb-6">推薦選品</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sampleProducts.map((product) => (
            <Link
              key={product.id}
              href={`/bookstore/product/${product.id}`}
              className="group bg-white rounded-lg border border-[#eee] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
            >
              {/* Image placeholder (1:1) */}
              <div className="aspect-square bg-brand-cream flex items-center justify-center">
                <span className="text-4xl text-brand-tan/40">📚</span>
              </div>
              <div className="p-3">
                <h3 className="text-[0.9em] font-medium text-[#333] line-clamp-2 group-hover:text-brand-teal transition-colors">
                  {product.title}
                </h3>
                <p className="text-[0.85em] text-brand-orange mt-1">
                  NT$ {product.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Section 2: 觀點漫遊 ── */}
      <section className="py-8">
        <h2 className="text-[1.5em] font-bold text-[#333] mb-6">觀點漫遊</h2>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {samplePerspectives.map((person) => (
            <Link
              key={person.id}
              href={`/bookstore/perspective/${person.id}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <div
                className="w-[90px] h-[90px] rounded-full flex items-center justify-center text-2xl border-3 border-[#EBE5DA] group-hover:border-[#C87941] transition-colors"
                style={{ background: "#F0EAE0" }}
              >
                👤
              </div>
              <span className="text-[0.9em] text-[#333] text-center max-w-[90px] line-clamp-2">
                {person.name}
              </span>
              <span className="text-[0.75em] text-[#B5AA9A]">
                {person.count} 篇
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Section 3: 探索宜蘭地圖 ── */}
      <section className="py-8">
        <h2 className="text-[1.5em] font-bold text-[#333] mb-6">探索宜蘭</h2>
        <div className="flex gap-4">
          {/* Sidebar: town buttons */}
          <div className="hidden sm:flex flex-col gap-2 w-[130px] flex-shrink-0">
            {yilanTowns.map((town) => (
              <button
                key={town}
                className="px-3 py-2 text-left text-[0.85em] rounded-[7px] bg-[#f7f7f7] border border-[#eee] hover:bg-[#e8faf9] hover:border-brand-teal hover:text-brand-teal transition-all"
              >
                {town}
              </button>
            ))}
          </div>

          {/* Map area */}
          <div className="flex-1">
            <div
              className="rounded-lg border border-[#eee] flex items-center justify-center text-muted"
              style={{ minHeight: 350, background: "#f9f7f4" }}
            >
              <div className="text-center">
                <p className="text-lg mb-1">🗺️ 宜蘭互動地圖</p>
                <p className="text-sm">D3.js 鄉鎮地圖（接 Notion 資料後啟用）</p>
              </div>
            </div>

            {/* Cards grid below map */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mt-6">
              {[
                { badge: "活動", badgeBg: "#FFF3E0", badgeText: "#E65100" },
                { badge: "景點", badgeBg: "#E8F5E9", badgeText: "#2E7D32" },
                { badge: "商家", badgeBg: "#E3F2FD", badgeText: "#1565C0" },
                { badge: "美食", badgeBg: "#FCE4EC", badgeText: "#C62828" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-[#eee] overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-brand-cream flex items-center justify-center">
                    <span className="text-3xl text-brand-tan/30">📍</span>
                  </div>
                  <div className="p-3">
                    <span
                      className="inline-block text-[0.77em] px-2 py-0.5 rounded-[3px] mb-1"
                      style={{
                        background: item.badgeBg,
                        color: item.badgeText,
                      }}
                    >
                      {item.badge}
                    </span>
                    <h3 className="text-[0.9em] text-[#333] line-clamp-2">
                      {item.badge}名稱待填
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: 新聞公告 ── */}
      <section className="py-8">
        <h2 className="text-[1.5em] font-bold text-[#333] mb-6">最新消息</h2>
        <div className="space-y-0">
          {sampleNews.map((news) => {
            const style = newsTypeStyles[news.type] || newsTypeStyles["文章"];
            return (
              <Link
                key={news.id}
                href={`/bookstore/news/${news.id}`}
                className="flex items-start gap-4 py-4 border-b border-[#eee] hover:bg-brand-cream/50 transition-colors px-2 -mx-2 rounded"
              >
                <div className="flex-shrink-0 min-w-[140px]">
                  <span className="text-[0.8em] text-[#999]">{news.date}</span>
                  <span
                    className="inline-block ml-2 text-[0.85em] px-2 py-0.5 rounded-[3px]"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {news.type}
                  </span>
                </div>
                <span className="text-[0.95em] text-[#333] hover:text-brand-teal transition-colors">
                  {news.title}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Section 5: 活動行事曆 ── */}
      <section className="py-8 pb-16">
        <h2 className="text-[1.5em] font-bold text-[#333] mb-6">
          活動行事曆
        </h2>
        <Calendar mode="default" />
      </section>

      {/* ── Quick links ── */}
      <section className="pb-16">
        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href="/bookstore/market-booking"
            className="group rounded-lg border border-[#eee] p-6 hover:shadow-md transition-shadow bg-white"
          >
            <h2 className="text-xl font-semibold text-brand-orange group-hover:text-brand-brown transition-colors mb-2">
              展售合作
            </h2>
            <p className="text-muted text-sm">
              森本集市攤位報名、品牌合作方案
            </p>
          </Link>
          <Link
            href="/bookstore/space-booking"
            className="group rounded-lg border border-[#eee] p-6 hover:shadow-md transition-shadow bg-white"
          >
            <h2 className="text-xl font-semibold text-brand-orange group-hover:text-brand-brown transition-colors mb-2">
              空間體驗
            </h2>
            <p className="text-muted text-sm">
              文化園區空間租借、活動場地預約
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
