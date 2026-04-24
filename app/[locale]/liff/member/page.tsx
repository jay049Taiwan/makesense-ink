"use client";

import { useCart } from "@/components/providers/CartProvider";

/**
 * LIFF 右下按鈕：購物清單
 * 設計原則：
 * - 立即顯示購物車內容，不等任何 API（消除空白閃爍）
 * - 結帳 CTA 明顯
 * - 底部 3 個文字連結（會員資料 / 旅人書店 / 宜蘭文化俱樂部）
 */
export default function LiffCartPage() {
  const { items, totalPrice, totalItems, updateQty, removeItem } = useCart();
  const hasCart = items.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf8f4" }}>
      <div className="flex-1 pb-6">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-xl font-bold" style={{ color: "#2d2a26" }}>購物清單</h1>
          <p className="text-xs mt-1" style={{ color: "#999" }}>
            {hasCart ? `共 ${totalItems} 件商品` : "還沒加入任何商品"}
          </p>
        </div>

        {hasCart ? (
          <>
            {/* 商品列表 */}
            <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3"
                  style={{ borderTop: i > 0 ? "1px solid #f0ebe4" : undefined }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2" style={{ color: "#2d2a26" }}>{item.name}</p>
                    {item.subtitle && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>{item.subtitle}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: "#b5522a" }}>NT$ {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(item.id, Math.max(0, item.qty - 1))}
                        className="w-7 h-7 rounded-lg text-sm"
                        style={{ background: "#f0ebe4", color: "#7a5c40" }}
                        aria-label="減少"
                      >−</button>
                      <span className="text-sm w-6 text-center" style={{ color: "#2d2a26" }}>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="w-7 h-7 rounded-lg text-sm"
                        style={{ background: "#f0ebe4", color: "#7a5c40" }}
                        aria-label="增加"
                      >+</button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-xs"
                        style={{ color: "#999" }}
                      >移除</button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold flex-shrink-0" style={{ color: "#2d2a26" }}>
                    NT$ {(item.price * item.qty).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* 合計 + 結帳 */}
            <div className="mx-4 mt-3 p-4 rounded-2xl" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: "#666" }}>合計</span>
                <span className="text-2xl font-bold" style={{ color: "#b5522a" }}>NT$ {totalPrice.toLocaleString()}</span>
              </div>
              <a
                href="/checkout?liff_mode=true"
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-base font-semibold"
                style={{ background: "#4ECDC4", color: "#fff" }}
              >
                前往結帳
              </a>
            </div>
          </>
        ) : (
          <div className="mx-4 py-12 rounded-2xl text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#f0ebe4" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7a5c40" strokeWidth="1.8">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "#666" }}>購物清單是空的</p>
            <p className="text-xs mt-1" style={{ color: "#aaa" }}>從選書選物、活動體驗開始逛逛吧</p>
          </div>
        )}
      </div>

      {/* 底部文字連結 */}
      <nav className="px-4 py-5 text-center" style={{ borderTop: "1px solid #ece8e1" }}>
        <div className="flex items-center justify-center gap-4 text-xs flex-wrap" style={{ color: "#7a5c40" }}>
          <a href="/dashboard?liff_mode=true" className="underline underline-offset-4">前往個人會員資料</a>
          <span style={{ color: "#ccc" }}>·</span>
          <a href="/bookstore?liff_mode=true" className="underline underline-offset-4">探索旅人書店</a>
          <span style={{ color: "#ccc" }}>·</span>
          <a href="/cultureclub?liff_mode=true" className="underline underline-offset-4">前往宜蘭文化俱樂部</a>
        </div>
      </nav>
    </div>
  );
}
