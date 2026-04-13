import Script from "next/script";

/**
 * Telegram Mini App layout — 無 Header / Footer
 * 主 layout 會偵測 /telegram 路徑，自動隱藏 Header/Footer
 * 這裡只負責載入 Telegram SDK
 */
export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
