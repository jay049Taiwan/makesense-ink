import type { Metadata } from "next";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";

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
        <h1
          className="text-3xl font-semibold leading-tight mb-3"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          文章標題（{slug}）
        </h1>
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-mist)" }}>
          <span>2026 年 4 月 5 日</span>
          <span>作者：<span style={{ color: "var(--color-bark)" }}>作者名稱</span>（from DB08）</span>
        </div>
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

      {/* 導購區 */}
      <AlsoWantToKnow />
      <MightAlsoLike />
    </article>
  );
}
