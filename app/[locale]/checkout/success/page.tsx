"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface OrderItem {
  id: string;
  item_type: string;
  quantity: number;
  price: number;
  meta?: { name?: string; subtitle?: string };
}
interface OrderData {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "success";
  const orderId = searchParams.get("orderId") || "";
  const isReview = status === "review";
  const orderNumber = orderId ? `MS-${orderId.slice(0, 8).toUpperCase()}` : "—";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setOrder(d.order))
      .catch(e => setLoadError(typeof e === "number" ? `HTTP ${e}` : "讀取失敗"));
  }, [orderId]);

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="w-full" style={{ maxWidth: 560 }}>

        {isReview ? (
          <div className="rounded-xl p-8 mb-6 text-center" style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid #4ECDC4" }}>
            <p className="text-4xl mb-4">📋</p>
            <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--color-ink)" }}>付款完成，報名受理中</h1>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-bark)" }}>
              費用已收取完成，您的報名資料正在受理中。
              <br />我們確認後將以 <strong>Email</strong> 及 <strong>LINE</strong> 通知您結果。
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-8 mb-6 text-center" style={{ background: "#F0FFF4", border: "1px solid #9AE6B4" }}>
            <p className="text-4xl mb-4">✅</p>
            <h1 className="text-xl font-semibold mb-3" style={{ color: "#1A3A2E" }}>付款成功！</h1>
            <p className="text-sm leading-relaxed" style={{ color: "#4A5568" }}>
              感謝您的購買，確認信已寄送至您的信箱。
            </p>
          </div>
        )}

        {/* 訂單編號 + 狀態 */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--color-mist)" }}>訂單編號</span>
            <span className="font-mono font-medium" style={{ color: "var(--color-ink)" }}>{orderNumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span style={{ color: "var(--color-mist)" }}>付款狀態</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(154,230,180,0.2)", color: "#1A3A2E" }}>已付款</span>
          </div>
          {isReview && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span style={{ color: "var(--color-mist)" }}>報名狀態</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(78,205,196,0.12)", color: "var(--color-teal)" }}>受理中</span>
            </div>
          )}
        </div>

        {/* 訂單明細 */}
        <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-ink)" }}>訂單明細</h2>
          {loadError && <p className="text-sm" style={{ color: "#c87060" }}>{loadError}</p>}
          {!order && !loadError && <p className="text-sm" style={{ color: "var(--color-mist)" }}>載入中…</p>}
          {order && (
            <>
              <div className="divide-y" style={{ borderColor: "var(--color-dust)" }}>
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{item.meta?.name || "—"}</p>
                      {item.meta?.subtitle && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-mist)" }}>{item.meta.subtitle}</p>
                      )}
                      <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>{item.item_type} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
                      NT$ {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 mt-1 text-sm font-semibold" style={{ borderTop: "1px solid var(--color-dust)", color: "var(--color-ink)" }}>
                <span>總計</span>
                <span style={{ color: "#b5522a" }}>NT$ {order.total.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        <p className="text-[0.65em] mt-6 text-center" style={{ color: "var(--color-mist)" }}>
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
