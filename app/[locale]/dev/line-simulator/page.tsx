"use client";

import { useState, useRef, useEffect } from "react";
import AskPanel from "./AskPanel";

// ═══ 顏色（完全保留原設計）═══
const C = {
  bg: "#7B9B8A", chatBg: "#8BA99A", bubble: "#fff", bubbleOut: "#A8D8A8",
  text: "#1a1a1a", textSec: "#666", green: "#06C755", headerBg: "#fff",
  border: "#e0e0e0", accent: "#4A7C59", gold: "#DAA520",
};

// ═══ Rich Menu 按鈕定義（不可更改）═══
const MENU_BUTTONS = [
  { id: "books", icon: "📚", label: "選書選物", desc: "瀏覽·掃碼·加入購物車", path: "/bookstore" },
  { id: "events", icon: "🎪", label: "近期活動", desc: "活動報名·行程查詢", path: "/cultureclub" },
  { id: "explore", icon: "🗺️", label: "觀點漫遊", desc: "探索宜蘭·文化地圖", path: "/viewpoint-stroll" },
  { id: "checkout", icon: "🛒", label: "確認結帳", desc: "查看購物車·付款", path: "/checkout", highlight: true },
  { id: "member", icon: "👤", label: "會員中心", desc: "消費紀錄·帳戶管理", path: "/dashboard" },
  { id: "ask", icon: "💬", label: "問問我們", desc: "AI智慧客服·多語言", path: null },
];

// ═══ 來源切換器選項 ═══
const SOURCE_OPTIONS = [
  { label: "LINE LIFF", params: "liff_mode=true" },
  { label: "Google 地圖", params: "utm_source=google_maps" },
  { label: "Facebook", params: "utm_source=facebook" },
  { label: "QR Code", params: "utm_source=qr&utm_medium=bookshelf" },
  { label: "官網正常", params: "" },
];

export default function LineSimulatorPage() {
  const [activePage, setActivePage] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [source, setSource] = useState("liff_mode=true");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 監聽 iframe 的 postMessage（購物車更新）
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "CART_UPDATE") {
        setCartCount(e.data.count || 0);
        setCartTotal(e.data.total || 0);
        if (e.data.action === "added") {
          showToast(`✅ 已加入購物車`);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const openPage = (btn: typeof MENU_BUTTONS[0]) => {
    if (btn.id === "ask") {
      setActivePage("ask");
    } else if (btn.path) {
      setActivePage(btn.id);
    }
  };

  const closeLiff = () => setActivePage(null);

  const getIframeSrc = (path: string) => {
    const sep = path.includes("?") ? "&" : "?";
    return source ? `${path}${sep}${source}` : path;
  };

  const activeBtn = MENU_BUTTONS.find((b) => b.id === activePage);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* 來源切換器 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 13, color: "#666" }}>模擬來源：</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 }}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.params}>{opt.label}</option>
          ))}
        </select>
        {cartCount > 0 && (
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginLeft: 8 }}>
            🛒 {cartCount} 件 / NT${cartTotal}
          </span>
        )}
      </div>

      {/* iPhone 外框 */}
      <div
        style={{
          width: 390, maxHeight: 760, height: "85vh",
          background: C.chatBg, borderRadius: 20, overflow: "hidden",
          display: "flex", flexDirection: "column", position: "relative",
          fontFamily: '-apple-system, "Noto Sans TC", sans-serif',
          boxShadow: "0 4px 30px rgba(0,0,0,0.15)",
        }}
      >
        {/* LINE Header */}
        <div style={{ padding: "10px 16px", background: C.headerBg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 16, color: "#333" }}>←</span>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>旅人</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>旅人書店</div>
            <div style={{ fontSize: 11, color: "#999" }}>官方帳號</div>
          </div>
          <span style={{ color: "#999" }}>☰</span>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>今天</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>旅人</div>
            <div style={{ background: C.bubble, borderRadius: "4px 16px 16px 16px", padding: "10px 14px", maxWidth: "80%", fontSize: 14, lineHeight: 1.7, color: C.text }}>
              歡迎來到旅人書店！👋<br />點選下方選單開始探索 ↓
            </div>
          </div>
          {cartCount > 0 && (
            <div style={{ textAlign: "center", margin: "10px 0" }}>
              <span style={{ background: "rgba(255,255,255,0.7)", padding: "4px 12px", borderRadius: 12, fontSize: 12, color: C.accent, fontWeight: 600 }}>
                🛒 購物車有 {cartCount} 件商品
              </span>
            </div>
          )}
        </div>

        {/* Rich Menu */}
        <div style={{ background: "#f5f3ee", borderTop: "1px solid #e0ded8", flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, padding: 2 }}>
            {MENU_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => openPage(btn)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 4, padding: "16px 8px", background: "#fff", border: "none", cursor: "pointer",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: btn.highlight
                      ? "linear-gradient(135deg, #c8941e, #e0ad3a)"
                      : "linear-gradient(135deg, #3d6b4e, #5a8f6a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {btn.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{btn.label}</div>
                <div style={{ fontSize: 10, color: "#999" }}>{btn.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* LIFF Overlay */}
        {activePage && (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 20, background: "#f8f7f4",
              display: "flex", flexDirection: "column",
              animation: "slideUp 0.25s ease-out",
            }}
          >
            {/* LIFF Header */}
            <div
              style={{
                padding: "10px 16px", background: C.accent, display: "flex", alignItems: "center",
                justifyContent: "space-between", flexShrink: 0,
              }}
            >
              <button onClick={closeLiff} style={{ background: "none", border: "none", color: "#fff", fontSize: 14, cursor: "pointer" }}>
                ✕ 關閉
              </button>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                {activeBtn?.label || "問問我們"}
              </span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>makesense.ink</span>
            </div>

            {/* LIFF Content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {activePage === "ask" ? (
                <AskPanel />
              ) : activeBtn?.path ? (
                <iframe
                  ref={iframeRef}
                  src={getIframeSrc(activeBtn.path)}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title={activeBtn.label}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "absolute", bottom: 200, left: "50%", transform: "translateX(-50%)",
              background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: 20,
              fontSize: 14, fontWeight: 600, zIndex: 30, whiteSpace: "nowrap",
            }}
          >
            {toast}
          </div>
        )}

        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          * { -webkit-tap-highlight-color: transparent; }
        `}</style>
      </div>
    </div>
  );
}
