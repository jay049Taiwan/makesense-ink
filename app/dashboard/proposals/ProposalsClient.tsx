"use client";

import { useState } from "react";
import type { Proposal } from "@/lib/fetch-all";

const statusStyle: Record<string, { bg: string; color: string }> = {
  預計提案: { bg: "#FFF3E0", color: "#C4864A" },
  執行中:   { bg: "rgba(78,205,196,0.12)", color: "#3aa89f" },
  提案通過: { bg: "#F0F5ED", color: "#6B8F5E" },
  未通過:   { bg: "#FDF0F0", color: "#B85C5C" },
  已結案:   { bg: "#f5f0eb", color: "#8C7A6A" },
};

const PROPOSAL_TYPES = ["承攬申請", "活動合作", "商品上架", "品牌曝光", "其他"];

interface Props {
  proposals: Proposal[];
  supplierName: string;
}

export default function ProposalsClient({ proposals: initial, supplierName }: Props) {
  const [proposals, setProposals] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  async function handleSubmit() {
    if (!title.trim()) { setMsg({ type: "err", text: "請輸入提案名稱" }); return; }
    setSubmitting(true);
    setMsg(null);

    const res = await fetch("/api/vendor/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), type, content, fileUrl }),
    });
    const data = await res.json();

    if (res.ok && data.id) {
      setMsg({ type: "ok", text: "✅ 提案已送出！" });
      setProposals([
        { id: data.id, title: title.trim(), status: "預計提案", type, created: new Date().toISOString().substring(0, 10) },
        ...proposals,
      ]);
      setTimeout(() => {
        setShowForm(false);
        setTitle(""); setType(""); setContent(""); setFileUrl("");
        setMsg(null);
      }, 1200);
    } else {
      setMsg({ type: "err", text: data.error || "送出失敗，請稍後再試" });
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>合作提案</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--color-bark)" }}
          >
            + 新增提案
          </button>
        )}
      </div>

      <p className="text-xs mb-5" style={{ color: "var(--color-mist)" }}>
        from Notion DB01・{proposals.length} 筆
      </p>

      {/* 新增提案表單 */}
      {showForm && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "#FDF8F3", border: "1px solid #E8D5C0" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-ink)" }}>新增提案</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-mist)" }}>提案名稱 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：2026 夏季聯名活動提案"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid #ddd", outline: "none" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-mist)" }}>提案類型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }}
              >
                <option value="">請選擇</option>
                {PROPOSAL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-mist)" }}>說明內容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="簡述提案內容、合作方式、預期目標…"
                className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                style={{ border: "1px solid #ddd", outline: "none" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-mist)" }}>附件連結（Google Drive / Dropbox 等）</label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid #ddd", outline: "none" }}
              />
            </div>
          </div>

          {msg && (
            <p className="mt-3 text-sm" style={{ color: msg.type === "ok" ? "#6B8F5E" : "#B85C5C" }}>
              {msg.text}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setMsg(null); }}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: "1px solid #ddd", color: "var(--color-bark)" }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: submitting ? "#aaa" : "var(--color-bark)" }}
            >
              {submitting ? "送出中…" : "送出提案"}
            </button>
          </div>
        </div>
      )}

      {/* 提案清單 */}
      {proposals.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p style={{ color: "var(--color-mist)" }}>尚無提案紀錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const st = statusStyle[p.status] || statusStyle["預計提案"];
            return (
              <div key={p.id} className="rounded-lg p-4 flex items-center justify-between"
                style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
                <div>
                  <h3 className="text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>{p.title}</h3>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                      {p.status || "—"}
                    </span>
                    {p.type && (
                      <span className="px-2 py-0.5 rounded-full" style={{ background: "#f5f0eb", color: "#7a5c40" }}>
                        {p.type}
                      </span>
                    )}
                    <span style={{ color: "var(--color-mist)" }}>{p.created}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
