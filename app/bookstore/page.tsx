import type { Metadata } from "next";
import Link from "next/link";
import { fetchProducts, fetchActivities } from "@/lib/fetch-bookstore";

export const metadata: Metadata = {
  title: "旅人書店",
  description: "旅人書店 — 宜蘭在地文化書店，提供展售合作、空間租借、文化活動。",
};

// 啟用 ISR：每 300 秒（5 分鐘）重新驗證
export const revalidate = 300;

const sampleCuration = [
  { title: "你可能會喜歡的", items: ["散步指南", "老街故事", "溫泉文化", "宜蘭食記"] },
  { title: "宜蘭人都在看", items: ["蘭陽博物館", "頭城搶孤", "龜山島傳說", "三星蔥農事"] },
  { title: "端午節會想到的", items: ["划龍舟", "粽子文化", "艾草香包", "河岸風光"] },
];

const newsTypeStyles: Record<string, { bg: string; text: string }> = {
  文章: { bg: "#E8F5E9", text: "#2E7D32" },
  活動: { bg: "#FFF3E0", text: "#E65100" },
  商品: { bg: "#E3F2FD", text: "#1565C0" },
};

const yilanTowns = [
  "宜蘭市", "羅東鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉",
  "蘇澳鎮", "三星鄉", "冬山鄉", "五結鄉", "大同鄉", "南澳鄉",
];

/* ── 共用卡片元件 ── */
function ProductCard({ id, name, price, photo, icon }: { id: string; name: string; price: number; photo?: string | null; icon: string }) {
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
        <h3 className="text-[0.85em] line-clamp-2" style={{ color: "#1a1612" }}>{name}</h3>
        <p className="text-[0.8em] font-medium mt-0.5" style={{ color: "#b5522a" }}>NT$ {price}</p>
      </div>
    </Link>
  );
}

function CurationRow({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[1.1em] font-semibold" style={{ color: "#1a1612" }}>{title}</h3>
        <span className="text-xs cursor-pointer" style={{ color: "#4ECDC4" }}>查看全部 →</span>
      </div>
      <div className="hscroll-track">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[calc((100%-48px)/4)] min-w-[200px] rounded-lg overflow-hidden transition-all hover:scale-[1.03]"
            style={{ border: "1px solid #e8e0d4", background: "#fff" }}
          >
            <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
              <span className="text-2xl opacity-20">📄</span>
            </div>
            <div className="p-2.5">
              <span className="inline-block text-[0.7em] px-1.5 py-0.5 rounded-[3px] mb-1"
                style={{ background: "#FFF3E0", color: "#E65100" }}>
                混合
              </span>
              <h4 className="text-[0.85em] line-clamp-1" style={{ color: "#1a1612" }}>{item}</h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function BookstorePage() {
  // 從 Notion 抓取真實資料（串行避免速率限制，失敗時 fallback 空陣列）
  let books: any[] = [];
  let goods: any[] = [];
  let activities: any[] = [];
  try {
    books = await fetchProducts("書籍刊物", 12);
  } catch (e) { console.error("Fetch books failed:", e); }
  try {
    goods = await fetchProducts("商品", 12);
  } catch (e) { console.error("Fetch goods failed:", e); }
  try {
    activities = await fetchActivities(5);
  } catch (e) { console.error("Fetch activities failed:", e); }

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: 輪播照片（待實作 — 7日內新上架）── */}
      <section className="py-8">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{ height: 320, background: "linear-gradient(135deg, #f2ede6, #e8e0d4)" }}
        >
          <p style={{ color: "#8b7355" }}>首頁輪播照片（Swiper，接 Notion 後啟用）</p>
        </div>
      </section>

      {/* ── 區塊 2: 主題選書輪播 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>主題選書</h2>
          <Link href="/themed-selection" className="text-sm" style={{ color: "#4ECDC4" }}>查看全部 →</Link>
        </div>
        <div className="hscroll-track">
          {books.map((book) => (
            <ProductCard key={book.id} id={book.id} name={book.name} price={book.price} photo={book.photo} icon="📖" />
          ))}
          {books.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有上架的書籍</p>}
        </div>
      </section>

      {/* ── 區塊 3: 風格選物輪播 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>風格選物</h2>
          <Link href="/goods-selection" className="text-sm" style={{ color: "#4ECDC4" }}>查看全部 →</Link>
        </div>
        <div className="hscroll-track">
          {goods.map((good) => (
            <ProductCard key={good.id} id={good.id} name={good.name} price={good.price} photo={good.photo} icon="🎁" />
          ))}
          {goods.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>目前沒有上架的商品</p>}
        </div>
      </section>

      {/* ── 區塊 4-6: 主題策展 ×3（Netflix 風格）── */}
      <section className="py-6">
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>主題策展</h2>
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

      {/* ── 區塊 8: 觀點漫遊（宜蘭地圖）── */}
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
        <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

        <div className="flex gap-4">
          {/* Sidebar: town buttons */}
          <div className="hidden sm:flex flex-col gap-2 w-[130px] flex-shrink-0">
            {yilanTowns.map((town) => (
              <button
                key={town}
                className="px-3 py-2 text-left text-[0.85em] rounded-[7px] transition-all"
                style={{ background: "#f7f7f7", border: "1px solid #eee", color: "#555" }}
              >
                {town}
              </button>
            ))}
          </div>
          {/* Map */}
          <div
            className="flex-1 rounded-lg flex items-center justify-center"
            style={{ minHeight: 350, background: "#f9f7f4", border: "1px solid #eee" }}
          >
            <div className="text-center">
              <p className="text-lg mb-1" style={{ color: "#8b7355" }}>宜蘭互動地圖</p>
              <p className="text-sm" style={{ color: "#999" }}>D3.js 鄉鎮地圖（接 Notion 資料後啟用）</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
