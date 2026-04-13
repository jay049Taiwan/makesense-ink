import type { Metadata } from "next";
import Link from "next/link";
import { fetchProducts, fetchActivities } from "@/lib/fetch-bookstore";
import ViewpointExplorer from "@/components/bookstore/ViewpointExplorer";
import HeroCarousel from "@/components/ui/HeroCarousel";

export const metadata: Metadata = {
  title: "旅人書店",
  description: "旅人書店 — 宜蘭在地文化書店，提供展售合作、空間租借、文化活動。",
};

// 啟用 ISR：每 300 秒（5 分鐘）重新驗證
export const revalidate = 300;

const sampleCuration = [
  { title: "你可能會喜歡的", items: [
    { type: "選書", title: "散步指南：宜蘭小旅行" },
    { type: "內容", title: "老街故事：頭城百年風華" },
    { type: "觀點", title: "溫泉文化與地方再生" },
    { type: "選物", title: "宜蘭食記手繪明信片組" },
  ]},
  { title: "宜蘭人都在看", items: [
    { type: "內容", title: "蘭陽博物館的建築美學" },
    { type: "活動", title: "頭城搶孤文化祭" },
    { type: "觀點", title: "龜山島傳說與海洋信仰" },
    { type: "選書", title: "三星蔥農事：一位農夫的四季" },
  ]},
  { title: "端午節會想到的", items: [
    { type: "活動", title: "冬山河龍舟賽觀賞指南" },
    { type: "內容", title: "宜蘭粽子文化小考" },
    { type: "選物", title: "艾草香包手作組" },
    { type: "觀點", title: "河岸風光：宜蘭的水文地景" },
  ]},
];

const newsTypeStyles: Record<string, { bg: string; text: string }> = {
  文章: { bg: "#E8F5E9", text: "#2E7D32" },
  活動: { bg: "#FFF3E0", text: "#E65100" },
  商品: { bg: "#E3F2FD", text: "#1565C0" },
};


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

function CurationRow({ title, items }: { title: string; items: { type: string; title: string }[] }) {
  const catColors: Record<string, { bg: string; text: string; icon: string }> = {
    "選書": { bg: "#FFF8E1", text: "#F57F17", icon: "📖" },
    "選物": { bg: "#E0F2F1", text: "#00695C", icon: "🎁" },
    "內容": { bg: "#F3E5F5", text: "#6A1B9A", icon: "📄" },
    "活動": { bg: "#E8F5E9", text: "#2E7D32", icon: "🎪" },
    "觀點": { bg: "#E3F2FD", text: "#1565C0", icon: "💡" },
  };

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[1.1em] font-semibold" style={{ color: "#1a1612" }}>{title}</h3>
      </div>
      <div className="hscroll-track">
        {items.map((item, i) => {
          const c = catColors[item.type] || catColors["內容"];
          return (
            <div
              key={i}
              className="flex-shrink-0 w-[calc((100%-48px)/4)] min-w-[200px] rounded-lg overflow-hidden transition-all hover:scale-[1.03]"
              style={{ border: "1px solid #e8e0d4", background: "#fff" }}
            >
              <div className="aspect-[16/9] flex items-center justify-center relative" style={{ background: "#f2ede6" }}>
                <span className="text-2xl opacity-20">{c.icon}</span>
                <span className="absolute bottom-2 right-2 text-[0.65em] px-1.5 py-0.5 rounded-[3px]" style={{ background: c.bg, color: c.text }}>
                  {item.type}
                </span>
              </div>
              <div className="p-2.5">
                <h4 className="text-[0.85em] line-clamp-2 font-medium" style={{ color: "#1a1612" }}>{item.title}</h4>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function BookstorePage() {
  // dev 環境用 mock data，不打 Notion API
  let books: any[] = [];
  let goods: any[] = [];
  let activities: any[] = [];

  if (process.env.NODE_ENV === "development") {
    const { MOCK_PRODUCTS, MOCK_ACTIVITIES } = await import("@/lib/mock-data");
    books = MOCK_PRODUCTS.filter(p => p.category === "書籍").map(p => ({ ...p, slug: p.id }));
    goods = MOCK_PRODUCTS.filter(p => p.category === "商品").map(p => ({ ...p, slug: p.id }));
    activities = MOCK_ACTIVITIES.map(a => ({ ...a, slug: a.id }));
  } else {
    try { books = await fetchProducts("書籍刊物", 12); } catch (e) { console.error("Fetch books failed:", e); }
    try { goods = await fetchProducts("商品", 12); } catch (e) { console.error("Fetch goods failed:", e); }
    try { activities = await fetchActivities(5); } catch (e) { console.error("Fetch activities failed:", e); }
  }

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: Hero 輪播 ── */}
      <section className="py-8">
        <HeroCarousel slides={[
          { image: null, title: "蘭東案內 06期｜小鎮麵包地圖", subtitle: "走進宜蘭的巷弄，尋找在地烘焙的溫度", cta: { text: "立即選購", href: "/product/p3" } },
          { image: null, title: "走讀行旅｜宜蘭舊城散步", subtitle: "2026/04/21 — 跟著文史工作者，漫步百年老城", cta: { text: "報名參加", href: "/activity/a1" } },
          { image: null, title: "春日好物市集", subtitle: "2026/05/10 — 在地小農、手作品牌齊聚旅人書店", cta: { text: "了解更多", href: "/activity/a4" } },
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

      {/* ── 區塊 4-6: 主題策展 ×3（Netflix 風格）── */}
      <section className="py-6">
        {sampleCuration.slice(0, 3).map((row, i) => (
          <CurationRow key={i} title={row.title} items={row.items} />
        ))}
      </section>

      {/* ── 區塊 9: 最新消息 ── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-4" style={{ color: "#1a1612" }}>最新消息</h2>
        <div>
          {activities.map((activity) => {
            const typeLabel = activity.type || "活動";
            const style = newsTypeStyles[typeLabel] || newsTypeStyles["活動"];
            return (
              <Link
                key={activity.id}
                href={`/events/${activity.slug}`}
                className="flex items-start gap-4 py-4 px-2 -mx-2 rounded transition-colors hover:bg-[#faf8f5]"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <div className="flex-shrink-0 min-w-[140px]">
                  <span className="text-[0.8em]" style={{ color: "#999" }}>{activity.date || ""}</span>
                  <span
                    className="inline-block ml-2 text-[0.85em] px-2 py-0.5 rounded-[3px]"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {typeLabel}
                  </span>
                </div>
                <span className="text-[0.95em]" style={{ color: "#1a1612" }}>
                  {activity.title}
                </span>
              </Link>
            );
          })}
          {activities.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有近期活動</p>}
        </div>
      </section>

      {/* ── 區塊 8: 觀點漫遊（宜蘭 + 12 鄉鎮觀點）── */}
      <ViewpointExplorer />
    </div>
  );
}
