"use client";

import { useState } from "react";
import { getLiffAccessToken } from "@/lib/liff";
import BarcodeScanner from "@/components/liff/BarcodeScanner";

type CheckinStatus =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "loading" }
  | { kind: "success"; orderId: string }
  | { kind: "already"; orderId: string }
  | { kind: "wrong_vendor" }
  | { kind: "not_found" }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export default function LiffPartnerScanPage() {
  const [status, setStatus] = useState<CheckinStatus>({ kind: "idle" });

  const parseQr = (raw: string): string | null => {
    // 支援格式：純 UUID / order:UUID / JSON {order_id} / 32hex
    if (!raw) return null;
    let s = raw.trim();
    if (s.startsWith("order:")) s = s.slice(6);
    try {
      const j = JSON.parse(s);
      if (j.order_id) s = String(j.order_id);
    } catch {}
    s = s.replace(/-/g, "").toLowerCase();
    if (/^[0-9a-f]{32}$/.test(s)) {
      return s.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(raw)) {
      return raw;
    }
    return null;
  };

  const handleScan = async (raw: string) => {
    const orderId = parseQr(raw);
    if (!orderId) {
      setStatus({ kind: "error", message: "QR Code 格式錯誤" });
      return;
    }
    setStatus({ kind: "loading" });
    const token = getLiffAccessToken();
    if (!token) {
      setStatus({ kind: "error", message: "請從 LINE 開啟此頁面" });
      return;
    }
    try {
      const res = await fetch("/api/liff/partner/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, orderId }),
      });
      const j = await res.json();
      if (j.ok && j.status === "completed") setStatus({ kind: "success", orderId });
      else if (j.status === "already_checked_in") setStatus({ kind: "already", orderId });
      else if (j.status === "wrong_vendor") setStatus({ kind: "wrong_vendor" });
      else if (j.status === "not_found") setStatus({ kind: "not_found" });
      else if (j.status === "cancelled") setStatus({ kind: "cancelled" });
      else setStatus({ kind: "error", message: j.message || "簽到失敗" });
    } catch (e: any) {
      setStatus({ kind: "error", message: e.message });
    }
  };

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <div className="px-4 pt-5 pb-3" style={{ background: "#fff", borderBottom: "1px solid #ece8e1" }}>
        <a href="/liff/partner/dashboard" className="text-xs" style={{ color: "#7a5c40" }}>← 返回概覽</a>
        <h1 className="text-lg font-bold mt-1" style={{ color: "#2d2a26" }}>簽到掃碼</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>顧客出示訂單 QR → 掃描標記已簽到</p>
      </div>

      {/* 狀態結果 */}
      {status.kind !== "idle" && status.kind !== "scanning" && (
        <div className="px-4 mt-4">
          <ResultCard status={status} onRetry={() => setStatus({ kind: "scanning" })} />
        </div>
      )}

      {/* 開啟掃描 CTA */}
      {(status.kind === "idle" ||
        status.kind === "success" ||
        status.kind === "already" ||
        status.kind === "wrong_vendor" ||
        status.kind === "not_found" ||
        status.kind === "cancelled" ||
        status.kind === "error") && (
        <div className="px-4 mt-4">
          <button
            onClick={() => setStatus({ kind: "scanning" })}
            className="w-full py-4 rounded-xl text-base font-semibold"
            style={{ background: "#4ECDC4", color: "#fff" }}
          >
            📷 開啟相機掃碼
          </button>
        </div>
      )}

      {status.kind === "scanning" && (
        <BarcodeScanner onScan={handleScan} onClose={() => setStatus({ kind: "idle" })} />
      )}

      {status.kind === "loading" && (
        <div className="px-4 mt-4 text-center">
          <p className="text-sm" style={{ color: "#999" }}>處理中...</p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ status, onRetry }: { status: CheckinStatus; onRetry: () => void }) {
  const cfg: Record<string, { icon: string; color: string; bg: string; title: string; subtitle: string }> = {
    success: { icon: "✅", color: "#0e9889", bg: "#e6f7f5", title: "簽到完成", subtitle: "顧客已標記為已簽到" },
    already: { icon: "ℹ️", color: "#7a5c40", bg: "#f0ebe4", title: "已經簽過了", subtitle: "此訂單先前已簽到" },
    wrong_vendor: { icon: "⚠️", color: "#c0392b", bg: "#fde0e0", title: "非本攤訂單", subtitle: "此訂單不屬於您的攤位" },
    not_found: { icon: "❓", color: "#c0392b", bg: "#fde0e0", title: "找不到訂單", subtitle: "QR Code 無效或訂單不存在" },
    cancelled: { icon: "❌", color: "#c0392b", bg: "#fde0e0", title: "訂單已取消", subtitle: "此訂單先前已被取消" },
    error: { icon: "⚠️", color: "#c0392b", bg: "#fde0e0", title: "操作失敗", subtitle: (status as any).message || "請重試" },
  };
  const c = cfg[status.kind];
  if (!c) return null;
  return (
    <div className="rounded-xl p-5 text-center" style={{ background: c.bg }}>
      <div className="text-4xl mb-2">{c.icon}</div>
      <p className="text-base font-semibold" style={{ color: c.color }}>{c.title}</p>
      <p className="text-xs mt-1" style={{ color: "#666" }}>{c.subtitle}</p>
      {(status.kind === "success" || status.kind === "already") && (status as any).orderId && (
        <p className="text-[11px] mt-2 font-mono" style={{ color: "#999" }}>
          訂單：{(status as any).orderId.slice(0, 8).toUpperCase()}
        </p>
      )}
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 rounded-lg text-xs font-medium"
        style={{ background: "#fff", color: "#7a5c40", border: "1px solid #ece8e1" }}
      >
        繼續掃下一個
      </button>
    </div>
  );
}
