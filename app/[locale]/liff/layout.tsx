/**
 * LIFF 專用 Layout — 極簡，無 Header/Footer（由 LayoutShell 處理）
 * 所有 /liff/* 頁面共用
 */
export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
