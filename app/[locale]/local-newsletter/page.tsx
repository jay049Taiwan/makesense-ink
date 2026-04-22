import type { Metadata } from "next";
import Link from "next/link";
import { fetchSBArticles } from "@/lib/fetch-supabase";

export const metadata: Metadata = {
  title: "地方通訊",
  description: "地方通訊 — 現思文化歷來發表的文章，按時間排列。",
};

export const revalidate = 300;

export default async function LocalNewsletterPage() {
  // 2026/04/22：只顯示 Notion DB05「官網備項」含「地方通訊」的文章
  const articles = await fetchSBArticles(100, "地方通訊");

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

          {articles.length === 0 ? (
            <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>目前沒有文章</p>
          ) : (
            <div className="space-y-0">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/post/${article.slug}`}
                  className="flex items-baseline gap-4 py-4 transition-colors hover:bg-[var(--color-parchment)] px-3 -mx-3 rounded-lg"
                  style={{ borderBottom: "1px solid var(--color-dust)" }}
                >
                  <span className="text-sm flex-shrink-0" style={{ color: "var(--color-mist)", minWidth: 100 }}>
                    {article.date ? new Date(article.date).toLocaleDateString("zh-TW") : ""}
                  </span>
                  <span className="text-[0.95em]" style={{ color: "var(--color-ink)" }}>
                    {article.title}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
