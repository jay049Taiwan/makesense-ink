import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "地方通訊",
  description: "地方通訊 — 現思文化歷來發表的文章，按時間排列。",
};

/** 假資料（之後接 Notion DB05）— 按時間由新到舊排列 */
const articles = [
  { id: "art-01", title: "清明時節：宜蘭的祭祀文化與地方記憶", date: "2026-04-05" },
  { id: "art-02", title: "宜蘭線鐵路的百年故事", date: "2026-03-25" },
  { id: "art-03", title: "從頭城到蘇澳：東北角海岸線散策", date: "2026-03-18" },
  { id: "art-04", title: "三星蔥的四季：一位蔥農的日常", date: "2026-03-10" },
  { id: "art-05", title: "冬山河的前世今生", date: "2026-03-02" },
  { id: "art-06", title: "礁溪溫泉的歷史與現代", date: "2026-02-20" },
  { id: "art-07", title: "龜山島傳說與海洋信仰", date: "2026-02-10" },
  { id: "art-08", title: "蘭陽博物館的建築美學", date: "2026-01-28" },
  { id: "art-09", title: "羅東林場：從伐木到文化保存", date: "2026-01-15" },
  { id: "art-10", title: "壯圍沙丘的地景變遷", date: "2025-12-20" },
  { id: "art-11", title: "員山機堡：二戰遺跡的在地記憶", date: "2025-12-05" },
  { id: "art-12", title: "宜蘭酒廠百年風華", date: "2025-11-18" },
  { id: "art-13", title: "傳藝中心與民俗技藝的傳承", date: "2025-11-02" },
  { id: "art-14", title: "梅花湖畔的四季風光", date: "2025-10-15" },
  { id: "art-15", title: "蘇澳冷泉的地質奇蹟", date: "2025-09-28" },
];

export default function LocalNewsletterPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>
      <section className="py-12">
        <div className="max-w-[1000px] mx-auto">
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            地方通訊
          </h1>
          <p className="text-lg mb-8" style={{ color: "var(--color-teal)" }}>
            用文字記錄宜蘭的每一個故事
          </p>

          <div className="space-y-0">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/post/${article.id}`}
                className="flex items-baseline gap-4 py-4 transition-colors hover:bg-[var(--color-parchment)] px-3 -mx-3 rounded-lg"
                style={{ borderBottom: "1px solid var(--color-dust)" }}
              >
                <span className="text-sm flex-shrink-0" style={{ color: "var(--color-mist)", minWidth: 100 }}>
                  {article.date}
                </span>
                <span className="text-[0.95em]" style={{ color: "var(--color-ink)" }}>
                  {article.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
