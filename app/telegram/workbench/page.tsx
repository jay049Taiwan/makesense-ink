"use client";

import { useState, useEffect } from "react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export default function TelegramWorkbenchPage() {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized" | "unbound">("loading");
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.initData) {
      setStatus("unauthorized");
      setError("請從 Telegram 開啟此頁面");
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor("#2D5A3F");
    tg.setBackgroundColor("#f8f7f4");

    const tgUser = tg.initDataUnsafe?.user as TelegramUser | undefined;
    if (!tgUser?.id) {
      setStatus("unauthorized");
      setError("無法取得 Telegram 用戶資訊");
      return;
    }

    setUser(tgUser);

    // 驗證身份 + 確認 staff 角色
    fetch("/api/telegram/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authorized && data.role === "staff") {
          setStatus("authorized");
        } else if (data.authorized) {
          setStatus("unbound");
          setError("你的帳號不是工作團隊角色");
        } else {
          setStatus("unbound");
          setError(data.message || "帳號尚未綁定");
        }
      })
      .catch(() => {
        setStatus("unauthorized");
        setError("驗證失敗，請稍後再試");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: "#999" }}>驗證身份中...</p>
      </div>
    );
  }

  if (status === "unauthorized" || status === "unbound") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <span className="text-4xl mb-4">🔒</span>
        <p className="text-base font-semibold mb-2" style={{ color: "#333" }}>{error}</p>
        {status === "unbound" && (
          <p className="text-xs" style={{ color: "#999" }}>
            請先到官網 makesense.ink 的會員中心綁定 Telegram 帳號
          </p>
        )}
      </div>
    );
  }

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}` : "員工";

  return (
    <div className="px-2 py-4">
      <WorkbenchShell
        displayName={displayName}
        email={user?.username ? `@${user.username}` : "—"}
      />
    </div>
  );
}
