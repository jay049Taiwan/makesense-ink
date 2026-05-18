"use client";
import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";

/**
 * Cookie 同意橫幅
 *
 * 使用 Google Analytics Consent Mode v2：
 * - 預設 analytics_storage = denied（在 layout.tsx 的 ga-consent-default script 設定）
 * - 使用者按「接受」→ gtag consent update → GA 開始追蹤
 * - 使用者按「僅必要」→ GA 仍載入但不記錄使用者行為（匿名流量模型）
 * - 選擇存入 localStorage，下次造訪自動套用
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    } else if (consent === "accepted") {
      grantAnalytics();
    }
  }, []);

  function grantAnalytics() {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  }

  function handleAccept() {
    localStorage.setItem("cookie_consent", "accepted");
    grantAnalytics();
    setShow(false);
  }

  function handleDecline() {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "#faf8f5",
        borderTop: "1px solid #e8e0d4",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      <div
        className="mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        style={{ maxWidth: 1200 }}
      >
        <p className="text-sm flex-1 leading-relaxed" style={{ color: "#4a3f35" }}>
          我們使用 Google Analytics 分析訪客流量，以改善網站體驗。必要 Cookie（登入、購物車）不受此影響。
          {" "}
          <Link
            href="/terms"
            className="underline"
            style={{ color: "#7a5c40" }}
          >
            隱私政策
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm rounded border transition-colors hover:bg-[#f0ebe3]"
            style={{
              borderColor: "#c8b89a",
              color: "#7a6248",
              background: "transparent",
            }}
          >
            僅必要 Cookie
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm rounded transition-colors text-white hover:opacity-90"
            style={{ background: "#7a5c40" }}
          >
            接受並繼續
          </button>
        </div>
      </div>
    </div>
  );
}
