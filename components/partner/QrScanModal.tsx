"use client";

import { useEffect, useRef, useState } from "react";

// ── Mock 預購訂單資料（之後改為 Supabase 查詢）────────────────────────────
interface PreorderItem {
  name: string;
  qty: number;
  price: number;
}
interface MockPreorder {
  id: string;
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
  items: PreorderItem[];
  status: "confirmed" | "completed";
}

const MOCK_PREORDERS: Record<string, MockPreorder> = {
  "member_001": {
    id: "ord_20260510_001",
    buyerName: "王小明",
    buyerPhone: "0912-345-678",
    createdAt: "2026/05/08 14:32",
    items: [
      { name: "蘭東案內 06期", qty: 2, price: 280 },
      { name: "宜蘭街散步圖", qty: 1, price: 50 },
    ],
    status: "confirmed",
  },
  "member_002": {
    id: "ord_20260510_002",
    buyerName: "陳美麗",
    buyerPhone: "0923-456-789",
    createdAt: "2026/05/09 09:15",
    items: [
      { name: "散步宜蘭街貼紙", qty: 3, price: 30 },
    ],
    status: "confirmed",
  },
};

// ── QR 掃碼 Modal ──────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

type ScanStep = "scanning" | "found" | "not_found" | "completed";

export default function QrScanModal({ onClose }: Props) {
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [step, setStep] = useState<ScanStep>("scanning");
  const [preorder, setPreorder] = useState<MockPreorder | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 啟動相機掃描
  useEffect(() => {
    let html5QrcodeScanner: any;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!scannerDivRef.current) return;

        html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-scanner-region",
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.render(
          (decodedText: string) => {
            // 掃碼成功
            html5QrcodeScanner.clear().catch(() => {});
            handleScanResult(decodedText);
          },
          () => {
            // 掃描中（每幀失敗都會呼叫，不處理）
          }
        );
      } catch (err: any) {
        if (err?.message?.includes("camera") || err?.name === "NotAllowedError") {
          setCameraError("無法開啟相機，請確認瀏覽器已授予相機權限，且頁面是 HTTPS 或 localhost。");
        } else {
          setCameraError("掃碼功能載入失敗，請重新整理後再試。");
        }
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  function handleScanResult(text: string) {
    // 解析 member_id：支援純 ID 字串，或 JSON { member_id: "..." }
    let memberId = text.trim();
    try {
      const parsed = JSON.parse(text);
      if (parsed.member_id) memberId = parsed.member_id;
    } catch {
      // 純字串就直接用
    }

    // TODO: 正式環境改為：
    // const res = await fetch(`/api/preorders?member_id=${memberId}&vendor_id=${vendorId}`)
    const found = MOCK_PREORDERS[memberId];
    if (found) {
      setPreorder(found);
      setStep("found");
    } else {
      setStep("not_found");
    }
  }

  function confirmPickup() {
    if (preorder) {
      setPreorder({ ...preorder, status: "completed" });
      setStep("completed");
    }
  }

  const total = preorder
    ? preorder.items.reduce((s, i) => s + i.price * i.qty, 0)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ width: 320, maxHeight: "90vh", background: "#fff", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "#1a1a2e" }}>
          <p className="text-sm font-semibold" style={{ color: "#fff" }}>
            📷 掃碼簽到
          </p>
          <button
            onClick={onClose}
            style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        {/* 掃描畫面 */}
        {step === "scanning" && (
          <div>
            {cameraError ? (
              <div className="p-5 text-center">
                <p className="text-3xl mb-3">📵</p>
                <p className="text-sm font-semibold mb-2" style={{ color: "#333" }}>相機無法開啟</p>
                <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{cameraError}</p>
                {/* Dev 模式：直接輸入 member_id 測試 */}
                <div className="mt-4 p-3 rounded-xl" style={{ background: "#faf8f4", border: "1px solid #e8e0d4" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#7a5c40" }}>
                    🛠 Dev 模式測試
                  </p>
                  <p className="text-xs mb-2" style={{ color: "#aaa" }}>
                    輸入 member_001 或 member_002 模擬掃碼
                  </p>
                  <DevInput onResult={handleScanResult} />
                </div>
              </div>
            ) : (
              <div>
                <div
                  id="qr-scanner-region"
                  ref={scannerDivRef}
                  style={{ width: "100%" }}
                />
                <div className="px-4 pb-4">
                  <p className="text-xs text-center" style={{ color: "#aaa" }}>
                    將會員條碼對準框內掃描
                  </p>
                  {/* Dev 模式輸入框 */}
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "#faf8f4", border: "1px dashed #c8b89a" }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "#7a5c40" }}>🛠 Dev 測試</p>
                    <DevInput onResult={handleScanResult} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 找不到訂單 */}
        {step === "not_found" && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-base font-semibold mb-1" style={{ color: "#333" }}>查無預購訂單</p>
            <p className="text-xs mb-4" style={{ color: "#aaa" }}>
              此會員目前沒有跟您相關的待取貨預購紀錄
            </p>
            <button
              onClick={() => setStep("scanning")}
              className="w-full h-10 rounded-xl text-sm font-semibold"
              style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}
            >
              重新掃描
            </button>
          </div>
        )}

        {/* 找到訂單 */}
        {step === "found" && preorder && (
          <div className="p-4">
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: "#faf8f4", border: "1px solid #e8e0d4" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-base font-bold" style={{ color: "#1a1a2e" }}>
                    {preorder.buyerName}
                  </p>
                  <p className="text-xs" style={{ color: "#aaa" }}>
                    📞 {preorder.buyerPhone}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: "#e8f5e9", color: "#2e7d32" }}
                >
                  已確認
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "#bbb" }}>
                預購時間：{preorder.createdAt}
              </p>

              {/* 商品清單 */}
              <div style={{ borderTop: "1px solid #ede8e0", paddingTop: 8 }}>
                {preorder.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm py-1"
                    style={{ color: "#333" }}
                  >
                    <span>
                      {item.name}{" "}
                      <span style={{ color: "#aaa" }}>×{item.qty}</span>
                    </span>
                    <span style={{ color: "#e8935a", fontWeight: 600 }}>
                      NT$ {(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div
                  className="flex justify-between text-sm pt-2 mt-1"
                  style={{ borderTop: "1px solid #ede8e0", fontWeight: 700, color: "#1a1a2e" }}
                >
                  <span>合計</span>
                  <span>NT$ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={confirmPickup}
              className="w-full h-12 rounded-xl text-sm font-bold mb-2"
              style={{ background: "#4CAF50", color: "#fff", border: "none", cursor: "pointer" }}
            >
              ✅ 確認取貨・收款 NT$ {total.toLocaleString()}
            </button>
            <button
              onClick={() => setStep("scanning")}
              className="w-full h-9 rounded-xl text-sm font-medium"
              style={{ background: "#fff", color: "#aaa", border: "1px solid #ddd", cursor: "pointer" }}
            >
              取消，重新掃描
            </button>
          </div>
        )}

        {/* 取貨完成 */}
        {step === "completed" && preorder && (
          <div className="p-5 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-base font-bold mb-1" style={{ color: "#1a1a2e" }}>
              取貨完成！
            </p>
            <p className="text-sm mb-1" style={{ color: "#333" }}>
              {preorder.buyerName} 的訂單已完成
            </p>
            <p
              className="text-lg font-bold mb-4"
              style={{ color: "#4CAF50" }}
            >
              已收款 NT$ {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("scanning")}
                className="flex-1 h-10 rounded-xl text-sm font-semibold"
                style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}
              >
                繼續掃下一位
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-sm font-medium"
                style={{ background: "#fff", color: "#888", border: "1px solid #ddd", cursor: "pointer" }}
              >
                關閉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Dev 模式輸入框（相機不可用時的替代方案）
function DevInput({ onResult }: { onResult: (text: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="member_001"
        className="flex-1 h-8 px-2 rounded-lg text-xs outline-none"
        style={{ border: "1px solid #ddd" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onResult(val.trim());
            setVal("");
          }
        }}
      />
      <button
        onClick={() => { if (val.trim()) { onResult(val.trim()); setVal(""); } }}
        className="px-3 h-8 rounded-lg text-xs font-semibold"
        style={{ background: "#7a5c40", color: "#fff", border: "none", cursor: "pointer" }}
      >
        模擬
      </button>
    </div>
  );
}
