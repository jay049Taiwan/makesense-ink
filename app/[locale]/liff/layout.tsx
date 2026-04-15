"use client";

import { useEffect, useState } from "react";

/**
 * LIFF 專用 Layout — 只允許從 LINE 內開啟
 * 非 LINE 用戶看到引導加好友頁面
 */
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const params = new URLSearchParams(window.location.search);

    // 允許的條件：LINE in-app browser、有 liff_mode 參數、或開發環境
    const isLine = /Line\//i.test(ua);
    const isLiffMode = params.get("liff_mode") === "true";
    const isDev = window.location.hostname === "localhost";

    setAllowed(isLine || isLiffMode || isDev);
  }, []);

  // 初始載入中
  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#7a5c40] rounded-full animate-spin" />
      </div>
    );
  }

  // 非 LINE 用戶 → 引導加好友
  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6" style={{ background: "#f8f7f4" }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#06C755" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#2d2a26" }}>此頁面僅限 LINE 開啟</h1>
          <p className="text-sm mb-6" style={{ color: "#999" }}>
            加入旅人書店 LINE 官方帳號<br/>即可使用選書選物、活動體驗等功能
          </p>
          <a
            href="https://lin.ee/your-line-oa-link"
            className="inline-block px-8 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "#06C755", color: "#fff" }}
          >
            加入 LINE 好友
          </a>
          <p className="text-xs mt-4" style={{ color: "#ccc" }}>
            或在 LINE 搜尋「旅人書店」
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
