"use client";

import { useState } from "react";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import RegistrationModal from "@/components/booking/RegistrationModal";

// metadata moved to layout or generateMetadata in future

const mockEvents: Record<string, { title: string; date: string; location: string; guide: string; type: "走讀" | "講座" | "市集" | "空間"; excerpt: string; content: string; keywords: string[]; routeStops: { name: string; desc: string }[]; tickets: { name: string; price: string }[]; addons: { name: string; price: string }[] }> = {
  "yilan-old-town-stroll": {
    title: "走讀行旅｜宜蘭舊城散步",
    date: "2026 年 4 月 21 日（一）09:00–12:00",
    location: "宜蘭市舊城區",
    guide: "黃育智",
    type: "走讀",
    excerpt: "從旅人書店出發，沿著中山路二段走入宜蘭舊城，探訪清代城牆遺跡、日治市街風貌，聽在地文史工作者說宜蘭的前世今生。",
    content: "宜蘭舊城是蘭陽平原最早發展的市街，保留了從清代到日治、戰後各時期的建築痕跡。這條路線將帶您穿越三百年的時光，從城隍廟的信仰中心，到碧霞宮的武穆信仰，再到昭應宮的媽祖文化，用雙腳感受一座城市的記憶層。",
    keywords: ["走讀行旅", "宜蘭舊城", "文化資產", "城市散步"],
    routeStops: [
      { name: "旅人書店", desc: "宜蘭在地文化書店，走讀行旅的起點。中山路二段上的獨立書店，以宜蘭在地出版品與文化活動為特色。" },
      { name: "城隍廟", desc: "宜蘭城隍廟創建於清嘉慶十八年（1813），是宜蘭歷史最悠久的廟宇之一，見證了噶瑪蘭開墾的歷史。" },
      { name: "碧霞宮", desc: "全台唯一以「岳飛」為主祀的寺廟，建於清光緒二十二年（1896），為宜蘭人抗日精神的象徵。" },
      { name: "宜蘭文學館", desc: "日治時期的宜蘭農林學校校長宿舍，現為文學展覽空間，展示宜蘭在地文學作品與作家故事。" },
    ],
    tickets: [{ name: "成人票", price: "$500" }, { name: "兒童票（6-12歲）", price: "$250" }],
    addons: [{ name: "午餐便當", price: "$120" }, { name: "導覽手冊", price: "$50" }],
  },
  "luodong-literary-walk": {
    title: "走讀行旅｜羅東林場文學散步",
    date: "2026 年 5 月 5 日（一）14:00–17:00",
    location: "羅東鎮林場文化園區",
    guide: "林雅雯",
    type: "走讀",
    excerpt: "走進百年林場，在老火車頭旁閱讀太平山的伐木故事，感受羅東從林業小鎮到文化城市的轉變。",
    content: "羅東林業文化園區前身為太平山林場的貯木池，日治時期是全台最重要的木材集散地之一。園區保留了完整的林業設施遺跡，包括貯木池、運材蒸汽火車、竹林車站等，是認識宜蘭林業歷史的最佳場域。",
    keywords: ["走讀行旅", "羅東林場", "林業文化", "日治歷史"],
    routeStops: [
      { name: "羅東林場入口", desc: "園區大門，展示太平山林場的歷史沿革與園區導覽地圖。" },
      { name: "貯木池", desc: "日治時期用於浸泡木材的大型水池，現已轉型為生態池，是園區最具代表性的景觀。" },
      { name: "竹林車站", desc: "昔日運材鐵道的起點站，保留了日治時期的站體建築與蒸汽火車頭。" },
      { name: "森美館", desc: "園區內的藝文展覽空間，定期舉辦與林業文化、在地藝術相關的展覽。" },
    ],
    tickets: [{ name: "成人票", price: "$600" }, { name: "學生票", price: "$400" }],
    addons: [{ name: "下午茶點心", price: "$100" }, { name: "蘭東案內 06期", price: "$280" }],
  },
};

const defaultEvent = mockEvents["yilan-old-town-stroll"];

export default function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  // In dev mode, try to match slug; fallback to default
  const event = defaultEvent; // TODO: use `use(params).slug` to lookup from Notion

  return (
    <div>
      {/* SP-E0: Hero banner */}
      <div
        className="relative flex items-end"
        style={{
          background: "linear-gradient(135deg, var(--color-moss), #3a5230)",
          minHeight: 320,
          padding: "48px 40px",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 1160 }}>
          <p className="text-sm tracking-widest mb-2" style={{ color: "var(--color-mist)", fontFamily: "var(--font-sans)" }}>
            活動
          </p>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70 mt-1">
            <span>{event.date}</span>
            <span>地點：{event.location}</span>
            <span>帶路人：<span className="text-white font-medium">{event.guide}</span></span>
          </div>
          <p className="text-[0.7em] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>以上資訊來自 DB04</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-10 py-12" style={{ maxWidth: 1160 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Left: Event details */}
          <div>
            {/* Excerpt */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                關於這場活動
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                {event.excerpt}
              </p>
            </section>

            {/* Route — 每個地點可點擊彈出 DB08 觀點介紹 */}
            <section className="mb-8 relative">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                活動路線
              </h2>
              <div className="flex items-center flex-wrap gap-y-2">
                {event.routeStops.map((stop, i) => (
                  <div key={i} className="flex items-center">
                    {i > 0 && (
                      <span className="mx-2 text-sm" style={{ color: "var(--color-dust)" }}>→</span>
                    )}
                    <button
                      onClick={() => setPopupIndex(popupIndex === i ? null : i)}
                      className="relative px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:shadow-sm"
                      style={{
                        background: popupIndex === i ? "var(--color-teal)" : "var(--color-parchment)",
                        color: popupIndex === i ? "#fff" : "var(--color-bark)",
                        border: `1px solid ${popupIndex === i ? "var(--color-teal)" : "var(--color-dust)"}`,
                      }}
                    >
                      {stop.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Popup */}
              {popupIndex !== null && (
                <div
                  className="mt-3 rounded-lg overflow-hidden shadow-lg animate-in fade-in"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff", maxWidth: 400 }}
                >
                  {/* Photo placeholder */}
                  <div
                    className="h-[160px] flex items-center justify-center"
                    style={{ background: "var(--color-parchment)" }}
                  >
                    <span className="text-3xl opacity-20">📷</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                        {event.routeStops[popupIndex].name}
                      </h4>
                      <button
                        onClick={() => setPopupIndex(null)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: "var(--color-mist)" }}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-bark)" }}>
                      {event.routeStops[popupIndex].desc}
                    </p>
                    <p className="text-[0.7em] mt-2" style={{ color: "var(--color-mist)" }}>
                      資料來源：Notion DB08
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Full content */}
            <section className="mb-8">
              <div
                className="rounded-lg p-6 text-sm leading-relaxed"
                style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}
              >
                {event.content}
              </div>
            </section>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2">
              {event.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Ticket + Add-ons sidebar (sticky, compact) */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
              <div className="p-4" style={{ background: "var(--color-warm-white)" }}>
                {/* 票券一列 */}
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>票券</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {event.tickets.map((t) => (
                    <div key={t.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                      <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{t.name}</p>
                      <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{t.price}</p>
                      <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                        <span className="w-5 h-6 flex items-center justify-center text-xs">0</span>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 加購一列 */}
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>加購</p>
                <div className="grid grid-cols-2 gap-2">
                  {event.addons.map((a) => (
                    <div key={a.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                      <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{a.name}</p>
                      <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{a.price}</p>
                      <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                        <span className="w-5 h-6 flex items-center justify-center text-xs">0</span>
                        <button className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between mb-3">
                  <span className="text-sm" style={{ color: "var(--color-muted)" }}>合計</span>
                  <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>NT$ 0</span>
                </div>
                <button
                  onClick={() => setShowRegistration(true)}
                  className="w-full h-10 rounded text-sm font-medium text-white" style={{ background: "var(--color-moss)" }}>
                  立即報名
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* 導購區 */}
        <div className="mx-auto px-10" style={{ maxWidth: 1160 }}>
          <AlsoWantToKnow />
          <MightAlsoLike />
        </div>
      </div>

      {/* 報名彈出表單 */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        formType={event.type}
        eventTitle={event.title}
        ticketSummary="成人票 ×1"
      />
    </div>
  );
}
