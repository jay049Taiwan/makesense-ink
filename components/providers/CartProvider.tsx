"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { sendGAEvent } from "@/lib/tracking";

/* ═══════════════════════════════════════════
   購物車項目型別
   ═══════════════════════════════════════════ */
export type CartItemType = "走讀" | "講座" | "市集" | "空間" | "諮詢" | "預購" | "商品";

export interface CartItem {
  id: string;           // 唯一 key（商品 ID 或活動 ID + 票種）
  name: string;         // 顯示名稱
  subtitle?: string;    // 副標（如票種、規格）
  type: CartItemType;   // 項目類型
  price: number;        // 單價
  qty: number;          // 數量
  eventId?: string;     // 對應活動 ID（活動票券用）
  productId?: string;   // 對應商品 ID（商品用）
  subCategory?: string; // 商品分類（選書/選物/數位）— 判斷是否需要實體物流
  meta?: Record<string, string>; // 額外資訊（日期、場次等）
  registration?: Record<string, string>; // 報名表單資訊（票券用，單人）
  registrations?: Record<string, string>[]; // N 人報名時每人一份
  contact?: { name: string; phone: string; email: string }; // 從報名視窗帶入的聯絡資訊
}

/* ═══════════════════════════════════════════
   Context 介面
   ═══════════════════════════════════════════ */
interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/* ═══════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════ */
const STORAGE_KEY = "makesense_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  // 初始值一律空陣列（避免 SSR 與 client hydration 不一致）
  // 實際購物車 items 在 useEffect 掛載後才從 localStorage 載入
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 掛載後從 localStorage 載入
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  // 持久化到 localStorage（等 hydrated 後才寫，避免用 [] 蓋掉原有資料）
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // postMessage 同步給父視窗（LINE 模擬器用）
  useEffect(() => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "CART_UPDATE", count, total }, "*");
    }
  }, [items]);

  const addItem = useCallback((incoming: Omit<CartItem, "qty"> & { qty?: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === incoming.id);
      if (existing) {
        return prev.map((i) =>
          i.id === incoming.id ? { ...i, qty: i.qty + (incoming.qty ?? 1) } : i
        );
      }
      return [...prev, { ...incoming, qty: incoming.qty ?? 1 }];
    });
    // GA4 add_to_cart event
    sendGAEvent("add_to_cart", {
      currency: "TWD",
      value: incoming.price,
      items: [{ item_id: incoming.id, item_name: incoming.name, price: incoming.price }],
    });
    // 通知父視窗（LINE 模擬器 toast）
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "CART_UPDATE", action: "added", name: incoming.name }, "*");
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
    }
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<CartItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, updateItem, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}
