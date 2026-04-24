"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

/**
 * 條碼/QR Code 掃描元件
 * 使用 html5-qrcode 套件
 */
export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let scanner: any = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // 動態計算：qrbox 設成容器較短邊的 70%，保證 ROI 遮罩貼合容器
            // 且在手機直立畫面也可以容納 EAN-13 條碼的完整寬度
            qrbox: (viewW: number, viewH: number) => {
              const side = Math.floor(Math.min(viewW, viewH) * 0.7);
              // 橫長條更好掃 EAN-13：寬 = side，高 = side * 0.5
              return { width: side, height: Math.floor(side * 0.5) };
            },
            aspectRatio: 1.0,
            formatsToSupport: [
              0,  // QR_CODE
              2,  // EAN_13
              3,  // EAN_8
              4,  // CODE_128
              7,  // CODE_39
              10, // UPC_A
              11, // UPC_E
            ],
          },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {} // ignore scan failures
        );
      } catch (err: any) {
        setError("無法開啟相機，請手動輸入條碼");
      }
    })();

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#000" }}>
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.8)" }}>
        <h2 className="text-white text-sm font-medium">掃描條碼 / QR Code</h2>
        <button onClick={onClose} className="text-white/80 text-sm px-3 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
          關閉
        </button>
      </div>

      {/* 掃描區域：讓 html5-qrcode 自己填滿空間，不用 max-w-sm 壓縮 */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div id="barcode-reader" style={{ width: "100%", height: "100%" }} />

        {!error && (
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs pointer-events-none">
            將條碼或 QR Code 對準框內
          </p>
        )}
      </div>

      {/* 手動輸入 */}
      <div className="px-4 py-4" style={{ background: "rgba(0,0,0,0.8)" }}>
        {error && (
          <p className="text-xs text-center mb-3" style={{ color: "#ff6b6b" }}>{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            placeholder="手動輸入條碼..."
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
          />
          <button
            onClick={handleManualSubmit}
            className="px-5 py-3 rounded-xl text-sm font-medium"
            style={{ background: "#7a5c40", color: "#fff" }}
          >
            查詢
          </button>
        </div>
      </div>
    </div>
  );
}
