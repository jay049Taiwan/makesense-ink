import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "地方調研",
  description: "地方調研 — 以在地文化為主題的採訪、出版與內容策展。",
};

/* ── 假資料（from DB08 keywords + DB05 文章/出版品）── */

const contentStats = {
  articles: 87,
  publications: 12,
  interviews: 45,
  keywords: 156,
};

/** 採輯主題（按 DB04 執行時間先後排序，內容 from DB05）*/
const curationTopics = [
  "宜蘭線鐵路",
  "頭城搶孤",
  "黃春明",
  "礁溪溫泉",
  "龜山島",
  "蘭陽博物館",
  "三星蔥",
  "冬山河",
  "太平山",
  "簡媜",
  "蘇澳冷泉",
  "利澤簡走尪",
];


export default function ContentCurationPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：Notion page content（佔位）═══ */}
      <section className="py-12">
        <div className="max-w-[1000px] mx-auto">
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
            地方調研
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
      <div className="max-w-[1000px] mx-auto">

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

      {/* ── 採輯主題（條列）── */}
      <section className="py-6 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          採輯主題
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
          按執行時間排列・from DB05
        </p>

        <ul className="space-y-2">
          {curationTopics.map((topic) => (
            <li key={topic}>
              <Link
                href={`/viewpoint/${topic}`}
                className="block py-2 px-4 rounded-lg text-[0.95em] transition-all hover:bg-[var(--color-parchment)]"
                style={{ color: "var(--color-ink)", borderBottom: "1px solid var(--color-dust)" }}
              >
                {topic}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </div>
  );
}
