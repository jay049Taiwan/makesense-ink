"use client";

import { useState } from "react";
import Link from "next/link";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";

// ═══════════════════════════════════════════
// 假資料
// ═══════════════════════════════════════════
const mockActivities: Record<string, any> = {
  a1: {
    type: "走讀導覽", title: "走讀行旅｜宜蘭舊城散步", date: "2026/04/21（一）", time: "09:00 - 12:00", location: "宜蘭市舊城區",
    keywords: ["文化走讀", "宜蘭故事", "舊城"],
    description: "跟著文史工作者，走進宜蘭舊城的巷弄，探索日治時期的建築、百年老店、在地信仰場所。三小時的路線涵蓋昭應宮、舊城南門、中山公園等重要地標。",
    notices: ["請穿著舒適步行鞋", "活動含保險", "如遇雨天照常舉行，請自備雨具", "集合地點：旅人書店門口"],
    organizer: "旅人書店", executor: "林四九", guide: "宜蘭縣政府文化局", needInsurance: true, capacity: 20, registered: 14,
    route: [
      { name: "旅人書店", summary: "宜蘭在地文化書店，走讀行旅的起點與終點。提供宜蘭相關書籍與在地文創商品。", distToNext: 350 },
      { name: "昭應宮", summary: "創建於清嘉慶13年（1808），為宜蘭最重要的媽祖廟，見證了宜蘭開發的歷史。", distToNext: 200 },
      { name: "舊城南門遺址", summary: "宜蘭舊城曾有四座城門，南門遺址是目前保存最完整的歷史痕跡。", distToNext: 450 },
      { name: "宜蘭設治紀念館", summary: "日治時期宜蘭廳長官邸，融合日式與西式建築風格，庭園保存百年老樟樹。", distToNext: 300 },
      { name: "中山公園", summary: "原為日治時期的宜蘭公園，園內有獻馘碑等歷史文物，是市民休憩的好去處。", distToNext: 400 },
      { name: "旅人書店", summary: "回到起點，享用走讀後的茶點時光，分享今日的收穫與感動。" },
    ],
    tickets: [
      { name: "成人券", price: 650 },
      { name: "兒童券（6-12歲）", price: 350 },
    ],
    addons: [
      { name: "宜蘭街散步圖（加購）", price: 50, description: "手繪宜蘭舊城散步地圖，標示走讀路線上的重要地標、隱藏小店與歷史建築。防水材質，可折疊攜帶。", productLink: "/product/p5" },
    ],
  },
  a2: {
    type: "走讀導覽", title: "走讀行旅｜羅東林場文學散步", date: "2026/05/05（一）", time: "14:00 - 17:00", location: "羅東林業文化園區",
    keywords: ["林業文化", "羅東"],
    description: "從林場出發，走讀羅東的木業記憶與文學風景。",
    notices: ["請穿著舒適步行鞋"], organizer: "旅人書店", executor: "林四九", needInsurance: true, capacity: 15, registered: 8,
    route: [
      { name: "羅東林業文化園區入口", summary: "園區前身為太平山林場的貯木場，見證台灣林業的興衰史。", distToNext: 280 },
      { name: "貯木池", summary: "昔日用來浸泡原木的水池，如今成為生態濕地，白鷺鷥棲息其間。", distToNext: 350 },
      { name: "竹林車站", summary: "羅東林鐵的終點站，小巧的木造車站是鐵道迷必訪之地。", distToNext: 200 },
      { name: "森活館", summary: "由舊日式宿舍改建的展覽空間，展示林場工人的生活樣貌。" },
    ],
    tickets: [{ name: "成人券", price: 600 }, { name: "兒童券", price: 300 }],
    addons: [{ name: "宜蘭街散步圖（加購）", price: 50, description: "手繪羅東林場散步地圖，標示園區內的歷史建築與步道。", productLink: "/product/p5" }],
  },
  a3: {
    type: "課程講座", title: "講座｜宜蘭的前世今生", date: "2026/04/28（一）", time: "19:00 - 21:00", location: "旅人書店 2F",
    keywords: ["宜蘭故事", "文學"], speaker: "黃春明",
    description: "國寶級作家黃春明老師親臨分享，從他的文學作品出發，述說宜蘭這片土地的前世今生。",
    notices: ["請提前 15 分鐘入座", "備有茶點"], organizer: "旅人書店", executor: "林四九", needInsurance: false, capacity: 40, registered: 32,
    tickets: [{ name: "一般票", price: 300 }, { name: "學生票", price: 200 }],
    addons: [],
  },
  a4: {
    type: "市集攤位招商", title: "春日好物市集｜攤位招商", date: "2026/05/10（六）", time: "10:00 - 17:00", location: "旅人書店前廣場",
    keywords: ["在地市集", "小農"],
    description: "春日好物市集招募在地小農、手作品牌、文創工作者。提供 3m×3m 標準攤位，含桌椅帳篷。",
    organizer: "旅人書店", executor: "林四九", needInsurance: false, capacity: 30, registered: 22,
    boothTypes: [
      { name: "標準攤位 3m×3m", price: 2000 },
      { name: "雙倍攤位 6m×3m", price: 3500 },
      { name: "餐飲攤位（含水電）", price: 3000 },
    ],
    requirements: ["需提供品牌介紹與商品照片", "食品類需附衛生許可", "請自備找零金"],
    equipment: [
      { name: "額外桌子", price: 200 },
      { name: "額外椅子（2張）", price: 100 },
      { name: "延長線（附插座）", price: 150 },
      { name: "帆布帳篷 3m×3m", price: 500 },
    ],
    tickets: [], addons: [],
  },
  "a-space": {
    type: "空間租借", title: "旅人書店 空間租借", date: "常態開放", time: "依預約時段", location: "旅人書店 1F / 2F",
    keywords: ["空間體驗"],
    description: "旅人書店提供兩個空間供租借，適合講座、工作坊、小型展覽、會議等使用。",
    organizer: "旅人書店", needInsurance: false,
    spaces: [
      { name: "一樓開放式空間", size: "約 30 坪", capacity: "50 人", priceHalf: 3000, priceFull: 5000, equipment: ["投影設備", "音響系統", "桌椅 50 組"] },
      { name: "二樓多功能教室", size: "約 20 坪", capacity: "30 人", priceHalf: 2000, priceFull: 3500, equipment: ["投影設備", "白板", "桌椅 30 組"] },
    ],
    rentalEquipment: [
      { name: "額外投影幕", price: 300 },
      { name: "無線麥克風（2支）", price: 500 },
      { name: "延長線（附插座）", price: 150 },
      { name: "白板（含筆）", price: 200 },
    ],
    tickets: [], addons: [],
  },
  a5: {
    type: "走讀導覽", title: "走讀行旅｜冬山河自行車道", date: "2026/03/15（六）", time: "09:00 - 12:00", location: "冬山河親水公園",
    keywords: ["冬山河", "自行車"],
    description: "騎乘自行車沿著冬山河，感受蘭陽平原的水文之美。",
    notices: ["請自備自行車或現場租借"], organizer: "旅人書店", executor: "林四九", needInsurance: true, capacity: 20, registered: 20,
    route: [
      { name: "冬山河親水公園", summary: "國際級的親水設施，每年舉辦童玩節，是冬山河最知名的地標。", distToNext: 2800 },
      { name: "利澤簡橋", summary: "橫跨冬山河的鋼構橋，橋上可俯瞰河道蜿蜒的美麗曲線。", distToNext: 3200 },
      { name: "傳統藝術中心", summary: "集結台灣傳統工藝、戲曲、民俗文化的園區。", distToNext: 4500 },
      { name: "冬山火車站", summary: "以瓜棚造型聞名的特色車站，曾獲建築設計獎。" },
    ],
    tickets: [{ name: "成人券", price: 500 }],
    addons: [{ name: "自行車租借（加購）", price: 200, description: "提供 Giant 捷安特城市車，含安全帽。歸還地點同取車點。", productLink: "#" }],
  },
};

const typeColors: Record<string, { bg: string; text: string }> = {
  "走讀導覽": { bg: "#E8F5E9", text: "#2E7D32" },
  "課程講座": { bg: "#E3F2FD", text: "#1565C0" },
  "市集攤位招商": { bg: "#FFF3E0", text: "#E65100" },
  "空間租借": { bg: "#F3E5F5", text: "#6A1B9A" },
};

// ═══════════════════════════════════════════
// 主元件
// ═══════════════════════════════════════════
export default function ActivityClient({ slug }: { slug: string }) {
  const activity = mockActivities[slug];
  const [popupStop, setPopupStop] = useState<number | null>(null);
  const [popupAddon, setPopupAddon] = useState<number | null>(null);
  const [ticketQty, setTicketQty] = useState<Record<number, number>>({});
  const [addonQty, setAddonQty] = useState<Record<number, number>>({});
  const [showMarketForm, setShowMarketForm] = useState(false);
  const [marketForm, setMarketForm] = useState({ boothType: 0, brandName: "", brandIntro: "", products: "", contactName: "", contactPhone: "", contactEmail: "" });
  const [marketEquipment, setMarketEquipment] = useState<Record<number, number>>({});
  const [showRegForm, setShowRegForm] = useState(false);
  const [regPeople, setRegPeople] = useState<Record<number, { name: string; phone: string; email: string; idNumber: string; birthday: string }>>({});
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [spaceForm, setSpaceForm] = useState({ name: "", brand: "", phone: "", email: "", timeSlot: "half" as "half" | "full" });
  const [spaceEquipment, setSpaceEquipment] = useState<Record<number, number>>({});

  if (!activity) {
    return (
      <div className="mx-auto px-4 py-20 text-center" style={{ maxWidth: 1000 }}>
        <p className="text-lg" style={{ color: "var(--color-mist)" }}>找不到此活動</p>
        <Link href="/cultureclub" className="text-sm mt-4 inline-block" style={{ color: "var(--color-teal)" }}>← 回到宜蘭文化俱樂部</Link>
      </div>
    );
  }

  const tc = typeColors[activity.type] || typeColors["走讀導覽"];

  // 計算總價
  const ticketTotal = (activity.tickets || []).reduce((sum: number, t: any, i: number) => sum + t.price * (ticketQty[i] || 0), 0);
  const addonTotal = (activity.addons || []).reduce((sum: number, a: any, i: number) => sum + a.price * (addonQty[i] || 0), 0);
  const grandTotal = ticketTotal + addonTotal;

  return (
    <article className="mx-auto px-4 py-12" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <header className="mb-4">
        <span className="inline-block text-sm px-3 py-1 rounded-full mb-3" style={{ background: tc.bg, color: tc.text }}>{activity.type}</span>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>{activity.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: "var(--color-mist)" }}>
          <span>📅 {activity.date}</span>
          <span>⏰ {activity.time}</span>
          {activity.type === "走讀導覽" && activity.executor && <span>🚶 帶路人：<span style={{ color: "var(--color-bark)", fontWeight: 600 }}>{activity.executor}</span></span>}
          {activity.type === "課程講座" && activity.speaker && <span>🎤 講者：<span style={{ color: "var(--color-bark)", fontWeight: 600 }}>{activity.speaker}</span></span>}
          {(activity.type === "市集攤位招商" || activity.type === "空間租借" || activity.type === "課程講座") && <span>📍 {activity.location}</span>}
        </div>
      </header>

      {/* Keywords */}
      {activity.keywords && (
        <div className="flex flex-wrap gap-2 mb-6">
          {activity.keywords.map((kw: string) => (
            <Link key={kw} href={`/viewpoint-stroll?keyword=${kw}`} className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--color-parchment)", color: "var(--color-bark)", textDecoration: "none" }}>#{kw}</Link>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
        <span className="text-5xl opacity-20">🎪</span>
      </div>

      {/* 內容 */}
      <div className={activity.type === "市集攤位招商" ? "" : "grid sm:grid-cols-[1fr_320px] gap-8"}>
        {/* 左欄 */}
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-ink)" }}>活動說明</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-ink)" }}>{activity.description}</p>

          {/* 走讀路線（箭頭串連 + 距離） */}
          {activity.route && (() => {
            const totalDist = activity.route.reduce((s: number, stop: any) => s + (stop.distToNext || 0), 0);
            const totalKm = (totalDist / 1000).toFixed(1);
            return (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>📍 走讀路線</h3>
                  <span className="text-xs" style={{ color: "var(--color-mist)" }}>🚶 全程約 <strong style={{ color: "var(--color-ink)" }}>{totalKm} km</strong></span>
                </div>

                {/* 路線圖 */}
                <div className="flex flex-wrap items-center gap-y-2">
                  {activity.route.map((stop: any, i: number) => (
                    <span key={i} className="flex items-center">
                      <button
                        onClick={() => setPopupStop(popupStop === i ? null : i)}
                        className="relative px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:shadow-md"
                        style={{
                          background: popupStop === i ? tc.bg : "#f5f0e8",
                          color: popupStop === i ? tc.text : "#7a5c40",
                          border: popupStop === i ? `2px solid ${tc.text}` : "1px solid #e0d8cc",
                          cursor: "pointer",
                        }}
                      >
                        {stop.name}
                      </button>
                      {i < activity.route.length - 1 && (
                        <span className="mx-1" style={{ color: "#d4c5b0", fontSize: 12 }}>→</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Popup 卡片 */}
                {popupStop !== null && activity.route[popupStop] && (
                  <div className="mt-3 p-4 rounded-xl shadow-lg relative" style={{ background: "#fff", border: "1px solid #e8e0d4", maxWidth: 400 }}>
                    <button onClick={() => setPopupStop(null)} className="absolute top-2 right-3 text-lg" style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer" }}>×</button>
                    <div className="aspect-[16/9] rounded-lg mb-3 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                      <span className="text-3xl opacity-20">📷</span>
                    </div>
                    <h4 className="text-sm font-bold mb-1" style={{ color: "var(--color-ink)" }}>{activity.route[popupStop].name}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-bark)" }}>
                      {activity.route[popupStop].summary}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 講者 */}
          {activity.speaker && (
            <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--color-warm-white)" }}>
              <h3 className="text-base font-semibold mb-2" style={{ color: "var(--color-ink)" }}>🎤 講者</h3>
              <p className="text-sm" style={{ color: "var(--color-ink)" }}>{activity.speaker}</p>
            </div>
          )}

          {/* 市集：報名按鈕 + 彈出表單 */}
          {activity.type === "市集攤位招商" && (
            <div className="mb-6">
              {!showMarketForm ? (
                <button onClick={() => setShowMarketForm(true)} className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer" }}>
                  立即報名攤位
                </button>
              ) : (
                <div className="rounded-xl p-5" style={{ background: "#fff", border: "1.5px solid var(--color-teal)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>攤位報名</h3>
                    <button onClick={() => setShowMarketForm(false)} className="text-lg" style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer" }}>×</button>
                  </div>

                  <div className="space-y-3">
                    {/* 攤位類型 */}
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>攤位類型</label>
                      {activity.boothTypes.map((bt: any, i: number) => (
                        <label key={i} className="flex items-center justify-between p-2.5 rounded-lg mb-1 cursor-pointer" style={{ background: marketForm.boothType === i ? "var(--color-parchment)" : "#fafafa", border: marketForm.boothType === i ? "2px solid var(--color-teal)" : "1px solid #eee" }}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="booth" checked={marketForm.boothType === i} onChange={() => setMarketForm(f => ({ ...f, boothType: i }))} className="accent-teal-600" />
                            <span className="text-sm">{bt.name}</span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: "var(--color-rust)" }}>NT$ {bt.price.toLocaleString()}</span>
                        </label>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>品牌名稱 *</label>
                        <input type="text" value={marketForm.brandName} onChange={(e: any) => setMarketForm(f => ({ ...f, brandName: e.target.value }))} placeholder="您的品牌名稱" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>展售商品 *</label>
                        <input type="text" value={marketForm.products} onChange={(e: any) => setMarketForm(f => ({ ...f, products: e.target.value }))} placeholder="例：手工果醬" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>品牌簡介 *</label>
                      <textarea value={marketForm.brandIntro} onChange={(e: any) => setMarketForm(f => ({ ...f, brandIntro: e.target.value }))} placeholder="簡述您的品牌理念與商品特色" rows={2} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", resize: "vertical" }} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>聯絡人 *</label>
                        <input type="text" value={marketForm.contactName} onChange={(e: any) => setMarketForm(f => ({ ...f, contactName: e.target.value }))} className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>電話 *</label>
                        <input type="tel" value={marketForm.contactPhone} onChange={(e: any) => setMarketForm(f => ({ ...f, contactPhone: e.target.value }))} className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Email *</label>
                        <input type="email" value={marketForm.contactEmail} onChange={(e: any) => setMarketForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="your@email.com" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      </div>
                    </div>

                    {/* 加租設備 */}
                    {activity.equipment && (
                      <div className="pt-3" style={{ borderTop: "1px dashed var(--color-dust)" }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>加租設備（選填）</p>
                        <div className="grid grid-cols-2 gap-2">
                          {activity.equipment.map((eq: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#fafafa" }}>
                              <div>
                                <p className="text-xs" style={{ color: "var(--color-ink)" }}>{eq.name}</p>
                                <p className="text-[10px]" style={{ color: "var(--color-rust)" }}>NT$ {eq.price}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setMarketEquipment(q => ({ ...q, [i]: Math.max(0, (q[i] || 0) - 1) }))} className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "#eee", border: "none", cursor: "pointer" }}>−</button>
                                <span className="text-xs font-bold w-4 text-center">{marketEquipment[i] || 0}</span>
                                <button onClick={() => setMarketEquipment(q => ({ ...q, [i]: (q[i] || 0) + 1 }))} className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer", color: "#fff" }}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 總計 */}
                    {(() => {
                      const boothPrice = activity.boothTypes[marketForm.boothType]?.price || 0;
                      const eqTotal = (activity.equipment || []).reduce((s: number, eq: any, i: number) => s + eq.price * (marketEquipment[i] || 0), 0);
                      return (
                        <div className="flex justify-between items-center pt-3" style={{ borderTop: "1px solid var(--color-dust)" }}>
                          <span className="text-sm font-semibold">總計</span>
                          <span className="text-xl font-bold" style={{ color: "var(--color-rust)" }}>NT$ {(boothPrice + eqTotal).toLocaleString()}</span>
                        </div>
                      );
                    })()}

                    <button className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer" }}>
                      送出報名
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 空間方案（可點選） */}
          {activity.spaces && (
            <div className="mb-6">
              <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>🏠 選擇空間</h3>
              {activity.spaces.map((sp: any, i: number) => (
                <button key={i} onClick={() => setSelectedSpace(selectedSpace === i ? null : i)}
                  className="w-full text-left p-4 rounded-lg mb-3 transition-all"
                  style={{ background: selectedSpace === i ? "var(--color-parchment)" : "var(--color-warm-white)", border: selectedSpace === i ? "2px solid var(--color-teal)" : "1px solid var(--color-dust)", cursor: "pointer" }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: "var(--color-ink)" }}>{sp.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--color-mist)" }}>
                    <span>面積：{sp.size}</span><span>容納：{sp.capacity}</span>
                    <span>半日：NT$ {sp.priceHalf.toLocaleString()}</span><span>全日：NT$ {sp.priceFull.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sp.equipment.map((eq: string) => <span key={eq} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#E3F2FD", color: "#1565C0" }}>{eq}</span>)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 注意事項 */}
          {activity.notices && (
            <div className="mb-6">
              <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>⚠️ 注意事項</h3>
              <ul className="space-y-1">
                {activity.notices.map((n: string, i: number) => <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--color-bark)" }}><span style={{ color: "var(--color-teal)" }}>•</span>{n}</li>)}
              </ul>
            </div>
          )}

        </div>

        {/* 右欄：報名 + 票券（市集不顯示） */}
        {activity.type !== "市集攤位招商" && <div>
          <div className="sticky top-20 rounded-xl p-5" style={{ background: "#fff", border: "1.5px solid var(--color-teal)", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--color-ink)" }}>
              {activity.type === "市集攤位招商" ? "攤位報名" : activity.type === "空間租借" ? "空間預約" : "報名參加"}
            </h3>

            {/* ══ 空間租借：預約表單 ══ */}
            {activity.type === "空間租借" && (
              selectedSpace === null ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--color-mist)" }}>← 請先選擇左邊的空間</p>
              ) : (() => {
                const sp = activity.spaces[selectedSpace];
                const spPrice = spaceForm.timeSlot === "full" ? sp.priceFull : sp.priceHalf;
                const eqTotal = (activity.rentalEquipment || []).reduce((s: number, eq: any, i: number) => s + eq.price * (spaceEquipment[i] || 0), 0);
                const spTotal = spPrice + eqTotal;
                return (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ background: "var(--color-parchment)" }}>
                      <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{sp.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-mist)" }}>{sp.size} ・{sp.capacity}</p>
                    </div>

                    {/* 時段 */}
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>租借時段</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["half", "full"] as const).map((t) => (
                          <label key={t} className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer" style={{ background: spaceForm.timeSlot === t ? "var(--color-parchment)" : "#fafafa", border: spaceForm.timeSlot === t ? "2px solid var(--color-teal)" : "1px solid #eee" }}>
                            <div className="flex items-center gap-2">
                              <input type="radio" name="timeSlot" checked={spaceForm.timeSlot === t} onChange={() => setSpaceForm(f => ({ ...f, timeSlot: t }))} className="accent-teal-600" />
                              <span className="text-xs">{t === "half" ? "半日" : "全日"}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: "var(--color-rust)" }}>NT$ {(t === "half" ? sp.priceHalf : sp.priceFull).toLocaleString()}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 聯絡資訊 */}
                    <input type="text" value={spaceForm.name} onChange={(e: any) => setSpaceForm(f => ({ ...f, name: e.target.value }))} placeholder="姓名 *" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                    <input type="text" value={spaceForm.brand} onChange={(e: any) => setSpaceForm(f => ({ ...f, brand: e.target.value }))} placeholder="品牌/單位名稱 *" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="tel" value={spaceForm.phone} onChange={(e: any) => setSpaceForm(f => ({ ...f, phone: e.target.value }))} placeholder="電話 *" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                      <input type="email" value={spaceForm.email} onChange={(e: any) => setSpaceForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                    </div>

                    {/* 加租設備 */}
                    {activity.rentalEquipment && (
                      <div className="pt-3" style={{ borderTop: "1px dashed var(--color-dust)" }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>加租設備（選填）</p>
                        {activity.rentalEquipment.map((eq: any, i: number) => (
                          <div key={i} className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs" style={{ color: "var(--color-ink)" }}>{eq.name}</p>
                              <p className="text-[10px]" style={{ color: "var(--color-rust)" }}>NT$ {eq.price}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setSpaceEquipment(q => ({ ...q, [i]: Math.max(0, (q[i] || 0) - 1) }))} className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "#f0f0f0", border: "none", cursor: "pointer" }}>−</button>
                              <span className="text-xs font-bold w-4 text-center">{spaceEquipment[i] || 0}</span>
                              <button onClick={() => setSpaceEquipment(q => ({ ...q, [i]: (q[i] || 0) + 1 }))} className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer", color: "#fff" }}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 總計 */}
                    <div className="flex justify-between items-center pt-3" style={{ borderTop: "1px solid var(--color-dust)" }}>
                      <span className="text-sm font-semibold">總計</span>
                      <span className="text-xl font-bold" style={{ color: "var(--color-rust)" }}>NT$ {spTotal.toLocaleString()}</span>
                    </div>

                    <button className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer" }}>
                      送出預約
                    </button>
                  </div>
                );
              })()
            )}

            {/* ══ 一般活動：票券選擇 ══ */}
            {activity.type !== "市集攤位招商" && activity.type !== "空間租借" && activity.tickets?.length > 0 && (
              <div className="space-y-3 mb-4">
                {activity.tickets.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{t.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-rust)" }}>NT$ {t.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTicketQty(q => ({ ...q, [i]: Math.max(0, (q[i] || 0) - 1) }))} className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: "#f0f0f0", border: "none", cursor: "pointer", color: "#666" }}>−</button>
                      <span className="text-sm font-bold w-6 text-center" style={{ color: "var(--color-ink)" }}>{ticketQty[i] || 0}</span>
                      <button onClick={() => setTicketQty(q => ({ ...q, [i]: (q[i] || 0) + 1 }))} className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer", color: "#fff" }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 加購 */}
            {activity.addons?.length > 0 && (
              <div className="pt-3 mb-4 relative" style={{ borderTop: "1px dashed var(--color-dust)" }}>
                {activity.addons.map((a: any, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <div>
                        <button onClick={() => setPopupAddon(popupAddon === i ? null : i)} className="text-xs underline" style={{ color: "var(--color-teal)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{a.name}</button>
                        <p className="text-xs" style={{ color: "var(--color-rust)" }}>NT$ {a.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAddonQty(q => ({ ...q, [i]: Math.max(0, (q[i] || 0) - 1) }))} className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "#f0f0f0", border: "none", cursor: "pointer", color: "#666" }}>−</button>
                        <span className="text-xs font-bold w-5 text-center">{addonQty[i] || 0}</span>
                        <button onClick={() => setAddonQty(q => ({ ...q, [i]: (q[i] || 0) + 1 }))} className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer", color: "#fff" }}>+</button>
                      </div>
                    </div>
                    {popupAddon === i && (
                      <div className="mt-2 p-3 rounded-lg shadow-lg" style={{ background: "#fff", border: "1px solid #e8e0d4" }}>
                        <button onClick={() => setPopupAddon(null)} className="absolute top-1 right-2 text-sm" style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer" }}>×</button>
                        <div className="aspect-[16/9] rounded-lg mb-2 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                          <span className="text-2xl opacity-20">🎁</span>
                        </div>
                        <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--color-bark)" }}>{a.description}</p>
                        {a.productLink && a.productLink !== "#" && (
                          <Link href={a.productLink} className="text-xs" style={{ color: "var(--color-teal)" }}>查看商品 →</Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ══ 一般活動：總計 + 名額 + 按鈕 + 報名表單 ══ */}
            {activity.type !== "市集攤位招商" && (<>
            <div className="flex justify-between items-center pt-3 mb-4" style={{ borderTop: "1px solid var(--color-dust)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>總計</span>
              <span className="text-xl font-bold" style={{ color: "var(--color-rust)" }}>NT$ {grandTotal.toLocaleString()}</span>
            </div>

            {activity.capacity && (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-mist)" }}>
                  <span>已報名 {activity.registered} / {activity.capacity} 人</span>
                  <span>{Math.round((activity.registered / activity.capacity) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#eee" }}>
                  <div className="h-full rounded-full" style={{ width: `${(activity.registered / activity.capacity) * 100}%`, background: activity.registered >= activity.capacity ? "#e53e3e" : "var(--color-teal)" }} />
                </div>
              </div>
            )}

            {activity.needInsurance && (
              <p className="text-xs mb-3 flex items-center gap-1" style={{ color: "var(--color-teal)" }}>🛡️ 本活動含旅行平安保險</p>
            )}

            {!showRegForm ? (
              <button
                onClick={() => { if (grandTotal > 0 && activity.registered < (activity.capacity || 999)) setShowRegForm(true); }}
                className="w-full py-3 rounded-lg text-sm font-bold text-white mb-2"
                style={{ background: grandTotal === 0 || (activity.registered >= activity.capacity) ? "#ccc" : "var(--color-teal)", border: "none", cursor: grandTotal > 0 && activity.registered < (activity.capacity || 999) ? "pointer" : "default" }}
                disabled={grandTotal === 0 || activity.registered >= (activity.capacity || 999)}
              >
                {activity.registered >= (activity.capacity || 999) ? "已額滿" : grandTotal === 0 ? "請選擇票券" : "填寫報名資料"}
              </button>
            ) : (() => {
              // 計算總人數
              const totalPeople = (activity.tickets || []).reduce((s: number, _: any, i: number) => s + (ticketQty[i] || 0), 0);
              const needInsurance = activity.needInsurance;
              const updatePerson = (idx: number, field: string, value: string) => {
                setRegPeople(p => ({ ...p, [idx]: { ...(p[idx] || { name: "", phone: "", email: "", idNumber: "", birthday: "" }), [field]: value } }));
              };
              const person = (idx: number) => regPeople[idx] || { name: "", phone: "", email: "", idNumber: "", birthday: "" };

              return (
                <div className="pt-3" style={{ borderTop: "1px dashed var(--color-dust)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold" style={{ color: "#888" }}>報名資料（{totalPeople} 人）</p>
                    <button onClick={() => setShowRegForm(false)} className="text-xs" style={{ color: "var(--color-teal)", background: "none", border: "none", cursor: "pointer" }}>← 返回</button>
                  </div>

                  {Array.from({ length: totalPeople }, (_, idx) => (
                    <div key={idx} className="mb-4 p-3 rounded-lg" style={{ background: idx === 0 ? "var(--color-parchment)" : "#fafafa", border: "1px solid #eee" }}>
                      <p className="text-xs font-bold mb-2" style={{ color: "var(--color-ink)" }}>
                        {idx === 0 ? "👤 報名人（本人）" : `👤 第 ${idx + 1} 位同行者`}
                      </p>

                      <div className="space-y-2">
                        <input type="text" value={person(idx).name} onChange={(e: any) => updatePerson(idx, "name", e.target.value)} placeholder="姓名 *" className="w-full h-8 px-3 rounded text-xs" style={{ border: "1px solid #ddd", outline: "none" }} />

                        {idx === 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            <input type="tel" value={person(idx).phone} onChange={(e: any) => updatePerson(idx, "phone", e.target.value)} placeholder="電話 *" className="w-full h-8 px-3 rounded text-xs" style={{ border: "1px solid #ddd", outline: "none" }} />
                            <input type="email" value={person(idx).email} onChange={(e: any) => updatePerson(idx, "email", e.target.value)} placeholder="Email *" className="w-full h-8 px-3 rounded text-xs" style={{ border: "1px solid #ddd", outline: "none" }} />
                          </div>
                        )}

                        {needInsurance && (
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={person(idx).idNumber} onChange={(e: any) => updatePerson(idx, "idNumber", e.target.value)} placeholder="身分證字號 *（保險用）" className="w-full h-8 px-3 rounded text-xs" style={{ border: "1px solid #ddd", outline: "none" }} />
                            <input type="date" value={person(idx).birthday} onChange={(e: any) => updatePerson(idx, "birthday", e.target.value)} className="w-full h-8 px-3 rounded text-xs" style={{ border: "1px solid #ddd", outline: "none", color: person(idx).birthday ? "#333" : "#999" }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "var(--color-teal)", border: "none", cursor: "pointer" }}>
                    確認報名 — NT$ {grandTotal.toLocaleString()}
                  </button>
                </div>
              );
            })()}

            {!showRegForm && <p className="text-[10px] text-center" style={{ color: "var(--color-mist)" }}>報名後將收到確認信，付款完成即完成報名</p>}
            </>)}
          </div>
        </div>}
      </div>

      <AlsoWantToKnow />
      <MightAlsoLike />
    </article>
  );
}
