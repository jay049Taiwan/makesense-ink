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
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
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

      {/* 掃描區域 */}
      <div className="flex-1 flex items-center justify-center relative">
        <div id="barcode-reader" className="w-full max-w-sm" />

        {/* 掃描框提示 */}
        {!error && (
          <p className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-xs">
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
