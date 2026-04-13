"use client";

import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";

export default function CartBadge() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/checkout"
      className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
      style={{ bottom: 92, right: 24, width: 56, height: 56, background: "#1a1612" }}
      aria-label="購物車"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {totalItems > 0 && (
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
  );
}
