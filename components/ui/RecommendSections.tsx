"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { supabase } from "@/lib/supabase";
import SafeImage from "./SafeImage";
import BottomSheet, { type BottomSheetItem } from "./BottomSheet";

interface DisplayItem {
  id: string;
  title: string;
  subtitle?: string;
  photo?: string | null;
  href: string;
  price: number;
  type: "article" | "product";
}

function ItemCard({ item, onSheet, addLabel }: { item: DisplayItem; onSheet?: (item: DisplayItem) => void; addLabel: string }) {
  const handleClick = () => {
    if (onSheet) onSheet(item);
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-lg overflow-hidden transition-shadow hover:shadow-md text-left w-full"
      style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
    >
      <div className="aspect-[16/9] overflow-hidden">
        <SafeImage src={item.photo} alt={item.title} placeholderType={item.type} />
      </div>
      <div className="p-2.5">
        <h3 className="text-[0.85em] line-clamp-2 mb-1" style={{ color: "var(--color-ink)" }}>{item.title}</h3>
        <div className="flex items-center justify-between mt-1">
          {item.price > 0 ? (
            <span className="text-[0.8em] font-medium" style={{ color: "var(--color-rust)" }}>
              NT$ {item.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-[0.7em]" style={{ color: "#999" }}>
              {item.subtitle || "\u00A0"}
            </span>
          )}
          <span
            className="text-[0.7em] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--color-teal)", color: "#fff" }}
          >
            {addLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

export function AlsoWantToKnow() {
  const t = useTranslations("recommend");
  const tc = useTranslations("common");
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
        {t("articles")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} onSheet={openSheet} addLabel={tc("viewDetails")} />
        ))}
      </div>
      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </section>
  );
}

export function MightAlsoLike() {
  const t = useTranslations("recommend");
  const tc = useTranslations("common");
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [sheetItem, setSheetItem] = useState<BottomSheetItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images, stock")
        .eq("status", "active")
        .gt("stock", 0)  // 只推薦有庫存的
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
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
        {t("products")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} onSheet={openSheet} addLabel={tc("addToCart")} />
        ))}
      </div>
      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </section>
  );
}
