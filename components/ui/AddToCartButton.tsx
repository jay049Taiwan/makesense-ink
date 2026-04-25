"use client";

import { useState } from "react";
import { useCart, type CartItemType } from "@/components/providers/CartProvider";

interface Props {
  productId: string;
  notionId?: string | null;
  name: string;
  price: number;
  subCategory?: string | null;
  stock?: number | null;
  type?: CartItemType;
  variant?: "card" | "inline" | "outlined";
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export default function AddToCartButton({
  productId,
  notionId,
  name,
  price,
  subCategory,
  stock,
  type = "商品",
  variant = "card",
  size = "sm",
  fullWidth = true,
}: Props) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState<"idle" | "added">("idle");

  const outOfStock = typeof stock === "number" && stock <= 0;

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      id: notionId || productId,
      name,
      type,
      price,
      productId: notionId || productId,
      subCategory: subCategory || undefined,
    });
    setAdding("added");
    setTimeout(() => setAdding("idle"), 1400);
  }

  const padY = size === "sm" ? 7 : 10;
  const padX = size === "sm" ? 10 : 14;
  const fontSize = size === "sm" ? 12 : 13;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: `${padY}px ${padX}px`,
    fontSize,
    fontWeight: 500,
    cursor: outOfStock ? "not-allowed" : "pointer",
    transition: "background 180ms, transform 120ms",
    border: variant === "outlined" ? "1px solid var(--color-teal, #4ECDC4)" : "none",
    borderRadius: 6,
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap",
  };

  if (outOfStock) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{
          ...baseStyle,
          background: "rgba(122,92,64,0.08)",
          color: "var(--color-mist, #b89e7a)",
        }}
      >
        無庫存
      </button>
    );
  }

  if (adding === "added") {
    return (
      <button
        type="button"
        style={{
          ...baseStyle,
          background: "rgba(78,205,196,0.18)",
          color: "var(--color-teal, #2da89e)",
        }}
      >
        ✓ 已加入
      </button>
    );
  }

  if (variant === "outlined") {
    return (
      <button type="button" onClick={handle} style={{
        ...baseStyle,
        background: "#fff",
        color: "var(--color-teal, #4ECDC4)",
      }}>
        + 加入購物車
      </button>
    );
  }

  return (
    <button type="button" onClick={handle} style={{
      ...baseStyle,
      background: "var(--color-teal, #4ECDC4)",
      color: "#fff",
    }}>
      + 加入購物車
    </button>
  );
}
