"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";

/**
 * LIFF 模式右下角浮動購物車
 * - 只在 /liff/* 路徑 或 ?liff_mode=true 顯示
 * - 在 /liff/member（購物清單頁）和 /checkout 上隱藏（避免重複）
 * - 加入商品時 badge 數字變動、按鈕脈衝一次
 */
export default function FloatingCart() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { totalItems } = useCart();
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(totalItems);

  const isLiffMode = searchParams.get("liff_mode") === "true";
  const isLiffPath = pathname.startsWith("/liff") || /\/[a-z]{2}\/liff/.test(pathname);
  const isMemberPage = /\/liff\/member/.test(pathname);
  const isCheckoutPage = /\/checkout/.test(pathname);

  useEffect(() => {
    if (totalItems > prevCount.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      prevCount.current = totalItems;
      return () => clearTimeout(t);
    }
    prevCount.current = totalItems;
  }, [totalItems]);

  if (!(isLiffPath || isLiffMode)) return null;
  if (isMemberPage || isCheckoutPage) return null;

  const href = "/liff/member";

  return (
    <>
      <a
        href={href}
        aria-label={`購物車（${totalItems} 件）`}
        className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
        style={{
          background: "#7a5c40",
          color: "#fff",
          animation: pulse ? "fc-pulse 0.6s ease-out" : undefined,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {totalItems > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{
              background: "#e8935a",
              color: "#fff",
              border: "2px solid #faf8f4",
              animation: pulse ? "fc-bump 0.6s ease-out" : undefined,
            }}
          >
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </a>

      <style>{`
        @keyframes fc-pulse {
          0% { box-shadow: 0 0 0 0 rgba(122, 92, 64, 0.5); }
          50% { box-shadow: 0 0 0 14px rgba(122, 92, 64, 0); }
          100% { box-shadow: 0 0 0 0 rgba(122, 92, 64, 0); }
        }
        @keyframes fc-bump {
          0% { transform: scale(1); }
          40% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
