import type { Metadata } from "next";
import Link from "next/link";
import Calendar from "@/components/calendar/Calendar";
import HeroCarousel from "@/components/ui/HeroCarousel";

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

// 話題觀點（from DB08 觀點），每個觀點下有相關的文章/商品/活動
const viewpointTopics = [
  {
    name: "宜蘭的水文地景",
    items: [
      { type: "文章", title: "冬山河的前世今生", date: "2026-03-02", id: "art-1" },
      { type: "書籍", title: "蘭東案內 05期", price: 250, author: "旅人書店", id: "p2" },
      { type: "活動", title: "走讀行旅｜冬山河自行車道", date: "2026/03/15", id: "a5" },
      { type: "商品", title: "加購宜蘭街散步圖", price: 50, id: "p5" },
    ],
  },
  {
    name: "百年產業記憶",
    items: [
      { type: "文章", title: "宜蘭線鐵路的百年故事", date: "2026-03-25", id: "art-2" },
      { type: "書籍", title: "宜蘭金牌旅遊王", price: 259, author: "黃育智", id: "p4" },
      { type: "活動", title: "講座｜宜蘭的前世今生", date: "2026/04/28", id: "a3" },
    ],
  },
  {
    name: "在地信仰巡禮",
    items: [
      { type: "文章", title: "清明時節：宜蘭的祭祀文化與地方記憶", date: "2026-04-05", id: "art-3" },
      { type: "活動", title: "走讀行旅｜宜蘭舊城散步", date: "2026/04/21", id: "a1" },
    ],
  },
  {
    name: "文學裡的宜蘭",
    items: [
      { type: "書籍", title: "旅行的意義", price: 380, author: "詹宏志", id: "p10" },
      { type: "文章", title: "三星蔥的四季：一位蔥農的日常", date: "2026-03-10", id: "art-4" },
      { type: "書籍", title: "蘭東案內 04期", price: 250, author: "旅人書店", id: "p1" },
      { type: "活動", title: "宜蘭文學講座：黃春明的世界", date: "2026/05/15", id: "a-lit" },
    ],
  },
];

const sampleGoods = [
  { id: "p1", title: "蘭東案內 04期", price: 250, author: "旅人書店", publisher: "旅人書店" },
  { id: "p2", title: "蘭東案內 05期", price: 250, author: "旅人書店", publisher: "旅人書店" },
  { id: "p5", title: "加購宜蘭街散步圖", price: 50, author: "旅人書店", publisher: "旅人書店" },
  { id: "p6", title: "散步宜蘭街貼紙", price: 30, author: "—", publisher: "旅人書店" },
  { id: "p4", title: "宜蘭金牌旅遊王", price: 259, author: "黃育智", publisher: "玉山社" },
  { id: "p10", title: "旅行的意義", price: 380, author: "詹宏志", publisher: "新經典" },
];

const eventCatStyles: Record<string, { bg: string; text: string }> = {
  市集: { bg: "#FFF3E0", text: "#E65100" },
  走讀: { bg: "#E8F5E9", text: "#2E7D32" },
  講座: { bg: "#E3F2FD", text: "#1565C0" },
  手作: { bg: "#FCE4EC", text: "#C62828" },
  文章: { bg: "#F3E5F5", text: "#6A1B9A" },
  書籍: { bg: "#FFF8E1", text: "#F57F17" },
  商品: { bg: "#E0F2F1", text: "#00695C" },
  活動: { bg: "#E8F5E9", text: "#2E7D32" },
};

export default function CultureClubPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: Hero 輪播 ── */}
      <section className="py-8">
        <HeroCarousel slides={sampleEvents.map((ev) => ({
          image: null,
          title: ev.title,
          subtitle: ev.date,
          cta: { text: "了解更多", href: `/events/${ev.id}` },
        }))} />
      </section>

      {/* ── 區塊 2: 近期活動（原「地方通訊」）── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>近期活動</h2>
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

      {/* ── 區塊 3: 地方通訊（原「話題熱搜」）── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>地方通訊</h2>
        <div className="hscroll-track">
          {[
            { name: "宜蘭線鐵路", count: 8 },
            { name: "礁溪溫泉", count: 12 },
            { name: "龜山島", count: 6 },
            { name: "蘭陽博物館", count: 10 },
          ].map((kw) => (
            <Link
              key={kw.name}
              href={`/viewpoint-stroll?keyword=${kw.name}`}
              className="flex-shrink-0 w-[280px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                <span className="text-3xl opacity-20">💡</span>
              </div>
              <div className="p-3">
                <h3 className="text-[0.9em] font-semibold line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{kw.name}</h3>
                <p className="text-[0.75em]" style={{ color: "#8b7355" }}>{kw.count} 篇相關內容</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 區塊 4: 話題觀點（原「脈絡觀點」）── 跟書店「主題策展」同格式 */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-6" style={{ color: "#1a1612" }}>話題觀點</h2>
        <div className="space-y-8">
          {viewpointTopics.map((topic) => (
            <div key={topic.name}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[1.1em] font-semibold" style={{ color: "#1a1612" }}>{topic.name}</h3>
                <Link href={`/viewpoint-stroll?keyword=${topic.name}`} className="text-xs" style={{ color: "#4ECDC4" }}>查看全部 →</Link>
              </div>
              <div className="hscroll-track">
                {topic.items.map((item) => {
                  const typeMap: Record<string, string> = { "文章": "內容", "書籍": "選書", "商品": "選物", "活動": "活動", "觀點": "觀點" };
                  const label = typeMap[item.type] || item.type;
                  const catColors: Record<string, { bg: string; text: string }> = {
                    "選書": { bg: "#FFF8E1", text: "#F57F17" },
                    "選物": { bg: "#E0F2F1", text: "#00695C" },
                    "內容": { bg: "#F3E5F5", text: "#6A1B9A" },
                    "活動": { bg: "#E8F5E9", text: "#2E7D32" },
                    "觀點": { bg: "#E3F2FD", text: "#1565C0" },
                  };
                  const c = catColors[label] || catColors["內容"];
                  return (
                    <Link
                      key={item.id}
                      href={`/${item.type === "文章" ? "article" : item.type === "活動" ? "activity" : "product"}/${item.id}`}
                      className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                      style={{ border: "1px solid #e8e0d4", background: "#fff" }}
                    >
                      <div className="aspect-square flex items-center justify-center relative" style={{ background: "#f2ede6" }}>
                        <span className="text-3xl opacity-20">
                          {label === "選書" ? "📖" : label === "選物" ? "🎁" : label === "內容" ? "📄" : label === "活動" ? "🎪" : "💡"}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[0.65em] px-1.5 py-0.5 rounded-[3px]" style={{ background: c.bg, color: c.text }}>
                          {label}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-[0.85em] line-clamp-2 font-medium" style={{ color: "#1a1612" }}>{item.title}</h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 區塊 5: 選書選物 ── */}
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
                <span className="text-3xl opacity-20">📖</span>
              </div>
              <div className="p-2.5">
                <h3 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{g.title}</h3>
                <p className="text-[0.8em] font-medium mt-0.5" style={{ color: "#b5522a" }}>NT$ {g.price}</p>
                {g.author && g.author !== "—" && (
                  <p className="text-[0.7em] mt-0.5" style={{ color: "#999" }}>{g.author} / {g.publisher}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 活動行事曆 ── */}
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>活動行事曆</h2>
        <Calendar mode="default" />
      </section>
    </div>
  );
}
