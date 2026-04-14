"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initLiff, getLiffAccessToken, getLiffProfile, isInLineClient, liffLogin } from "@/lib/liff";

interface LiffUser {
  memberId?: string;
  name?: string;
  email?: string;
  role?: string;
  lineProfile?: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
}

interface LiffContextValue {
  isLiffMode: boolean;
  isLiffReady: boolean;
  liffUser: LiffUser | null;
  /** 是否需要綁定（LINE 帳號未關聯會員） */
  needsBind: boolean;
}

const LiffContext = createContext<LiffContextValue>({
  isLiffMode: false,
  isLiffReady: false,
  liffUser: null,
  needsBind: false,
});

export function useLiff() {
  return useContext(LiffContext);
}

export default function LiffProvider({ children }: { children: ReactNode }) {
  const [isLiffMode, setIsLiffMode] = useState(false);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffUser, setLiffUser] = useState<LiffUser | null>(null);
  const [needsBind, setNeedsBind] = useState(false);

  useEffect(() => {
    // 偵測 LIFF 模式：URL 帶 liff_mode=true 或在 LINE 客戶端內
    const params = new URLSearchParams(window.location.search);
    const liffMode = params.get("liff_mode") === "true";

    if (!liffMode) {
      // 不是 LIFF 模式，不初始化
      return;
    }

    setIsLiffMode(true);

    (async () => {
      try {
        const ok = await initLiff();
        if (!ok) return;

        // 在 LINE 客戶端內自動登入
        if (isInLineClient()) {
          const token = getLiffAccessToken();
          if (!token) {
            liffLogin();
            return;
          }

          // 用 access token 驗證身份
          const res = await fetch("/api/liff/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: token }),
          });
          const data = await res.json();

          if (data.authorized) {
            setLiffUser({
              memberId: data.memberId,
              name: data.name,
              email: data.email,
              role: data.role,
              lineProfile: data.lineProfile,
            });
          } else if (data.needsBind) {
            setNeedsBind(true);
            setLiffUser({ lineProfile: data.lineProfile });
          }
        } else {
          // 外部瀏覽器帶 liff_mode=true（例如模擬器），嘗試取得 profile
          const profile = await getLiffProfile();
          if (profile) {
            const token = getLiffAccessToken();
            if (token) {
              const res = await fetch("/api/liff/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: token }),
              });
              const data = await res.json();
              if (data.authorized) {
                setLiffUser({
                  memberId: data.memberId,
                  name: data.name,
                  email: data.email,
                  role: data.role,
                  lineProfile: data.lineProfile,
                });
              }
            }
          }
        }

        setIsLiffReady(true);
      } catch (err) {
        console.error("LiffProvider init error:", err);
        setIsLiffReady(true); // 即使失敗也標記 ready，不阻擋渲染
      }
    })();
  }, []);

  return (
    <LiffContext.Provider value={{ isLiffMode, isLiffReady, liffUser, needsBind }}>
      {children}
    </LiffContext.Provider>
  );
}
