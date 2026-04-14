"use client";

import { useState, useRef, useEffect } from "react";

const C = { accent: "#4A7C59", text: "#1a1a1a" };

/**
 * 問問我們 — AI 客服面板（接 Claude Haiku 真實 API）
 */
export default function AskPanel() {
  const [msgs, setMsgs] = useState([
    {
      from: "bot",
      text: "👋 你好！我是旅人書店的 AI 助手小旅。\n\n你可以用任何語言問我關於書店、活動、宜蘭文化的問題！\n\n例如：\n• 有沒有關於宜蘭歷史的書？\n• 下週有什麼活動？\n• Type in English for English reply",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMsgs((prev) => [...prev, { from: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/line/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMsgs((prev) => [...prev, { from: "bot", text: data.reply || "抱歉，系統暫時無法回應 😊" }]);
    } catch {
      setMsgs((prev) => [...prev, { from: "bot", text: "抱歉，連線失敗，請稍後再試 😊" }]);
    }

    setLoading(false);
  };

  return (
    <div style={{ background: "#f8f7f4", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "bot" ? "flex-start" : "flex-end", marginBottom: 10 }}>
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-line",
                background: m.from === "bot" ? "#fff" : C.accent,
                color: m.from === "bot" ? C.text : "#fff",
                border: m.from === "bot" ? "1px solid #e8e6e1" : "none",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div style={{ padding: "10px 14px", borderRadius: 14, fontSize: 14, background: "#fff", border: "1px solid #e8e6e1", color: "#999" }}>
              小旅正在想...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "8px 14px 12px", display: "flex", gap: 8, background: "#fff", borderTop: "1px solid #e8e6e1" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="輸入問題（中/英/日/韓皆可）"
          disabled={loading}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #e0ded8", fontSize: 14, outline: "none", opacity: loading ? 0.6 : 1 }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: loading ? "#ccc" : C.accent, color: "#fff", fontSize: 16, cursor: loading ? "default" : "pointer" }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
