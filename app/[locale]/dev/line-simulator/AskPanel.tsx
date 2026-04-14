"use client";

import { useState } from "react";

const C = { accent: "#4A7C59", text: "#1a1a1a" };

/**
 * 問問我們 — AI 客服面板（暫用模擬回覆，之後接真實 API）
 * 從 line-richmenu-simulator.jsx 移植
 */
export default function AskPanel() {
  const [msgs, setMsgs] = useState([
    {
      from: "bot",
      text: "👋 你好！我是旅人書店的 AI 助手。\n\n你可以用任何語言問我關於書店、活動、宜蘭文化的問題！\n\n例如：\n• 有沒有關於宜蘭歷史的書？\n• 下週有什麼活動？\n• Type in English for English reply",
    },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    setMsgs((prev) => [...prev, { from: "user", text: q }]);
    setTimeout(() => {
      let reply = "";
      const qLower = q.toLowerCase();
      if (q.includes("宜蘭") || q.includes("歷史"))
        reply = "推薦你《走讀宜蘭》（NT$480），詳細介紹了宜蘭的歷史變遷。\n\n可以到「選書選物」看看！";
      else if (q.includes("活動") || q.includes("下週"))
        reply = "可以點下方「近期活動」查看最新可報名的活動喔！";
      else if (/[a-zA-Z]{3,}/.test(q))
        reply = "Welcome to Traveler's Bookstore! 😊\n\nWe're in Yilan, Taiwan. Check out our curated books and local events!\n\nTap the menu buttons below to explore.";
      else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(q))
        reply = "いらっしゃいませ！😊\n\n宜蘭の「旅人書店」です。下のメニューから探索できます！";
      else if (/[\uAC00-\uD7AF]/.test(q))
        reply = "안녕하세요! 😊\n\n이란의 \"여행자 서점\"입니다. 아래 메뉴를 확인해 보세요!";
      else
        reply = "收到！你可以試試問我：\n• 有沒有關於宜蘭的書？\n• 下週有什麼活動？\n• Type in English / 日本語 / 한국어";
      setMsgs((prev) => [...prev, { from: "bot", text: reply }]);
    }, 800);
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
      </div>
      <div style={{ padding: "8px 14px 12px", display: "flex", gap: 8, background: "#fff", borderTop: "1px solid #e8e6e1" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="輸入問題（中/英/日/韓皆可）"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #e0ded8", fontSize: 14, outline: "none" }}
        />
        <button
          onClick={send}
          style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: C.accent, color: "#fff", fontSize: 16, cursor: "pointer" }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
