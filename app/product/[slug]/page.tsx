import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商品",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div
      className="mx-auto py-12 px-10"
      style={{ maxWidth: 1160 }}
    >
      {/* SP-P0: Two-column grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Left: Gallery (sticky) */}
        <div className="md:sticky md:top-6">
          <div
            className="aspect-square rounded-[2px] flex items-center justify-center"
            style={{ background: "var(--color-parchment)" }}
          >
            <span className="text-6xl opacity-20">📖</span>
          </div>
          {/* Thumbnail row */}
          <div className="flex gap-2 mt-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 aspect-[3/4] rounded-[2px]"
                style={{ background: "var(--color-parchment)" }}
              />
            ))}
          </div>
        </div>

        {/* Right: Product info */}
        <div>
          {/* Keyword badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
            >
              宜蘭文學
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
            >
              散文
            </span>
          </div>

          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            商品名稱（{slug}）
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
            作者 / 創作者名稱
          </p>

          <p
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-rust)" }}
          >
            NT$ 380
          </p>

          {/* Add to cart */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center border rounded"
              style={{ borderColor: "var(--color-dust)" }}
            >
              <button className="w-10 h-10 text-lg" style={{ color: "var(--color-bark)" }}>−</button>
              <span className="w-10 h-10 flex items-center justify-center text-sm font-medium">1</span>
              <button className="w-10 h-10 text-lg" style={{ color: "var(--color-bark)" }}>+</button>
            </div>
            <button
              className="flex-1 h-10 rounded text-sm font-medium text-white transition-colors"
              style={{ background: "var(--color-moss)" }}
            >
              加入購物車
            </button>
          </div>

          {/* Short description */}
          <div
            className="rounded-lg p-4 text-sm leading-relaxed mb-6"
            style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}
          >
            <p>商品摘要簡介（≤350字）— 來自 Notion DB07「簡介摘要」欄位</p>
          </div>

          {/* Notice */}
          <div className="text-xs space-y-1" style={{ color: "var(--color-mist)" }}>
            <p>• 付款後 1-3 個工作天出貨</p>
            <p>• 商品圖片僅供參考，以實物為準</p>
          </div>
        </div>
      </div>

      {/* Recommendation section */}
      <section className="mt-16">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          你可能也會喜歡
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--color-dust)" }}
            >
              <div className="aspect-[4/5] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                <span className="text-2xl opacity-20">📖</span>
              </div>
              <div className="p-2">
                <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>推薦商品 {i}</h3>
                <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>NT$ {200 + i * 50}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
