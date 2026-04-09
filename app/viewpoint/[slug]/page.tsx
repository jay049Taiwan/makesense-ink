import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "觀點",
};

export default async function ViewpointPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>

      {/* 1. 觀點簡介（DB08 簡介摘要） */}
      <section className="mb-10">
        <h1
          className="text-3xl font-semibold mb-3"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          觀點名稱（{slug}）
        </h1>
        <div
          className="rounded-lg p-5 text-sm leading-relaxed"
          style={{ background: "var(--color-warm-white)", color: "var(--color-ink)", borderLeft: "3px solid var(--color-teal)" }}
        >
          觀點簡介（≤350字）— 來自 DB08「簡介摘要」欄位
        </div>
      </section>

      {/* 2. 觀點內容（DB08 page content） */}
      <section className="mb-12">
        <div
          className="text-[0.95em] leading-[1.8] space-y-4"
          style={{ color: "var(--color-ink)" }}
        >
          <p>觀點內容正文（來自 DB08 page content）</p>
          <p>
            這裡會是從 Notion DB08 抓取的完整觀點介紹，
            支援圖片、標題、引用、列表等所有 Notion block 類型的轉換。
          </p>
        </div>
      </section>

      {/* 3. 觀點相關商品 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          相關商品
        </h2>
        <div className="hscroll-track">
          {[1, 2, 3, 4, 5].map((i) => (
            <a
              key={i}
              href={`/product/${i}`}
              className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
            >
              <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                <span className="text-3xl opacity-20">📖</span>
              </div>
              <div className="p-2.5">
                <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>相關商品 {i}</h3>
                <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>NT$ {200 + i * 50}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 4. 觀點相關活動 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          相關活動
        </h2>
        <div className="hscroll-track">
          {[1, 2, 3].map((i) => (
            <a
              key={i}
              href={`/events/${i}`}
              className="flex-shrink-0 w-[260px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                <span className="text-3xl opacity-20">🎪</span>
              </div>
              <div className="p-3">
                <span className="inline-block text-[0.7em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: "var(--color-badge-event-bg)", color: "var(--color-badge-event-text)" }}>活動</span>
                <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>相關活動 {i}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 5. 觀點相關文章 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          相關文章
        </h2>
        <div className="hscroll-track">
          {[1, 2, 3].map((i) => (
            <a
              key={i}
              href={`/post/${i}`}
              className="flex-shrink-0 w-[280px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                <span className="text-3xl opacity-20">📰</span>
              </div>
              <div className="p-3">
                <span className="inline-block text-[0.7em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: "var(--color-badge-article-bg)", color: "var(--color-badge-article-text)" }}>文章</span>
                <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>相關文章 {i}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 6. 延伸思考（互為 relation 的 DB08） */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          延伸思考
        </h2>
        <div className="flex flex-wrap gap-3">
          {["宜蘭線鐵路", "草嶺隧道", "頭城老街", "蘭陽博物館", "龜山島"].map((kw) => (
            <a
              key={kw}
              href={`/viewpoint/${kw}`}
              className="px-4 py-2.5 rounded-full text-sm transition-all hover:shadow-sm"
              style={{ background: "var(--color-parchment)", color: "var(--color-bark)", border: "1px solid var(--color-dust)" }}
            >
              {kw}
            </a>
          ))}
        </div>
        <p className="text-[0.7em] mt-3" style={{ color: "var(--color-mist)" }}>
          以上觀點與本頁觀點互為 relation（DB08）
        </p>
      </section>

    </div>
  );
}
