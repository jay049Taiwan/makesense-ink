"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/providers/CartProvider";

/**
 * 全站右下角浮動按鈕（LINE + 購物車）
 * 滑到 footer 時，按 footer 進入視窗的程度往上推，
 * 讓按鈕剛好停在 footer 頂端上方，不會擋到 footer 內容。
 */
export default function FloatingActions() {
  const t = useTranslations("footer");
  const { totalItems } = useCart();
  const [mounted, setMounted] = useState(false);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const footer = document.querySelector("footer");
      if (!footer) return;
      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight;
      // 若 footer 進入 viewport，lift = 重疊量 + 16px 緩衝
      const overlap = Math.max(0, vh - rect.top);
      setLift(overlap > 0 ? overlap + 16 : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const liftStyle = {
    transform: `translateY(-${lift}px)`,
    transition: "transform 0.18s ease-out",
  } as const;

  return (
    <>
      {/* LINE */}
      <a
        href="https://lin.ee/964ervay"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105"
        style={{ bottom: 24, right: 24, width: 56, height: 56, background: "#06C755", ...liftStyle }}
        aria-label={t("lineOA")}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </a>

      {/* Cart */}
      <Link
        href="/checkout"
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105"
        style={{ bottom: 92, right: 24, width: 56, height: 56, background: "#1a1612", ...liftStyle }}
        aria-label="購物車"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {mounted && totalItems > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full text-white font-bold"
            style={{
              top: -2,
              right: -2,
              minWidth: 20,
              height: 20,
              fontSize: 11,
              background: "#e8935a",
              padding: "0 5px",
            }}
          >
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </Link>
    </>
  );
}
