import Script from "next/script";
import type { Viewport } from "next";
import "../globals.css";

/**
 * Telegram Mini App layout — 獨立 HTML shell，無 Header/Footer
 * 不走 i18n（內部工具）
 *
 * viewport 必須對齊裝置寬度，否則 iOS WebView 預設用 980px 桌面寬度渲染
 * 然後縮放適配，造成初次載入時內容看起來過寬。
 * Telegram 建議禁用使用者縮放，避免與 Bot 手勢衝突。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
