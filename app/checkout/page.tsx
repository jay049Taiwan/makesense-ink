"use client";

import { useState } from "react";

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState("credit");

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12">
      <h1 className="text-[1.5em] font-bold mb-8" style={{ color: "var(--color-ink)" }}>
        購物車與結帳
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: Cart items + checkout form */}
        <div>
          {/* Cart items */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-bark)" }}>
              購物車內容
            </h2>
            <div
              className="rounded-lg p-6 text-center"
              style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}
            >
              <p style={{ color: "var(--color-muted)" }}>購物車是空的</p>
            </div>
          </section>

          {/* Checkout form */}
          <section>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-bark)" }}>
              結帳資訊
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>姓名 *</label>
                <input type="text" className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>Email *</label>
                <input type="email" className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>電話 *</label>
                <input type="tel" className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }} />
              </div>

              {/* SP-CO1: Dynamic fields based on product category */}
              <div
                className="rounded-lg p-4 text-sm"
                style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", color: "var(--color-muted)" }}
              >
                動態欄位區（依商品分類顯示：走讀/講座/市集/空間/預約/預購）
              </div>

              {/* Payment method */}
              <fieldset>
                <legend className="text-sm font-medium mb-2" style={{ color: "var(--color-ink)" }}>付款方式</legend>
                <div className="space-y-2">
                  {[
                    { value: "credit", label: "信用卡" },
                    { value: "atm", label: "ATM 轉帳" },
                    { value: "cvs", label: "超商代碼" },
                  ].map((method) => (
                    <label key={method.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        style={{ accentColor: "var(--color-teal)" }}
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Invoice */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>發票類型</label>
                <select className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                  <option>電子發票（個人）</option>
                  <option>公司統編</option>
                  <option>捐贈發票</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Order summary (sticky) */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
            <div className="p-5" style={{ background: "var(--color-warm-white)" }}>
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                訂單摘要
              </h3>

              {/* Items */}
              <div className="text-sm space-y-3 mb-4" style={{ color: "var(--color-muted)" }}>
                <p>尚無商品</p>
              </div>

              <div className="pt-3" style={{ borderTop: "1px solid var(--color-dust)" }}>
                <div className="flex justify-between mb-1 text-sm">
                  <span style={{ color: "var(--color-muted)" }}>小計</span>
                  <span style={{ color: "var(--color-ink)" }}>NT$ 0</span>
                </div>
                <div className="flex justify-between mb-1 text-sm">
                  <span style={{ color: "var(--color-muted)" }}>運費</span>
                  <span style={{ color: "var(--color-ink)" }}>NT$ 0</span>
                </div>
                <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--color-dust)" }}>
                  <span className="font-semibold" style={{ color: "var(--color-ink)" }}>合計</span>
                  <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                    NT$ 0
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <button
                className="w-full h-11 rounded text-sm font-medium text-white transition-colors opacity-50 cursor-not-allowed"
                style={{ background: "var(--color-moss)" }}
                disabled
              >
                前往付款（綠界 ECPay）
              </button>
              <p className="text-[0.7em] text-center mt-2" style={{ color: "var(--color-mist)" }}>
                付款由綠界科技處理，支援信用卡、ATM、超商代碼
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
