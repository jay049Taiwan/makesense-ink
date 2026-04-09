import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "文章",
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <article className="mx-auto px-4 py-12" style={{ maxWidth: 780 }}>
      {/* SP-A1: Article header */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="px-2.5 py-1 rounded-full text-xs"
            style={{ background: "var(--color-badge-article-bg)", color: "var(--color-badge-article-text)" }}
          >
            文章
          </span>
        </div>
        <h1
          className="text-3xl font-semibold leading-tight mb-3"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          文章標題（{slug}）
        </h1>
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>
          2026 年 4 月 5 日
        </p>
      </header>

      {/* Cover image */}
      <div
        className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center"
        style={{ background: "var(--color-parchment)" }}
      >
        <span className="text-5xl opacity-20">📷</span>
      </div>

      {/* Excerpt / lead */}
      <div
        className="rounded-lg p-5 mb-8 text-sm leading-relaxed italic"
        style={{ background: "var(--color-warm-white)", color: "var(--color-bark)", borderLeft: "3px solid var(--color-teal)" }}
      >
        文章前言摘要（來自 DB05「簡介摘要」或「AI摘要」欄位）
      </div>

      {/* Article body */}
      <div
        className="text-[0.95em] leading-[1.8] space-y-4"
        style={{ color: "var(--color-ink)" }}
      >
        <p>文章正文（來自 Notion DB05 page content → HTML）</p>
        <p>
          這裡會是從 Notion 抓取的完整文章內容，支援圖片、標題、引用、
          列表等所有 Notion block 類型的轉換。
        </p>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-2 mt-8 pt-6" style={{ borderTop: "1px solid var(--color-dust)" }}>
        {["宜蘭文化", "清明節", "祭祀"].map((kw) => (
          <span
            key={kw}
            className="px-3 py-1 rounded-full text-xs"
            style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Share buttons */}
      <div className="flex gap-3 mt-6">
        {["Facebook", "LINE", "複製連結"].map((label) => (
          <button
            key={label}
            className="px-4 py-2 rounded-full text-xs font-medium transition-colors"
            style={{ background: "var(--color-warm-white)", color: "var(--color-bark)", border: "1px solid var(--color-dust)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Related articles */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          延伸閱讀
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--color-dust)" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                <span className="text-2xl opacity-20">📄</span>
              </div>
              <div className="p-3">
                <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>延伸閱讀文章 {i}</h3>
                <p className="text-[0.75em] mt-1" style={{ color: "var(--color-muted)" }}>2026-03-28</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
