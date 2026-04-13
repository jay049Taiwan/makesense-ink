import type { Metadata } from "next";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import MarketPreOrderPanel, { type PreOrderVendor } from "@/components/booking/MarketPreOrderPanel";

// ── 文章關聯的市集預購資料（正式環境從 Notion DB 讀取）──────────────────────
// 如果 article 沒有關聯市集，這裡為 null；有的話從 Notion 抓廠商+商品清單
function getArticleMarket(slug: string): {
  title: string;
  date?: string;
  vendors: PreOrderVendor[];
} | null {
  // TODO: 正式環境改為從 Notion DB 讀取文章關聯的市集
  // 這裡示範：特定 slug 才顯示預購面板
  if (slug === "spring-market-2026" || slug === "market-preview") {
    return {
      title: "春日好物市集 現場預購",
      date: "2026/05/10（日）10:00–17:00",
      vendors: [
        {
          id: "v1",
          name: "蘭東書坊",
          description: "在地出版品、地方誌選物",
          products: [
            { id: "v1p1", name: "蘭東案內 06期", price: 280, note: "小鎮麵包地圖特輯", stock: 20 },
            { id: "v1p2", name: "宜蘭街散步圖", price: 50, stock: 50 },
          ],
        },
        {
          id: "v2",
          name: "山頂果園",
          description: "宜蘭溪北有機水果・果乾",
          products: [
            { id: "v2p1", name: "檸檬果乾（100g）", price: 180, stock: 30 },
            { id: "v2p2", name: "有機金棗 1kg", price: 280, note: "季節限定", stock: 15 },
          ],
        },
        {
          id: "v3",
          name: "手感皂工作室",
          description: "天然手工皂、香氛蠟燭",
          products: [
            { id: "v3p1", name: "薰衣草手工皂", price: 180, stock: 20 },
            { id: "v3p2", name: "香氛大豆蠟燭", price: 320, stock: 8 },
          ],
        },
      ],
    };
  }
  return null;
}

export const metadata: Metadata = {
  title: "文章",
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = getArticleMarket(slug);

  return (
    <article className="mx-auto px-4 py-12" style={{ maxWidth: 1000 }}>
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

      {/* Keywords */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* 付費內容區塊（有付費牆時顯示） */}
      <div
        className="rounded-xl p-6 text-center my-8"
        style={{ background: "var(--color-warm-white)", border: "1.5px solid var(--color-teal)" }}
      >
        <p className="text-lg mb-2" style={{ color: "var(--color-ink)" }}>📖 以下為付費內容</p>
        <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>
          購買後即可閱讀完整文章，付款完成將自動跳回本頁。
        </p>
        <a
          href={`/checkout?type=article&slug=sample-article&redirect=/post/sample-article`}
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-teal)" }}
        >
          購買閱讀 NT$ 50
        </a>
      </div>

      {/* ── 市集預購區塊（有關聯市集時顯示）── */}
      {market && (
        <div className="my-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "var(--color-dust)" }} />
            <p className="text-xs font-semibold px-3" style={{ color: "var(--color-bark)" }}>
              📦 現場預購
            </p>
            <div className="flex-1 h-px" style={{ background: "var(--color-dust)" }} />
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>
            市集當天到場取貨，現在就能先預訂喜歡的商品，確保不缺貨！
          </p>
          <MarketPreOrderPanel
            marketTitle={market.title}
            marketDate={market.date}
            vendors={market.vendors}
            layout="inline"
          />
        </div>
      )}

      {/* 導購區 */}
      <AlsoWantToKnow />
      <MightAlsoLike />
    </article>
  );
}
