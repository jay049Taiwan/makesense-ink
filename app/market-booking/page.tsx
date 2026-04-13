import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "展售合作",
  description: "展售合作 — 自有產品、合作代銷品牌、市集活動。",
};

/* ── 假資料 ── */

const ownProducts = [
  { id: 1, name: "宜蘭散步地圖", price: 380 },
  { id: 2, name: "蘭陽風土誌", price: 450 },
  { id: 3, name: "旅人書店選書套組", price: 1200 },
  { id: 4, name: "宜蘭手工皂禮盒", price: 580 },
  { id: 5, name: "龜山島明信片組", price: 150 },
  { id: 6, name: "藺草杯墊（四入）", price: 220 },
  { id: 7, name: "旅人帆布袋", price: 350 },
  { id: 8, name: "手繪宜蘭地圖海報", price: 260 },
  { id: 9, name: "宜蘭在地蜂蜜", price: 480 },
  { id: 10, name: "文化街散步圖", price: 70 },
  { id: 11, name: "蘭陽平原攝影集", price: 650 },
  { id: 12, name: "旅人書店紀念杯", price: 320 },
];

const partnerBrands = [
  { id: 1, name: "宜蘭好物", desc: "在地農產加工品牌", count: 8 },
  { id: 2, name: "山海工坊", desc: "手工木作與陶藝", count: 12 },
  { id: 3, name: "蘭陽職人", desc: "傳統工藝傳承品牌", count: 6 },
  { id: 4, name: "田間生活", desc: "有機農產與食品", count: 15 },
  { id: 5, name: "島嶼手感", desc: "台灣手作品牌集合", count: 10 },
  { id: 6, name: "小鎮文創", desc: "地方特色文創商品", count: 9 },
];

const marketEvents = [
  { id: 1, title: "森本集市 01場｜春之初", date: "2026-04-03", registrationDeadline: "2026-03-20" },
  { id: 2, title: "森本集市 02場｜五月春日篇", date: "2026-05-01", registrationDeadline: "2026-04-20" },
  { id: 3, title: "森本集市 03場｜初夏微風", date: "2026-05-09", registrationDeadline: "2026-04-25" },
  { id: 4, title: "森本集市 04場｜仲夏夜", date: "2026-06-19", registrationDeadline: "2026-06-05" },
  { id: 5, title: "森本集市 05場｜秋收祭", date: "2026-09-15", registrationDeadline: "2026-09-01" },
];

/** 根據報名截止日與活動日期，自動判斷狀態 */
function getEventStatus(eventDate: string, registrationDeadline: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDate = new Date(eventDate);
  const regDeadline = new Date(registrationDeadline);
  if (today > evDate) return "已結束";
  if (today > regDeadline) return "截止報名";
  return "報名中";
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  已結束: { bg: "#f0f0f0", text: "#999" },
  截止報名: { bg: "#FFF3E0", text: "#E65100" },
  報名中: { bg: "rgba(78,205,196,0.12)", text: "#3aa89f" },
};

export default function MarketBookingPage() {
  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：Notion page content（佔位 300 字）═══ */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            展售合作
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)" }}>
            與在地文化一起被看見
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>
              旅人書店自 2012 年創立以來，致力於發掘宜蘭在地的優質品牌與職人。
              我們提供三種合作模式：自有品牌產品、合作代銷、以及市集攤位。
              無論你是獨立創作者、在地農產品牌、還是想要參加市集的攤商，
              都歡迎與我們聯繫。
            </p>
            <p>
              我們的展售空間不只是一個陳列架，而是一個讓好東西被看見的舞台。
              每一件上架的商品，都經過我們的選品標準——必須與在地文化有連結、
              具備品質保證、並且有故事值得被分享。
              透過書店的場域、市集的聚客力、以及線上通路的觸及，
              我們幫助每一個合作夥伴找到他們的受眾。
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 下半部 ═══ */}

      {/* ── 1. 自有產品（6 欄網格）── */}
      <section className="py-8" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[1.5em] font-bold" style={{ color: "var(--color-ink)" }}>自有產品</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>旅人書店自主開發的在地文化商品</p>
          </div>
          <span className="text-sm" style={{ color: "var(--color-teal)" }}>{ownProducts.length} 項商品</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ownProducts.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`}
              className="rounded-lg overflow-hidden transition-all hover:shadow-md hover:scale-[1.02]"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
              <div className="aspect-square flex items-center justify-end flex-col relative" style={{ background: "var(--color-parchment)" }}>
                <span className="text-2xl opacity-20 absolute top-1/3">🏷</span>
                <h3 className="text-[0.75em] font-medium line-clamp-2 text-center px-2 pb-2 relative z-10"
                  style={{ color: "var(--color-ink)" }}>{p.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 2. 合作代銷品牌（品牌卡片）── */}
      <section className="py-8" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[1.5em] font-bold" style={{ color: "var(--color-ink)" }}>地方特色產品展售</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>有產品在旅人書店銷售的品牌夥伴・from DB08 觀點</p>
          </div>
          <span className="text-sm" style={{ color: "var(--color-teal)" }}>{partnerBrands.length} 個品牌</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {partnerBrands.map((brand) => (
            <Link key={brand.id} href={`/viewpoint/${brand.name}`}
              className="rounded-xl p-5 transition-all hover:shadow-md"
              style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-parchment)" }}>
                  <span className="text-xl opacity-30">🏢</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold mb-0.5" style={{ color: "var(--color-ink)" }}>{brand.name}</h3>
                  <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>{brand.desc}</p>
                  <p className="text-xs" style={{ color: "var(--color-teal)" }}>{brand.count} 件商品</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3. 市集活動（橫向滑動，一次 5 個）── */}
      <section className="py-8 pb-16" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[1.5em] font-bold" style={{ color: "var(--color-ink)" }}>市集活動</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>我們辦理的展售市集・from DB04</p>
          </div>
        </div>
        <div className="hscroll-track">
          {marketEvents.map((ev) => {
            const status = getEventStatus(ev.date, ev.registrationDeadline);
            const st = statusStyle[status] || statusStyle["報名中"];
            return (
              <Link key={ev.id} href={`/events/${ev.id}`}
                className="flex-shrink-0 rounded-lg overflow-hidden transition-all hover:shadow-md"
                style={{ width: "calc((100% - 64px) / 5)", minWidth: 200, border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[16/10] flex items-center justify-center relative"
                  style={{ background: "linear-gradient(135deg, var(--color-parchment), var(--color-dust))" }}>
                  <span className="text-3xl opacity-20">🏕</span>
                  <span className="absolute top-2 right-2 text-[0.65em] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: st.bg, color: st.text }}>
                    {status}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-[0.85em] font-medium line-clamp-2 mb-1" style={{ color: "var(--color-ink)" }}>
                    {ev.title}
                  </h3>
                  <p className="text-[0.7em]" style={{ color: "var(--color-mist)" }}>{ev.date}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
