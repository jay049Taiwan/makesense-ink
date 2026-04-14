"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 「你應該也想知道」— 最新文章
 * 「你可能也會喜歡」— 熱門商品
 *
 * 用於：單一商品、單一活動、單一文章、結帳頁
 * 自動從 Supabase 抓取，不再使用假資料
 */

interface DisplayItem {
  title: string;
  subtitle?: string;
  photo?: string | null;
  href: string;
}

function ItemCard({ item }: { item: DisplayItem }) {
  return (
    <Link
      href={item.href}
      className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
    >
      <div
        className="aspect-[16/9] flex items-center justify-center overflow-hidden"
        style={{ background: "var(--color-parchment)" }}
      >
        {item.photo
          ? <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
          : <span className="text-2xl opacity-20">📄</span>}
      </div>
      <div className="p-2.5">
        <h3 className="text-[0.85em] line-clamp-2" style={{ color: "var(--color-ink)" }}>
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>
            {item.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

export function AlsoWantToKnow() {
  const [items, setItems] = useState<DisplayItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, notion_id, title, cover_url")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4);

      setItems((data || []).map(a => ({
        title: a.title,
        photo: a.cover_url,
        href: `/post/${a.notion_id || a.id}`,
      })));
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
        你應該也想知道
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}

export function MightAlsoLike() {
  const [items, setItems] = useState<DisplayItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(4);

      setItems((data || []).map(p => {
        let photo: string | null = null;
        try { const imgs = JSON.parse(p.images || "[]"); photo = imgs[0] || null; } catch {}
        return {
          title: p.name,
          subtitle: `NT$ ${p.price.toLocaleString()}`,
          photo,
          href: `/product/${p.notion_id || p.id}`,
        };
      }));
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
        你可能也會喜歡
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
