"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "success";
  const orderId = searchParams.get("orderId") || "";
  const isReview = status === "review";
  // 從真實 orderId 取訂單編號（前 8 字元，大寫）；沒有 orderId 時顯示 '—'
  const orderNumber = orderId ? `MS-${orderId.slice(0, 8).toUpperCase()}` : "—";

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="text-center" style={{ maxWidth: 480 }}>

        {isReview ? (
          /* ═══ 受理中（含票券的訂單）═══ */
          <div className="rounded-xl p-8 mb-6" style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid #4ECDC4" }}>
            <p className="text-4xl mb-4">📋</p>
            <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
              付款完成，報名受理中
            </h1>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-bark)" }}>
              費用已收取完成，您的報名資料正在受理中。
              <br />
              我們確認後將以 <strong>Email</strong> 及 <strong>LINE</strong> 通知您結果。
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium" style={{ background: "rgba(78,205,196,0.12)", color: "var(--color-teal)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ECDC4" }} />
              受理中
            </div>
          </div>
        ) : (
          /* ═══ 直接成功（純商品訂單）═══ */
          <div className="rounded-xl p-8 mb-6" style={{ background: "#F0FFF4", border: "1px solid #9AE6B4" }}>
            <p className="text-4xl mb-4">✅</p>
            <h1 className="text-xl font-semibold mb-3" style={{ color: "#1A3A2E" }}>
              付款成功！
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#4A5568" }}>
              感謝您的購買，確認信已寄送至您的信箱。
            </p>
          </div>
        )}

        {/* 訂單編號 */}
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--color-mist)" }}>訂單編號</span>
            <span className="font-mono font-medium" style={{ color: "var(--color-ink)" }}>
              {orderNumber}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span style={{ color: "var(--color-mist)" }}>付款狀態</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(154,230,180,0.2)", color: "#1A3A2E" }}>
              已付款
            </span>
          </div>
          {isReview && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span style={{ color: "var(--color-mist)" }}>報名狀態</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(78,205,196,0.12)", color: "var(--color-teal)" }}>
                受理中
              </span>
            </div>
          )}
        </div>

        {/* 導航按鈕 */}
        <div className="flex gap-3 justify-center">
          <Link href={orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders"} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: "var(--color-teal)" }}>
            查看訂單
          </Link>
          <Link href="/bookstore" className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}>
            繼續逛逛
          </Link>
        </div>

        <p className="text-[0.65em] mt-6" style={{ color: "var(--color-mist)" }}>
          {isReview
            ? "我們會盡快確認您的報名，結果將透過 Email 與 LINE 官方帳號通知。"
            : "如有任何問題，歡迎透過 LINE 官方帳號聯繫我們。"}
        </p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-16"><p style={{ color: "var(--color-mist)" }}>載入中...</p></div>}>
      <SuccessContent />
    </Suspense>
  );
}
