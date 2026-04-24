"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "./Header";
import Footer from "./Footer";
import FloatingCart from "./FloatingCart";

function LayoutShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiffMode = searchParams.get("liff_mode") === "true";
  // 會員中心即使在 LIFF 模式也保留 header/footer，讓用戶能跳去其他頁面
  const isDashboard = /\/dashboard(\/|$)/.test(pathname);
  const isNoChrome =
    pathname.startsWith("/telegram") ||
    pathname.startsWith("/buy") ||
    pathname.startsWith("/dev/") ||
    pathname.startsWith("/liff") ||
    (isLiffMode && !isDashboard);

  if (isNoChrome) {
    return (
      <>
        <main style={{ background: "#f8f7f4", minHeight: "100vh" }}>{children}</main>
        <FloatingCart />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

/**
 * 根據路徑和參數決定是否顯示 Header/Footer
 * - /telegram/* /buy/* /dev/* 路徑不顯示
 * - ?liff_mode=true 參數不顯示（LINE LIFF 模式）
 */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="flex-1">{children}</main>}>
      <LayoutShellInner>{children}</LayoutShellInner>
    </Suspense>
  );
}
