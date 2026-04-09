import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "內容採輯",
  description: "內容採輯 — 以在地文化為主題的採訪、出版與內容策展。",
};

/* ── 假資料（from DB08 keywords + DB05 文章/出版品）── */

const contentStats = {
  articles: 87,
  publications: 12,
  interviews: 45,
  keywords: 156,
};

const featuredKeywords = [
  { name: "宜蘭線鐵路", articles: 8, type: "歷史" },
  { name: "頭城搶孤", articles: 5, type: "民俗" },
  { name: "黃春明", articles: 12, type: "人物" },
  { name: "礁溪溫泉", articles: 6, type: "地方" },
  { name: "龜山島", articles: 4, type: "地理" },
  { name: "蘭陽博物館", articles: 7, type: "文化" },
  { name: "三星蔥", articles: 3, type: "產業" },
  { name: "冬山河", articles: 5, type: "地景" },
  { name: "太平山", articles: 4, type: "自然" },
  { name: "簡媜", articles: 9, type: "人物" },
  { name: "蘇澳冷泉", articles: 3, type: "地方" },
  { name: "利澤簡走尪", articles: 2, type: "民俗" },
];

const typeColors: Record<string, string> = {
  歷史: "#5ba3d9",
  民俗: "#b5522a",
  人物: "#4ECDC4",
  地方: "#5c6b4a",
  地理: "#8b7355",
  文化: "#b8943c",
  產業: "#9ba8a0",
  地景: "#3a5c78",
  自然: "#5c6b4a",
};

const recentPublications = [
  { id: 1, title: "蘭陽風土誌", year: 2025 },
  { id: 2, title: "宜蘭散步地圖", year: 2024 },
  { id: 3, title: "蘭陽平原的水路地景", year: 2024 },
  { id: 4, title: "頭城老街人文誌", year: 2023 },
  { id: 5, title: "宜蘭線鐵路百年紀行", year: 2023 },
];

export default function ContentCurationPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：Notion page content（佔位）═══ */}
      <section className="py-12">
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
            內容採輯
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)" }}>
            用文字與影像，記錄宜蘭的每一個切面
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>
              現思文化的內容採輯工作，是將在地文化轉化為可閱讀、可傳播、可保存的知識資產。
              我們透過田野調查、人物專訪、主題策展、出版刊物等方式，
              持續累積關於宜蘭的文化資料庫。
            </p>
            <p>
              每一篇文章、每一本出版品，都從一個「關鍵字」出發——
              它可能是一條老街、一位作家、一種產業、或一段被遺忘的歷史。
              我們相信，當這些關鍵字被串連起來，宜蘭的文化脈絡就會浮現。
              至今我們已累積超過 {contentStats.keywords} 個文化關鍵字，
              發表 {contentStats.articles} 篇文章，出版 {contentStats.publications} 本刊物。
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 下半部 ═══ */}

      {/* ── 統計數字 ── */}
      <section className="py-6" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "文化關鍵字", value: contentStats.keywords, unit: "個", icon: "🔑" },
            { label: "發表文章", value: contentStats.articles, unit: "篇", icon: "📝" },
            { label: "人物專訪", value: contentStats.interviews, unit: "位", icon: "🎙" },
            { label: "出版刊物", value: contentStats.publications, unit: "本", icon: "📚" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}
            >
              <span className="text-xl mb-1 block">{s.icon}</span>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                {s.value}
              </p>
              <p className="text-[0.7em]" style={{ color: "var(--color-mist)" }}>
                {s.label}（{s.unit}）
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 採訪/出版主題關鍵字 ── */}
      <section className="py-6" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          採輯主題
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
          以關鍵字為核心的內容採集・from DB08
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {featuredKeywords.map((kw) => (
            <Link
              key={kw.name}
              href={`/viewpoint/${kw.name}`}
              className="rounded-xl p-4 transition-all hover:shadow-md group"
              style={{ background: "#fff", border: "1px solid var(--color-dust)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[0.65em] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${typeColors[kw.type]}18`, color: typeColors[kw.type] }}
                >
                  {kw.type}
                </span>
                <span className="text-[0.7em]" style={{ color: "var(--color-teal)" }}>
                  {kw.articles} 篇
                </span>
              </div>
              <h3
                className="text-base font-semibold group-hover:text-[var(--color-teal)] transition-colors"
                style={{ color: "var(--color-ink)" }}
              >
                {kw.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 近期出版品 ── */}
      <section className="py-6 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          出版品
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
          我們出版的在地文化刊物
        </p>

        <div className="hscroll-track">
          {recentPublications.map((pub) => (
            <Link
              key={pub.id}
              href={`/product/${pub.id}`}
              className="flex-shrink-0 w-[160px] rounded-lg overflow-hidden transition-all hover:shadow-md"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
            >
              <div
                className="aspect-[3/4] flex items-center justify-center"
                style={{ background: "var(--color-parchment)" }}
              >
                <span className="text-3xl opacity-20">📖</span>
              </div>
              <div className="p-2.5">
                <h3 className="text-[0.8em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>
                  {pub.title}
                </h3>
                <p className="text-[0.7em] mt-0.5" style={{ color: "var(--color-mist)" }}>{pub.year}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
