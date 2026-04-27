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
            fps: 24, // 提高每秒解碼次數
            // qrbox：寬一點、矮一點，給 EAN-13 條碼留橫向空間
            qrbox: (viewW: number, viewH: number) => {
              const w = Math.min(Math.floor(viewW * 0.9), 360);
              const h = Math.floor(w * 0.5);
              return { width: w, height: h };
            },
            // 移除 aspectRatio: 1.0 — 強制 1:1 會裁掉 EAN-13 條碼長度
            formatsToSupport: [
              0,  // QR_CODE
              3,  // CODE_39
              5,  // CODE_128
              8,  // ITF
              9,  // EAN_13 ← 書籍條碼
              10, // EAN_8
              14, // UPC_A
              15, // UPC_E
            ],
            // 啟用 iOS / Chrome 原生 BarcodeDetector，
            // 比 JS-based ZXing 快很多、EAN-13 辨識準
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          (errMsg: string) => {
            // 開發 debug：每幀解碼失敗也記下來，看是否真的有在嘗試解碼
            if (process.env.NODE_ENV === "development") console.debug("[Scan]", errMsg);
          }
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
