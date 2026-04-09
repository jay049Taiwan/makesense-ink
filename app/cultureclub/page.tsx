import type { Metadata } from "next";
import Link from "next/link";
import Calendar from "@/components/calendar/Calendar";

export const metadata: Metadata = {
  title: "宜蘭文化俱樂部",
  description: "宜蘭文化俱樂部 — 集結宜蘭在地的文化力量，建構屬於宜蘭人的文化社群。",
};

/* ── 假資料（之後接 Notion API）── */

const sampleEvents = [
  { id: 1, title: "森本集市 第02場｜五月春日篇", date: "2026-05-01", category: "市集" },
  { id: 2, title: "走讀行旅：頭城老街人文散步", date: "2026-05-10", category: "走讀" },
  { id: 3, title: "宜蘭文學講座：黃春明的世界", date: "2026-05-15", category: "講座" },
  { id: 4, title: "手作工坊：藺草編織體驗", date: "2026-05-20", category: "手作" },
  { id: 5, title: "蘭陽平原攝影散步", date: "2026-05-25", category: "走讀" },
];

const samplePosts = [
  { id: 1, title: "清明時節：宜蘭的祭祀文化與地方記憶", date: "2026-04-05" },
  { id: 2, title: "宜蘭線鐵路的百年故事", date: "2026-03-25" },
  { id: 3, title: "從頭城到蘇澳：東北角海岸線散策", date: "2026-03-18" },
  { id: 4, title: "三星蔥的四季：一位蔥農的日常", date: "2026-03-10" },
  { id: 5, title: "冬山河的前世今生", date: "2026-03-02" },
];

const sampleKeywords = [
  { name: "宜蘭線鐵路", count: 8 },
  { name: "礁溪溫泉", count: 12 },
  { name: "龜山島", count: 6 },
  { name: "蘭陽博物館", count: 10 },
];

const contextKeywords = [
  { title: "宜蘭的水文地景", keywords: ["冬山河", "蘭陽溪", "得子口溪", "安農溪"] },
  { title: "百年產業記憶", keywords: ["宜蘭酒廠", "太平山林場", "蘇澳港", "礁溪溫泉"] },
  { title: "在地信仰巡禮", keywords: ["昭應宮", "慶安宮", "頭城搶孤", "利澤簡走尪"] },
  { title: "文學裡的宜蘭", keywords: ["黃春明", "簡媜", "吳明益", "林美吟"] },
];

const sampleGoods = [
  { id: 1, title: "宜蘭手工皂禮盒", price: 580 },
  { id: 2, title: "龜山島明信片組", price: 150 },
  { id: 3, title: "藺草杯墊", price: 220 },
  { id: 4, title: "旅人帆布袋", price: 350 },
  { id: 5, title: "宜蘭在地蜂蜜", price: 480 },
  { id: 6, title: "手繪宜蘭地圖海報", price: 260 },
];

const quizKeywords = ["宜蘭線鐵路", "礁溪溫泉", "龜山島", "蘭陽博物館", "頭城搶孤", "冬山河親水公園", "太平山", "三星蔥"];

const eventCatStyles: Record<string, { bg: string; text: string }> = {
  市集: { bg: "#FFF3E0", text: "#E65100" },
  走讀: { bg: "#E8F5E9", text: "#2E7D32" },
  講座: { bg: "#E3F2FD", text: "#1565C0" },
  手作: { bg: "#FCE4EC", text: "#C62828" },
};

export default function CultureClubPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: 近期活動（大圖輪播）── */}
      <section className="py-8">
        <div className="hscroll-track gap-0">
          {sampleEvents.map((ev) => {
            const cat = eventCatStyles[ev.category] || eventCatStyles["走讀"];
            return (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="flex-shrink-0 w-full rounded-lg overflow-hidden relative"
                style={{ minWidth: "100%" }}
              >
                <div
                  className="flex items-end p-8 rounded-lg"
                  style={{
                    height: 360,
                    background: "linear-gradient(135deg, #f2ede6, #e8e0d4)",
                  }}
                >
                  <div>
                    <span
                      className="inline-block text-[0.8em] px-3 py-1 rounded-full mb-3"
                      style={{ background: cat.bg, color: cat.text }}
                    >
                      {ev.category}
                    </span>
                    <h2
                      className="text-2xl sm:text-3xl font-bold mb-1"
                      style={{ color: "#1a1612", fontFamily: "'Noto Serif TC', serif" }}
                    >
                      {ev.title}
                    </h2>
                    <p className="text-sm" style={{ color: "#8b7355" }}>{ev.date}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 區塊 3: 地方通訊（最新文章橫向滑動）── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>地方通訊</h2>
        <div className="hscroll-track">
          {samplePosts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="flex-shrink-0 w-[280px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                <span className="text-3xl opacity-20">📰</span>
              </div>
              <div className="p-3">
                <h3 className="text-[0.9em] line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{post.title}</h3>
                <p className="text-[0.75em]" style={{ color: "#999" }}>{post.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 區塊 4: 話題熱搜 ── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>話題熱搜</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleKeywords.map((kw) => (
            <Link
              key={kw.name}
              href={`/viewpoint-stroll?keyword=${kw.name}`}
              className="rounded-lg p-5 transition-shadow hover:shadow-md"
              style={{ background: "#faf8f5", border: "1px solid #e8e0d4" }}
            >
              <h3 className="text-lg font-semibold mb-1" style={{ color: "#1a1612" }}>{kw.name}</h3>
              <p className="text-xs" style={{ color: "#8b7355" }}>{kw.count} 篇相關內容</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 區塊 5-8: 脈絡觀點 ×4 ── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>脈絡觀點</h2>
        <div className="space-y-6">
          {contextKeywords.map((group, i) => (
            <div key={i}>
              <h3 className="text-[1.1em] font-semibold mb-3" style={{ color: "#1a1612" }}>
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.keywords.map((kw) => (
                  <Link
                    key={kw}
                    href={`/viewpoint-stroll?keyword=${kw}`}
                    className="px-4 py-2 rounded-full text-sm transition-all hover:shadow-sm"
                    style={{ background: "#f2ede6", color: "#7a6248", border: "1px solid #e8e0d4" }}
                  >
                    {kw}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 區塊 9: 選書選物（橫向滑動）── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>選書選物</h2>
        <div className="hscroll-track">
          {sampleGoods.map((g) => (
            <Link
              key={g.id}
              href={`/product/${g.id}`}
              className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-square flex items-center justify-center" style={{ background: "#f2ede6" }}>
                <span className="text-3xl opacity-20">🎁</span>
              </div>
              <div className="p-2.5">
                <h3 className="text-[0.85em] line-clamp-1" style={{ color: "#1a1612" }}>{g.title}</h3>
                <p className="text-[0.8em] font-medium mt-0.5" style={{ color: "#b5522a" }}>NT$ {g.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 活動行事曆（Footer 上方）── */}
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>活動行事曆</h2>
        <Calendar mode="default" />
      </section>
    </div>
  );
}
