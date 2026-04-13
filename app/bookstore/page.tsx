import type { Metadata } from "next";
import Link from "next/link";
import { fetchSBProducts, fetchSBArticles, fetchSBTopics } from "@/lib/fetch-supabase";
import ViewpointExplorer from "@/components/bookstore/ViewpointExplorer";
import HeroCarousel from "@/components/ui/HeroCarousel";

export const metadata: Metadata = {
  title: "旅人書店",
  description: "旅人書店 — 宜蘭在地文化書店，提供展售合作、空間租借、文化活動。",
};

// 啟用 ISR：每 300 秒（5 分鐘）重新驗證
export const revalidate = 300;

/* sampleCuration removed — B4 now uses dynamic viewpoints from Supabase */

/* ── 共用商品卡片 ── */
function ProductCard({ id, name, price, originalPrice, photo, icon, author, publisher }: {
  id: string; name: string; price: number; originalPrice?: number; photo?: string | null; icon: string; author?: string; publisher?: string;
}) {
  return (
    <Link
      href={`/product/${id.replace(/-/g, "")}`}
      className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: "1px solid #e8e0d4", background: "#fff" }}
    >
      <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ background: "#f2ede6" }}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-30">{icon}</span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          {originalPrice && originalPrice > price ? (
            <>
              <span className="text-[0.75em] line-through" style={{ color: "#aaa" }}>NT${originalPrice}</span>
              <span className="text-[0.8em] font-bold" style={{ color: "#e53e3e" }}>NT${price}</span>
            </>
          ) : (
            <span className="text-[0.8em] font-medium" style={{ color: "#b5522a" }}>NT$ {price}</span>
          )}
        </div>
        {(author || publisher) && (
          <p className="text-[0.7em] mt-0.5 line-clamp-1" style={{ color: "#999" }}>
            {author && author !== "—" ? author : ""}{author && author !== "—" && publisher ? " / " : ""}{publisher || ""}
          </p>
        )}
      </div>
    </Link>
  );
}

/* CurationRow removed — replaced by dynamic viewpoints */

export default async function BookstorePage() {
  // 全部從 Supabase 讀取
  const books = await fetchSBProducts("選書", 12);
  const goods = await fetchSBProducts("選物", 12);
  const articles = await fetchSBArticles(5);
  const viewpoints = await fetchSBTopics("viewpoint", 3);

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: Hero 輪播 ── */}
      <section className="py-8">
        <HeroCarousel slides={[
          { image: null, title: "蘭東案內 06期｜小鎮麵包地圖", subtitle: "走進宜蘭的巷弄，尋找在地烘焙的溫度", cta: { text: "立即選購", href: "/product/p3" } },
          { image: null, title: "走讀行旅｜宜蘭舊城散步", subtitle: "2026/04/21 — 跟著文史工作者，漫步百年老城", cta: { text: "報名參加", href: "/events/a1" } },
          { image: null, title: "春日好物市集", subtitle: "2026/05/10 — 在地小農、手作品牌齊聚旅人書店", cta: { text: "了解更多", href: "/events/a4" } },
          { image: null, title: "新書上架｜旅行的意義", subtitle: "詹宏志最新力作，探索旅行與生命的交會", cta: { text: "查看書籍", href: "/product/p10" } },
          { image: null, title: "宜蘭文化俱樂部 招募中", subtitle: "成為俱樂部會員，享受專屬文化體驗", cta: { text: "加入俱樂部", href: "/cultureclub" } },
        ]} />
      </section>

      {/* ── 區塊 2: 主題選書輪播 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>主題選書</h2>
          <Link href="/book-selection" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多主題選書 →</Link>
        </div>
        <div className="hscroll-track">
          {books.map((book) => (
            <ProductCard key={book.id} id={book.id} name={book.name} price={book.price} originalPrice={book.originalPrice} photo={book.photo} icon="📖" author={book.author} publisher={book.publisher} />
          ))}
          {books.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有上架的書籍</p>}
        </div>
      </section>

      {/* ── 區塊 3: 風格選物輪播 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>風格選物</h2>
          <Link href="/goods-selection" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多風格選物 →</Link>
        </div>
        <div className="hscroll-track">
          {goods.map((good) => (
            <ProductCard key={good.id} id={good.id} name={good.name} price={good.price} originalPrice={good.originalPrice} photo={good.photo} icon="🎁" author={good.author} publisher={good.publisher} />
          ))}
          {goods.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有上架的商品</p>}
        </div>
      </section>

      {/* ── 區塊 B4: 主題策展（動態觀點 from DB08）── */}
      {viewpoints.length > 0 && (
        <section className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>主題策展</h2>
            <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>探索更多觀點 →</Link>
          </div>
          <div className="hscroll-track">
            {viewpoints.map((vp) => (
              <Link key={vp.id} href={`/viewpoint/${vp.slug}`}
                className="flex-shrink-0 w-[260px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid #e8e0d4", background: "#fff" }}>
                <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                  <span className="text-3xl opacity-20">💡</span>
                </div>
                <div className="p-3">
                  <h3 className="text-[0.95em] font-medium line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{vp.name}</h3>
                  {vp.summary && <p className="text-[0.75em] line-clamp-2" style={{ color: "#8b7355" }}>{vp.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 區塊 B5: 地方通訊 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>地方通訊</h2>
          <Link href="/local-newsletter" className="text-xs" style={{ color: "var(--color-teal)" }}>前往更多地方通訊 →</Link>
        </div>
        <div>
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/post/${article.slug}`}
              className="flex items-start gap-4 py-4 px-2 -mx-2 rounded transition-colors hover:bg-[#faf8f5]"
              style={{ borderBottom: "1px solid #f0f0f0" }}
            >
              <span className="text-[0.8em] flex-shrink-0 min-w-[100px]" style={{ color: "#999" }}>
                {article.date ? new Date(article.date).toLocaleDateString("zh-TW") : ""}
              </span>
              <span className="text-[0.95em]" style={{ color: "#1a1612" }}>
                {article.title}
              </span>
            </Link>
          ))}
          {articles.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有文章</p>}
        </div>
      </section>

      {/* ── 區塊 8: 觀點漫遊（宜蘭 + 12 鄉鎮觀點）── */}
      <ViewpointExplorer />
    </div>
  );
}
