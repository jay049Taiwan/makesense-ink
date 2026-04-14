"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import SafeImage from "./SafeImage";
import BottomSheet, { type BottomSheetItem } from "./BottomSheet";

/**
 * 「你應該也想知道」— 最新文章
 * 「你可能也會喜歡」— 熱門商品
 *
 * LIFF 模式：點擊開 Bottom Sheet（不跳頁）
 * 一般模式：正常 Link 跳頁
 */

interface DisplayItem {
  id: string;
  title: string;
  subtitle?: string;
  photo?: string | null;
  href: string;
  price: number;
  type: "article" | "product";
}

function ItemCard({ item, onSheet }: { item: DisplayItem; onSheet?: (item: DisplayItem) => void }) {
  if (onSheet) {
    return (
      <button
        onClick={() => onSheet(item)}
        className="rounded-lg overflow-hidden transition-shadow hover:shadow-md text-left w-full"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      >
        <div className="aspect-[16/9] overflow-hidden">
          <SafeImage src={item.photo} alt={item.title} placeholderType={item.type} />
        </div>
        <div className="p-2.5">
          <h3 className="text-[0.85em] line-clamp-2" style={{ color: "var(--color-ink)" }}>{item.title}</h3>
          {item.subtitle && <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>{item.subtitle}</p>}
        </div>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
    >
      <div className="aspect-[16/9] overflow-hidden">
        <SafeImage src={item.photo} alt={item.title} placeholderType={item.type} />
      </div>
      <div className="p-2.5">
        <h3 className="text-[0.85em] line-clamp-2" style={{ color: "var(--color-ink)" }}>{item.title}</h3>
        {item.subtitle && <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>{item.subtitle}</p>}
      </div>
    </Link>
  );
}

export function AlsoWantToKnow() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [sheetItem, setSheetItem] = useState<BottomSheetItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, notion_id, title, cover_url")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4);

      setItems((data || []).map(a => ({
        id: a.notion_id || a.id,
        title: a.title,
        photo: a.cover_url,
        href: `/post/${a.notion_id || a.id}`,
        price: 0,
        type: "article" as const,
      })));
    })();
  }, []);

  if (items.length === 0) return null;

  const openSheet = (item: DisplayItem) => {
    setSheetItem({ id: item.id, name: item.title, price: item.price, photo: item.photo, type: item.type });
  };

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
        你應該也關注
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} onSheet={openSheet} />
        ))}
      </div>
      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </section>
  );
}

export function MightAlsoLike() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [sheetItem, setSheetItem] = useState<BottomSheetItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images")
        .eq("status", "active")
        .or("category.eq.商品/選書,category.eq.商品/選物")
        .order("updated_at", { ascending: false })
        .limit(4);

      setItems((data || []).map(p => {
        let photo: string | null = null;
        try { const imgs = JSON.parse(p.images || "[]"); photo = imgs[0] || null; } catch {}
        return {
          id: p.notion_id || p.id,
          title: p.name,
          subtitle: `NT$ ${p.price.toLocaleString()}`,
          photo,
          href: `/product/${p.notion_id || p.id}`,
          price: p.price,
          type: "product" as const,
        };
      }));
    })();
  }, []);

  if (items.length === 0) return null;

  const openSheet = (item: DisplayItem) => {
    setSheetItem({ id: item.id, name: item.title, price: item.price, photo: item.photo, type: item.type });
  };

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
        你可能也會喜歡
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} onSheet={openSheet} />
        ))}
      </div>
      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </section>
  );
}
