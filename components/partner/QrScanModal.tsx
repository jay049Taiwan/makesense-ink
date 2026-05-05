"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── 訂單資料型別 ────────────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}
interface RealOrder {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
  checkinStatus: string; // pending / in_progress / checked_in
  items: OrderItem[];
}

// ── QR 掃碼 Modal ────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  /** DB08 notion_id（32 碼無 dash）；null = dev 模式（不驗廠商） */
  notionId?: string | null;
}

type ScanStep =
  | "scanning"
  | "loading"
  | "found"
  | "not_found"
  | "already_checked_in"
  | "wrong_vendor"
  | "completed";

export default function QrScanModal({ onClose, notionId }: Props) {
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [step, setStep] = useState<ScanStep>("scanning");
  const [order, setOrder] = useState<RealOrder | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // ── 啟動相機掃描 ──
  useEffect(() => {
    let scanner: any;
    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!scannerDivRef.current) return;
        scanner = new Html5QrcodeScanner(
          "qr-scanner-region",
          { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true, showTorchButtonIfSupported: true },
          false
        );
        scannerRef.current = scanner;
        scanner.render(
          (text: string) => { scanner.clear().catch(() => {}); handleScanResult(text); },
          () => {}
        );
      } catch (err: any) {
        const msg = err?.message || "";
        setCameraError(
          msg.includes("camera") || err?.name === "NotAllowedError"
            ? "無法開啟相機，請確認瀏覽器已授予相機權限，且頁面是 HTTPS 或 localhost。"
            : "掃碼功能載入失敗，請重新整理後再試。"
        );
      }
    }
    startScanner();
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 解析掃碼結果 → 取得 orderId ──
  function parseOrderId(text: string): string | null {
    const t = text.trim();
    // JSON 格式：{ "order_id": "..." } 或 { "orderId": "..." }
    try {
      const obj = JSON.parse(t);
      if (obj.order_id) return obj.order_id;
      if (obj.orderId) return obj.orderId;
    } catch { /* 不是 JSON */ }
    // "order:UUID" 前綴格式
    if (t.startsWith("order:")) return t.slice(6);
    // 直接是 UUID（32 hex 無 dash 或標準 UUID 格式）
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t;
    if (/^[0-9a-f]{32}$/i.test(t)) return `${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`;
    return null;
  }

  async function handleScanResult(text: string) {
    setStep("loading");
    const orderId = parseOrderId(text);
    if (!orderId) { setStep("not_found"); return; }

    try {
      const res = await fetch("/api/partner/qr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", orderId, partnerNotionId: notionId }),
      });
      const data = await res.json();
      if (!data.ok) { setStep("not_found"); return; }
      if (data.step === "not_found" || data.step === "already_checked_in" || data.step === "wrong_vendor") {
        setStep(data.step);
        return;
      }
      const o = data.order;
      setOrder({
        orderId: o.orderId,
        buyerName: o.buyerName,
        buyerPhone: o.buyerPhone,
        createdAt: new Date(o.createdAt).toLocaleString("zh-TW"),
        checkinStatus: o.checkinStatus,
        items: o.items,
      });
      setStep("found");
    } catch {
      setStep("not_found");
    }
  }

  async function confirmPickup() {
    if (!order) return;
    setConfirming(true);
    try {
      await fetch("/api/partner/qr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", orderId: order.orderId }),
      });
      setOrder({ ...order, checkinStatus: "checked_in" });
      setStep("completed");
    } finally {
      setConfirming(false);
    }
  }

  const total = order ? order.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ width: 320, maxHeight: "90vh", background: "#fff", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "#1a1a2e" }}>
          <p className="text-sm font-semibold" style={{ color: "#fff" }}>📷 掃碼簽到</p>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* 掃描中 */}
        {step === "scanning" && (
          <div>
            {cameraError ? (
              <div className="p-5 text-center">
                <p className="text-3xl mb-3">📵</p>
                <p className="text-sm font-semibold mb-2" style={{ color: "#333" }}>相機無法開啟</p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "#888" }}>{cameraError}</p>
                <div className="p-3 rounded-xl" style={{ background: "#faf8f4", border: "1px solid #e8e0d4" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#7a5c40" }}>🛠 輸入訂單 ID 測試</p>
                  <DevInput onResult={handleScanResult} placeholder="貼上 Order UUID" />
                </div>
              </div>
            ) : (
              <div>
                <div id="qr-scanner-region" ref={scannerDivRef} style={{ width: "100%" }} />
                <div className="px-4 pb-4">
                  <p className="text-xs text-center" style={{ color: "#aaa" }}>將訂單 QR Code 對準框內掃描</p>
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "#faf8f4", border: "1px dashed #c8b89a" }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "#7a5c40" }}>🛠 Dev 測試</p>
                    <DevInput onResult={handleScanResult} placeholder="貼上 Order UUID" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 查詢中 */}
        {step === "loading" && (
          <div className="p-10 text-center">
            <p className="text-3xl mb-3 animate-pulse">🔍</p>
            <p className="text-sm" style={{ color: "#888" }}>查詢訂單中…</p>
          </div>
        )}

        {/* 查無訂單 */}
        {step === "not_found" && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-base font-semibold mb-1" style={{ color: "#333" }}>查無訂單</p>
            <p className="text-xs mb-4" style={{ color: "#aaa" }}>找不到這筆訂單，請確認 QR Code 是否正確</p>
            <button onClick={() => setStep("scanning")} className="w-full h-10 rounded-xl text-sm font-semibold"
              style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}>
              重新掃描
            </button>
          </div>
        )}

        {/* 已簽到 */}
        {step === "already_checked_in" && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-base font-semibold mb-1" style={{ color: "#333" }}>此訂單已簽到</p>
            <p className="text-xs mb-4" style={{ color: "#aaa" }}>這筆訂單已完成取貨，不能重複簽到</p>
            <button onClick={() => setStep("scanning")} className="w-full h-10 rounded-xl text-sm font-semibold"
              style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}>
              繼續掃下一位
            </button>
          </div>
        )}

        {/* 非本廠商的訂單 */}
        {step === "wrong_vendor" && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-base font-semibold mb-1" style={{ color: "#333" }}>非本攤位訂單</p>
            <p className="text-xs mb-4" style={{ color: "#aaa" }}>此訂單的商品不屬於您的攤位</p>
            <button onClick={() => setStep("scanning")} className="w-full h-10 rounded-xl text-sm font-semibold"
              style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}>
              重新掃描
            </button>
          </div>
        )}

        {/* 找到訂單 */}
        {step === "found" && order && (
          <div className="p-4">
            <div className="rounded-xl p-3 mb-3" style={{ background: "#faf8f4", border: "1px solid #e8e0d4" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-base font-bold" style={{ color: "#1a1a2e" }}>{order.buyerName}</p>
                  <p className="text-xs" style={{ color: "#aaa" }}>📞 {order.buyerPhone}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                  {order.checkinStatus === "in_progress" ? "進行中" : "已確認"}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "#bbb" }}>預購時間：{order.createdAt}</p>
              <div style={{ borderTop: "1px solid #ede8e0", paddingTop: 8 }}>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1" style={{ color: "#333" }}>
                    <span>{item.name} <span style={{ color: "#aaa" }}>×{item.qty}</span></span>
                    <span style={{ color: "#e8935a", fontWeight: 600 }}>NT$ {(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 mt-1"
                  style={{ borderTop: "1px solid #ede8e0", fontWeight: 700, color: "#1a1a2e" }}>
                  <span>合計</span>
                  <span>NT$ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button onClick={confirmPickup} disabled={confirming}
              className="w-full h-12 rounded-xl text-sm font-bold mb-2"
              style={{ background: confirming ? "#aaa" : "#4CAF50", color: "#fff", border: "none", cursor: confirming ? "default" : "pointer" }}>
              {confirming ? "處理中…" : `✅ 確認取貨・收款 NT$ ${total.toLocaleString()}`}
            </button>
            <button onClick={() => setStep("scanning")} className="w-full h-9 rounded-xl text-sm font-medium"
              style={{ background: "#fff", color: "#aaa", border: "1px solid #ddd", cursor: "pointer" }}>
              取消，重新掃描
            </button>
          </div>
        )}

        {/* 取貨完成 */}
        {step === "completed" && order && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-base font-bold mb-1" style={{ color: "#1a1a2e" }}>取貨完成！</p>
            <p className="text-sm mb-1" style={{ color: "#333" }}>{order.buyerName} 的訂單已完成</p>
            <p className="text-lg font-bold mb-4" style={{ color: "#4CAF50" }}>已收款 NT$ {total.toLocaleString()}</p>
            <div className="flex gap-2">
              <button onClick={() => setStep("scanning")} className="flex-1 h-10 rounded-xl text-sm font-semibold"
                style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}>
                繼續掃下一位
              </button>
              <button onClick={onClose} className="flex-1 h-10 rounded-xl text-sm font-medium"
                style={{ background: "#fff", color: "#888", border: "1px solid #ddd", cursor: "pointer" }}>
                關閉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dev 模式輸入框 ────────────────────────────────────────────────────────────
function DevInput({ onResult, placeholder }: { onResult: (text: string) => void; placeholder?: string }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)}
        placeholder={placeholder || "Order UUID"}
        className="flex-1 h-8 px-2 rounded-lg text-xs outline-none"
        style={{ border: "1px solid #ddd" }}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onResult(val.trim()); setVal(""); } }}
      />
      <button onClick={() => { if (val.trim()) { onResult(val.trim()); setVal(""); } }}
        className="px-3 h-8 rounded-lg text-xs font-semibold"
        style={{ background: "#7a5c40", color: "#fff", border: "none", cursor: "pointer" }}>
        模擬
      </button>
    </div>
  );
}
