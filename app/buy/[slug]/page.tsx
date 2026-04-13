"use client";

import { use, useState } from "react";
import { MOCK_ACTIVITIES, MOCK_PRODUCTS } from "@/lib/mock-data";
import { activityProductConfig, marketConfig, type MarketConfig } from "@/lib/vendor-page-config";
import MarketPreOrderPanel from "@/components/booking/MarketPreOrderPanel";

// ── Dev 用 demo 市集資料（正式環境從 marketConfig 讀） ──────────────────
const DEMO_MARKET: MarketConfig = {
  title: "春日好物市集 預購表單",
  date: "2026/05/10（日）10:00–17:00",
  pickupNote: "市集當天現場取貨，攤位繳費",
  vendors: [
    {
      id: "v1",
      name: "蘭東書坊",
      description: "在地出版品、地方誌選物",
      products: [
        { id: "v1p1", name: "蘭東案內 06期", price: 280, note: "小鎮麵包地圖特輯", stock: 20 },
        { id: "v1p2", name: "宜蘭街散步圖", price: 50, stock: 50 },
        { id: "v1p3", name: "散步宜蘭街貼紙", price: 30, stock: 100 },
      ],
    },
    {
      id: "v2",
      name: "木質感手作坊",
      description: "純手工木作小物、器皿",
      products: [
        { id: "v2p1", name: "手作木湯匙", price: 350, note: "胡桃木", stock: 10 },
        { id: "v2p2", name: "木製掛鉤（2入）", price: 480, stock: 8 },
        { id: "v2p3", name: "木質名片座", price: 220, stock: 0 },
      ],
    },
    {
      id: "v3",
      name: "山頂果園",
      description: "宜蘭溪北有機水果・果乾",
      products: [
        { id: "v3p1", name: "檸檬果乾（100g）", price: 180, stock: 30 },
        { id: "v3p2", name: "金棗果乾（100g）", price: 150, stock: 25 },
        { id: "v3p3", name: "有機金棗 1kg", price: 280, note: "季節限定", stock: 15 },
      ],
    },
    {
      id: "v4",
      name: "手感皂工作室",
      description: "天然手工皂、香氛蠟燭",
      products: [
        { id: "v4p1", name: "薰衣草手工皂", price: 180, stock: 20 },
        { id: "v4p2", name: "山茶花保濕皂", price: 200, stock: 12 },
        { id: "v4p3", name: "香氛大豆蠟燭", price: 320, stock: 8 },
      ],
    },
  ],
};

// ── 根據 slug 找活動、商品或市集 ───────────────────────────────────────
function usePageData(slug: string) {
  // 1. 市集預購
  const market = marketConfig[slug];
  if (market) return { type: "market" as const, market };

  // dev demo 市集
  if (slug === "spring-market-2026") {
    return { type: "market" as const, market: DEMO_MARKET };
  }

  // 2. 活動報名
  const activity = MOCK_ACTIVITIES.find((a) => a.id === slug);
  if (activity) {
    const configuredIds = activityProductConfig[slug] || [];
    const products =
      configuredIds.length > 0
        ? MOCK_PRODUCTS.filter((p) => configuredIds.includes(p.id))
        : [];
    return { type: "activity" as const, activity, products };
  }

  // 3. 單一商品快速購買
  const product = MOCK_PRODUCTS.find((p) => p.id === slug);
  if (product) return { type: "product" as const, product };

  return null;
}

const typeColorMap: Record<string, string> = {
  走讀行旅: "#4ECDC4",
  講座: "#7a5c40",
  市集: "#e8935a",
};

export default function BuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const data = usePageData(slug);

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f4",
        }}
      >
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-semibold" style={{ color: "#333" }}>
            找不到此頁面
          </p>
          <p className="text-sm mt-2" style={{ color: "#aaa" }}>
            連結可能已過期或不存在
          </p>
        </div>
      </div>
    );
  }

  if (data.type === "market") {
    return <MarketBuyPage market={data.market} />;
  }
  if (data.type === "activity") {
    return <ActivityPage activity={data.activity} products={data.products} />;
  }
  return <ProductPage product={data.product} />;
}

// ══════════════════════════════════════════
// 市集預購頁（整合 MarketPreOrderPanel）
// ══════════════════════════════════════════
function MarketBuyPage({ market }: { market: MarketConfig }) {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", paddingBottom: 40 }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
        <p className="text-xs mb-4" style={{ color: "#bbb" }}>
          📍 現思文化創藝術 · 旅人書店
        </p>
        <MarketPreOrderPanel
          marketTitle={market.title}
          marketDate={market.date}
          pickupNote={market.pickupNote}
          vendors={market.vendors}
          layout="inline"
        />
        <p className="text-center text-xs mt-4" style={{ color: "#ccc" }}>
          此頁面為市集預購專用，如有疑問請洽主辦單位
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// 活動報名頁
// ══════════════════════════════════════════
function ActivityPage({
  activity,
  products,
}: {
  activity: (typeof MOCK_ACTIVITIES)[0];
  products: typeof MOCK_PRODUCTS;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const typeColor = typeColorMap[activity.type] || "#7a5c40";
  const remaining = activity.capacity - activity.registered;
  const productTotal = products.reduce(
    (s, p) => s + p.price * (quantities[p.id] || 0),
    0
  );
  const total = activity.price + productTotal;

  function changeQty(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f4",
          padding: "24px",
        }}
      >
        <div className="text-center" style={{ maxWidth: 360 }}>
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-xl font-bold mb-2" style={{ color: "#1a1a2e" }}>
            報名成功！
          </p>
          <p className="text-sm mb-1" style={{ color: "#666" }}>
            {activity.title}
          </p>
          <p className="text-sm mb-4" style={{ color: "#999" }}>
            {activity.date}
          </p>
          <div
            className="rounded-xl p-4 mb-6"
            style={{ background: "#fff", border: "1px solid #e8e0d4" }}
          >
            <p className="text-xs" style={{ color: "#888" }}>
              報名人
            </p>
            <p className="font-semibold mt-1" style={{ color: "#333" }}>
              {name}
            </p>
            <p
              className="text-sm mt-2 pt-2"
              style={{
                borderTop: "1px solid #f0f0f0",
                color: "#e8935a",
                fontWeight: 600,
              }}
            >
              合計 NT$ {total.toLocaleString()}（門市付款）
            </p>
          </div>
          <p className="text-xs" style={{ color: "#aaa" }}>
            確認信將發送至 {email}
          </p>
          <p className="text-xs mt-1" style={{ color: "#aaa" }}>
            現場報到時出示此頁面或訂單 Email 即可
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", paddingBottom: 100 }}>
      {/* 活動封面區 */}
      <div style={{ background: "#1a1a2e", padding: "32px 20px 24px" }}>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: typeColor, color: "#fff" }}
        >
          {activity.type}
        </span>
        <h1 className="text-xl font-bold mt-3 mb-1" style={{ color: "#fff" }}>
          {activity.title}
        </h1>
        <div
          className="flex flex-wrap gap-3 text-sm"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          <span>📅 {activity.date}</span>
          <span>👥 剩餘 {remaining} 個名額</span>
          {activity.price > 0 && (
            <span>💰 NT$ {activity.price.toLocaleString()}</span>
          )}
          {activity.price === 0 && <span>🆓 免費入場</span>}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        {/* 預購商品（如有） */}
        {products.length > 0 && (
          <div
            className="rounded-xl overflow-hidden mb-5"
            style={{ background: "#fff", border: "1px solid #e8e0d4" }}
          >
            <div
              className="px-4 py-3"
              style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}
            >
              <p className="text-sm font-semibold" style={{ color: "#333" }}>
                🛍️ 加購商品（選填）
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>
                現場取貨，不另外運送
              </p>
            </div>
            {products.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid #f5f5f5" }}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#333" }}>
                    {p.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "#e8935a", fontWeight: 600 }}
                  >
                    NT$ {p.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQty(p.id, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "#f5f0eb",
                      color: "#7a5c40",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    －
                  </button>
                  <span
                    className="w-5 text-center text-sm font-semibold"
                    style={{ color: "#333" }}
                  >
                    {quantities[p.id] || 0}
                  </span>
                  <button
                    onClick={() => changeQty(p.id, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "#7a5c40",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 報名表單 */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: "#fff", border: "1px solid #e8e0d4" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "#333" }}>
            報名資料
          </p>
          <div className="space-y-3">
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "#666" }}
              >
                姓名 *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="您的姓名"
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "#666" }}
              >
                電話 *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912-345-678"
                type="tel"
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "#666" }}
              >
                Email（選填，用於收確認信）
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                type="email"
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
          </div>
        </div>

        {/* 信任標章 */}
        <div
          className="flex justify-center gap-4 text-xs mb-4"
          style={{ color: "#aaa" }}
        >
          <span>🔒 安全傳輸</span>
          <span>📍 門市取貨/現場繳費</span>
          <span>📧 Email 確認</span>
        </div>
      </div>

      {/* 底部懸浮按鈕 */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
        style={{ background: "linear-gradient(transparent, #faf8f4 30%)" }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={() => {
              if (name && phone) setSubmitted(true);
            }}
            disabled={!name || !phone}
            className="w-full h-14 rounded-2xl text-base font-bold transition-all"
            style={{
              background: name && phone ? "#1a1a2e" : "#ddd",
              color: name && phone ? "#fff" : "#aaa",
              border: "none",
              cursor: name && phone ? "pointer" : "default",
            }}
          >
            {total > 0
              ? `立即報名 NT$ ${total.toLocaleString()}`
              : "立即報名（免費）"}
          </button>
          <p className="text-center text-xs mt-2" style={{ color: "#aaa" }}>
            費用於{activity.price > 0 ? "門市或現場" : "現場"}繳交
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// 商品快速購買頁
// ══════════════════════════════════════════
function ProductPage({ product }: { product: (typeof MOCK_PRODUCTS)[0] }) {
  const [qty, setQty] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f4",
          padding: "24px",
        }}
      >
        <div className="text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-xl font-bold mb-2" style={{ color: "#1a1a2e" }}>
            訂單已送出！
          </p>
          <p className="text-sm" style={{ color: "#666" }}>
            {product.name} × {qty}
          </p>
          <p className="text-sm mt-2 font-bold" style={{ color: "#e8935a" }}>
            NT$ {(product.price * qty).toLocaleString()}
          </p>
          <p className="text-xs mt-4" style={{ color: "#aaa" }}>
            門市取貨時繳費，{name} 你好
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", paddingBottom: 100 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{ background: "#fff", border: "1px solid #e8e0d4" }}
        >
          {product.photo && (
            <img
              src={product.photo}
              alt={product.name}
              className="w-full object-cover"
              style={{ height: 220 }}
            />
          )}
          <div className="p-5">
            <p
              className="text-xs px-2 py-1 rounded-full inline-block mb-2"
              style={{ background: "#f5f0eb", color: "#7a5c40" }}
            >
              {product.category}
            </p>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>
              {product.name}
            </h1>
            <p className="text-2xl font-bold" style={{ color: "#e8935a" }}>
              NT$ {product.price.toLocaleString()}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: product.stock === 0 ? "#e53e3e" : "#aaa" }}
            >
              {product.stock === 0 ? "目前缺貨" : `庫存 ${product.stock} 件`}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: "#fff", border: "1px solid #e8e0d4" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "#333" }}>
            購買資料
          </p>
          <div className="space-y-3">
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "#666" }}
              >
                姓名 *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="您的姓名"
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "#666" }}
              >
                電話 *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912-345-678"
                type="tel"
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#666" }}
              >
                數量
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "#f5f0eb",
                    color: "#7a5c40",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  －
                </button>
                <span
                  className="text-lg font-bold"
                  style={{ color: "#333", minWidth: 24, textAlign: "center" }}
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "#7a5c40",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex justify-center gap-4 text-xs mb-4"
          style={{ color: "#aaa" }}
        >
          <span>🔒 安全傳輸</span>
          <span>📍 門市取貨</span>
          <span>📧 Email 確認</span>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
        style={{ background: "linear-gradient(transparent, #faf8f4 30%)" }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={() => {
              if (name && phone) setSubmitted(true);
            }}
            disabled={!name || !phone || product.stock === 0}
            className="w-full h-14 rounded-2xl text-base font-bold"
            style={{
              background: name && phone && product.stock > 0 ? "#1a1a2e" : "#ddd",
              color: name && phone ? "#fff" : "#aaa",
              border: "none",
              cursor: name && phone ? "pointer" : "default",
            }}
          >
            {product.stock === 0
              ? "目前缺貨"
              : `立即購買 NT$ ${(product.price * qty).toLocaleString()}`}
          </button>
          <p className="text-center text-xs mt-2" style={{ color: "#aaa" }}>
            門市取貨時繳費
          </p>
        </div>
      </div>
    </div>
  );
}
