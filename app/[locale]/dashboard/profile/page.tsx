"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  role: string;
  lineUid: string;
  notifyLine: boolean;
  notifyEmail: boolean;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyLine, setNotifyLine] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data: any) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data);
          setName(data.name || "");
          setPhone(data.phone || "");
          setNotifyLine(data.notifyLine ?? true);
          setNotifyEmail(data.notifyEmail ?? true);
        }
      })
      .catch(() => setError("讀取資料失敗"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notifyLine, notifyEmail }),
      });
      const data = await res.json() as any;
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "儲存失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-semibold text-brand-brown mb-6">個人資料</h2>
        <p className="text-muted text-sm">載入中...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-semibold text-brand-brown mb-6">個人資料</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const email = profile?.email || session?.user?.email || "";
  const roleLabel: Record<string, string> = {
    staff: "工作團隊",
    vendor: "合作單位",
    member: "一般會員",
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold text-brand-brown mb-6">個人資料</h2>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            電子信箱
          </label>
          <input
            type="email"
            disabled
            value={email}
            className="w-full h-10 px-3 rounded-lg border border-border bg-brand-cream text-muted text-sm"
          />
          <p className="text-xs text-muted mt-1">信箱不可修改</p>
        </div>

        {profile?.role && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              會員類型
            </label>
            <input
              type="text"
              disabled
              value={roleLabel[profile.role] || profile.role}
              className="w-full h-10 px-3 rounded-lg border border-border bg-brand-cream text-muted text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            顯示名稱
          </label>
          <input
            type="text"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="你的名稱"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            電話號碼
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e: any) => setPhone(e.target.value)}
            placeholder="0912-345-678"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
          />
        </div>

        <fieldset className="border border-border rounded-lg p-4">
          <legend className="text-sm font-medium text-foreground px-2">
            通知偏好
          </legend>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notifyLine}
                onChange={(e: any) => setNotifyLine(e.target.checked)}
                className="rounded border-border text-brand-teal focus:ring-brand-teal"
              />
              LINE 官方帳號通知
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e: any) => setNotifyEmail(e.target.checked)}
                className="rounded border-border text-brand-teal focus:ring-brand-teal"
              />
              Email 通知
            </label>
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-lg bg-brand-brown text-white text-sm font-medium hover:bg-brand-brown/90 transition-colors disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存變更"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">已儲存</span>
          )}
        </div>
      </form>
    </div>
  );
}
