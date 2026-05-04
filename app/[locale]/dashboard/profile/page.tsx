"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useDevRole } from "@/components/providers/DevRoleProvider";

export default function ProfilePage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lineConnected, setLineConnected] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isDev) {
      setEmail(devRole.email || "dev@example.com");
      setPhone(devRole.phone || "");
      setLineConnected(devRole.lineConnected || false);
      return;
    }
    fetch("/api/user/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && !d.error) {
          setEmail(d.email || "");
          setPhone(d.phone || "");
          setLineConnected(!!d.lineUid);
        }
      })
      .catch(() => {});
  }, [isDev, devRole.email, devRole.phone, devRole.lineConnected]);

  const handlePhoneSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDraft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPhone(phoneDraft.trim());
        setEditing(false);
        setMsg({ type: "success", text: "電話號碼已更新" });
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: "error", text: data.error || "儲存失敗" });
      }
    } catch {
      setMsg({ type: "error", text: "網路錯誤，請稍後再試" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Back nav */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-teal)" }}>
          ← 回會員中心
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          — MY PROFILE —
        </p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          個人資料
        </h1>
      </div>

      {/* Toast */}
      {msg && (
        <div className="rounded-lg px-4 py-2 mb-4 text-sm"
          style={{ background: msg.type === "success" ? "#d1f5e0" : "#fde2e2", color: msg.type === "success" ? "#0f5132" : "#842029" }}>
          {msg.text}
        </div>
      )}

      {/* Fields */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>

        {/* Email（唯讀）*/}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--color-dust)" }}>
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--color-mist)" }}>登入信箱</p>
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{email || "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-mist)" }}>透過 Google 帳號登入</p>
          </div>
          <button
            onClick={() => {
              if (!confirm("是否要用另一個 Google 帳號重新綁定？")) return;
              signIn("google", { callbackUrl: "/dashboard/profile" });
            }}
            className="text-xs px-3 py-1.5 rounded-md flex-shrink-0"
            style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", color: "var(--color-bark)", cursor: "pointer" }}>
            重新綁定
          </button>
        </div>

        {/* LINE */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--color-dust)" }}>
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--color-mist)" }}>LINE 帳號</p>
            <p className="text-sm font-medium" style={{ color: lineConnected ? "#06C755" : "var(--color-mist)" }}>
              {lineConnected ? "✓ 已綁定" : "尚未綁定"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-mist)" }}>
              {lineConnected ? "可透過 LINE 接收活動通知" : "綁定後可用 LINE 接收通知"}
            </p>
          </div>
          <button
            onClick={() => {
              if (lineConnected && !confirm("是否要重新綁定 LINE 帳號？")) return;
              window.location.href = "/api/user/link-line/start";
            }}
            className="text-xs px-3 py-1.5 rounded-md flex-shrink-0"
            style={{
              background: lineConnected ? "#e8f9ee" : "var(--color-warm-white)",
              border: `1px solid ${lineConnected ? "#06C755" : "var(--color-dust)"}`,
              color: lineConnected ? "#06C755" : "var(--color-bark)",
              cursor: "pointer",
            }}>
            {lineConnected ? "重新綁定" : "綁定 LINE"}
          </button>
        </div>

        {/* 電話 */}
        <div className="px-6 py-5">
          <p className="text-xs mb-1" style={{ color: "var(--color-mist)" }}>聯繫電話</p>
          {editing ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="tel"
                value={phoneDraft}
                autoFocus
                onChange={e => setPhoneDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handlePhoneSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="0912-345-678"
                className="text-sm px-3 py-2 rounded-md flex-1"
                style={{ border: "1px solid var(--color-teal)", outline: "none" }}
              />
              <button
                onClick={handlePhoneSave}
                disabled={saving}
                className="text-xs px-4 py-2 rounded-md text-white flex-shrink-0"
                style={{ background: "var(--color-teal)", border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "儲存中…" : "儲存"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-3 py-2 rounded-md flex-shrink-0"
                style={{ background: "none", border: "1px solid var(--color-dust)", cursor: "pointer", color: "var(--color-bark)" }}>
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-medium" style={{ color: phone ? "var(--color-ink)" : "var(--color-mist)" }}>
                {phone || "尚未設定"}
              </p>
              <button
                onClick={() => { setPhoneDraft(phone || ""); setEditing(true); }}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", color: "var(--color-bark)", cursor: "pointer" }}>
                {phone ? "修改" : "新增"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
