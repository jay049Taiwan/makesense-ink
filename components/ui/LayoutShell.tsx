"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

/**
 * 根據路徑決定是否顯示 Header/Footer
 * /telegram/* 路徑不顯示
 */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNoChrome = pathname.startsWith("/telegram") || pathname.startsWith("/buy");

  if (isNoChrome) {
    return <main style={{ background: "#f8f7f4", minHeight: "100vh" }}>{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
