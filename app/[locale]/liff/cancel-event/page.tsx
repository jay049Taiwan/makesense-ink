"use client";

import { useState } from "react";
import { useLiff } from "@/components/providers/LiffProvider";

export default function CancelEventPage() {
  const { liffUser } = useLiff();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 從 URL 取得 orderId 和 eventName
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const orderId = params?.get("orderId") || "";
  const eventName = params?.get("eventName") || "活動";

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/line/event-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: reason.trim(),
          lineUid: liffUser?.lineProfile?.userId || null,
        }),
      });
      setDone(true);
    } catch {
      alert("送出失敗，請稍後再試");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6" style={{ background: "#f8f7f4" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#e8f5e9" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: "#2d2a26" }}>已收到取消申請</h1>
          <p className="text-sm" style={{ color: "#999" }}>我們會儘快處理，感謝您的告知</p>
          <p className="text-xs mt-4" style={{ color: "#ccc" }}>可以關閉此頁面了</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-8" style={{ background: "#f8f7f4" }}>
      <h1 className="text-lg font-bold mb-1" style={{ color: "#2d2a26" }}>取消報名</h1>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        {eventName}
      </p>

      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
        <label className="text-sm font-medium block mb-2" style={{ color: "#2d2a26" }}>
          請簡述取消原因
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例如：臨時有事、時間衝突..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: "#f8f7f4", border: "1px solid #ece8e1", color: "#2d2a26" }}
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || !reason.trim()}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: "#e74c3c", color: "#fff" }}
        >
          {submitting ? "送出中..." : "確認取消報名"}
        </button>

        <p className="text-xs text-center mt-3" style={{ color: "#ccc" }}>
          送出後將由工作人員處理您的取消申請
        </p>
      </div>
    </div>
  );
}
