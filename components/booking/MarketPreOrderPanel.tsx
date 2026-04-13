"use client";

import { useState } from "react";

export interface PreOrderProduct {
  id: string;
  name: string;
  price: number;
  note?: string;
  photo?: string;
  stock?: number;
}

export interface PreOrderVendor {
  id: string;
  name: string;
  description?: string;
  products: PreOrderProduct[];
}

interface MarketPreOrderPanelProps {
  marketTitle: string;
  marketDate?: string;
  pickupNote?: string;
  vendors: PreOrderVendor[];
  /** 嵌入模式：inline（預設）/ sidebar */
  layout?: "inline" | "sidebar";
}

export default function MarketPreOrderPanel({
  marketTitle,
  marketDate,
  pickupNote = "現場取貨，市集當天繳費",
  vendors,
  layout = "inline",
}: MarketPreOrderPanelProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"select" | "form" | "done">("select");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allProducts = vendors.flatMap((v) => v.products);
  const total = allProducts.reduce((s, p) => s + p.price * (quantities[p.id] || 0), 0);
  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);

  const orderedItems = vendors.flatMap((v) =>
    v.products
      .filter((p) => (quantities[p.id] || 0) > 0)
      .map((p) => ({ ...p, vendorName: v.name, qty: quantities[p.id] }))
  );

  function changeQty(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  function toggleVendor(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSubmit() {
    if (!name || !phone) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setStep("done");
  }

  // ── 成功畫面 ──────────────────────────────
  if (step === "done") {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ border: "1px solid #e8e0d4", background: "#fff" }}
      >
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-lg font-bold mb-1" style={{ color: "#1a1a2e" }}>預訂成功！</p>
        <p className="text-sm mb-4" style={{ color: "#666" }}>
          {name}，感謝您預訂 {marketTitle}
        </p>
        <div
          className="rounded-xl p-4 text-left mb-4"
          style={{ background: "#faf8f4", border: "1px solid #ede8e0" }}
        >
          {orderedItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1" style={{ color: "#333" }}>
              <span>
                <span style={{ color: "#aaa", fontSize: 11 }}>{item.vendorName}｜</span>
                {item.name} ×{item.qty}
              </span>
              <span style={{ fontWeight: 600, color: "#e8935a" }}>
                NT$ {(item.price * item.qty).toLocaleString()}
              </span>
            </div>
          ))}
          <div
            className="flex justify-between text-sm pt-3 mt-2"
            style={{ borderTop: "1px solid #ddd", fontWeight: 700, color: "#1a1a2e" }}
          >
            <span>合計</span>
            <span>NT$ {total.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-xs" style={{ color: "#aaa" }}>市集當天現場取貨並繳費，謝謝！</p>
      </div>
    );
  }

  const maxWidth = layout === "sidebar" ? 360 : undefined;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #e8e0d4", background: "#fff", maxWidth }}
    >
      {/* ── 標題 ───────────────────────────── */}
      <div style={{ background: "#1a1a2e", padding: "16px 20px" }}>
        {marketDate && (
          <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            📅 {marketDate}
          </p>
        )}
        <p className="text-base font-bold" style={{ color: "#fff" }}>
          🛍️ {marketTitle}
        </p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {pickupNote}
        </p>
      </div>

      {/* ── 廠商列表 ────────────────────────── */}
      <div>
        {vendors.map((vendor, idx) => {
          const isOpen = !!expanded[vendor.id];
          const vendorTotal = vendor.products.reduce(
            (s, p) => s + p.price * (quantities[p.id] || 0),
            0
          );
          const vendorQty = vendor.products.reduce(
            (s, p) => s + (quantities[p.id] || 0),
            0
          );

          return (
            <div
              key={vendor.id}
              style={{ borderBottom: idx < vendors.length - 1 ? "1px solid #f0ebe3" : undefined }}
            >
              {/* 廠商標題列（點擊展開） */}
              <button
                onClick={() => toggleVendor(vendor.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                style={{
                  background: isOpen ? "#faf8f4" : "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#333" }}>
                    {vendor.name}
                  </p>
                  {vendor.description && (
                    <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>
                      {vendor.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {vendorQty > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "#e8935a", color: "#fff" }}
                    >
                      {vendorQty} 件 NT${vendorTotal.toLocaleString()}
                    </span>
                  )}
                  <span style={{ color: "#aaa", fontSize: 18, lineHeight: 1 }}>
                    {isOpen ? "︿" : "﹀"}
                  </span>
                </div>
              </button>

              {/* 商品列表 */}
              {isOpen && (
                <div style={{ background: "#fdfbf8" }}>
                  {vendor.products.map((product) => {
                    const qty = quantities[product.id] || 0;
                    const isOutOfStock = product.stock === 0;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderTop: "1px solid #f0ebe3" }}
                      >
                        {product.photo && (
                          <img
                            src={product.photo}
                            alt={product.name}
                            className="rounded-lg object-cover flex-shrink-0"
                            style={{ width: 44, height: 44 }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: isOutOfStock ? "#bbb" : "#333" }}
                          >
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: isOutOfStock ? "#ccc" : "#e8935a" }}
                            >
                              NT$ {product.price.toLocaleString()}
                            </p>
                            {product.note && (
                              <p className="text-xs" style={{ color: "#bbb" }}>
                                · {product.note}
                              </p>
                            )}
                            {isOutOfStock && (
                              <p className="text-xs" style={{ color: "#e53e3e" }}>
                                缺貨
                              </p>
                            )}
                          </div>
                        </div>
                        {!isOutOfStock && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => changeQty(product.id, -1)}
                              className="flex items-center justify-center rounded-full text-sm font-bold"
                              style={{
                                width: 28,
                                height: 28,
                                background: qty > 0 ? "#7a5c40" : "#f0ebe3",
                                color: qty > 0 ? "#fff" : "#bbb",
                                border: "none",
                                cursor: qty > 0 ? "pointer" : "default",
                              }}
                            >
                              −
                            </button>
                            <span
                              className="text-sm font-bold text-center"
                              style={{ color: "#333", minWidth: 20 }}
                            >
                              {qty}
                            </span>
                            <button
                              onClick={() => changeQty(product.id, 1)}
                              className="flex items-center justify-center rounded-full text-sm font-bold"
                              style={{
                                width: 28,
                                height: 28,
                                background: "#7a5c40",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              ＋
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 底部：選購摘要 or 填寫表單 ────── */}
      {step === "select" ? (
        <div className="px-4 py-4" style={{ borderTop: "1px solid #e8e0d4", background: "#faf8f4" }}>
          <div className="flex items-center justify-between">
            <div>
              {totalQty > 0 ? (
                <>
                  <p className="text-xs" style={{ color: "#888" }}>
                    已選 {totalQty} 件・共 {orderedItems.length} 品項
                  </p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: "#1a1a2e" }}>
                    NT$ {total.toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: "#bbb" }}>
                  點擊廠商名稱展開選購
                </p>
              )}
            </div>
            <button
              onClick={() => totalQty > 0 && setStep("form")}
              disabled={totalQty === 0}
              className="h-11 px-6 rounded-xl text-sm font-bold transition-all"
              style={{
                background: totalQty > 0 ? "#1a1a2e" : "#ddd",
                color: totalQty > 0 ? "#fff" : "#aaa",
                border: "none",
                cursor: totalQty > 0 ? "pointer" : "default",
              }}
            >
              填寫資料
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4" style={{ borderTop: "1px solid #e8e0d4" }}>
          {/* 訂單摘要 */}
          <div
            className="rounded-xl p-3 mb-4"
            style={{ background: "#faf8f4", border: "1px solid #ede8e0" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>
              預訂清單
            </p>
            {orderedItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-xs py-0.5"
                style={{ color: "#555" }}
              >
                <span>
                  {item.name} ×{item.qty}
                </span>
                <span style={{ color: "#e8935a", fontWeight: 600 }}>
                  NT$ {(item.price * item.qty).toLocaleString()}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between text-sm pt-2 mt-1.5"
              style={{ borderTop: "1px solid #ddd", fontWeight: 700 }}
            >
              <span>合計</span>
              <span style={{ color: "#1a1a2e" }}>NT$ {total.toLocaleString()}</span>
            </div>
          </div>

          {/* 聯絡資料 */}
          <p className="text-sm font-semibold mb-3" style={{ color: "#333" }}>
            取貨資料
          </p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#666" }}>
                姓名 *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="您的姓名"
                className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#666" }}>
                聯絡電話 *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912-345-678"
                type="tel"
                className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #ddd" }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("select")}
              className="h-11 px-4 rounded-xl text-sm font-semibold"
              style={{
                background: "#fff",
                color: "#888",
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              返回修改
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name || !phone || submitting}
              className="flex-1 h-11 rounded-xl text-sm font-bold"
              style={{
                background: name && phone ? "#1a1a2e" : "#ddd",
                color: name && phone ? "#fff" : "#aaa",
                border: "none",
                cursor: name && phone ? "pointer" : "default",
              }}
            >
              {submitting ? "處理中..." : `確認預訂 NT$ ${total.toLocaleString()}`}
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "#bbb" }}>
            市集當天現場取貨並繳費
          </p>
        </div>
      )}
    </div>
  );
}
