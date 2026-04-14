"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";

interface BookItem {
  id: string;
  title: string;
  author: string;
  publisher: string;
  price: number;
  photo: string | null;
  category: string | null;
  slug: string;
}

const sortOptions = ["預設", "最新", "價格"];

export default function BookSelectionPage() {
  const [activeSort, setActiveSort] = useState("預設");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, category, images, status, author_id, publisher_id")
        .eq("status", "active")
        .ilike("category", "%選書%")
        .order("updated_at", { ascending: false })
        .limit(60);

      if (data) {
        const personIds = [...new Set(data.flatMap(p => [p.author_id, p.publisher_id]).filter(Boolean))];
        let personMap: Record<string, string> = {};
        if (personIds.length > 0) {
          const { data: persons } = await supabase.from("persons").select("id, name").in("id", personIds);
          for (const p of persons || []) personMap[p.id] = p.name;
        }

        const items: BookItem[] = data.map(p => ({
          id: p.notion_id || p.id,
          title: p.name,
          author: p.author_id ? (personMap[p.author_id] || "—") : "—",
          publisher: p.publisher_id ? (personMap[p.publisher_id] || "—") : "—",
          price: p.price,
          photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
          category: p.category,
          slug: p.notion_id || p.id,
        }));

        setBooks(items);
        setAuthors([...new Set(items.map(b => b.author).filter(a => a !== "—"))]);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
        主題選書
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
        我們精選的在地文化書籍與出版品
      </p>

      {loading ? (
        <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>載入中…</p>
      ) : (
        <>
          {/* Featured carousel */}
          <div className="hscroll-track mb-8">
            {books.slice(0, 6).map((book) => (
              <a key={book.id} href={`/product/${book.slug}`}
                className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[3/4] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <SafeImage src={book.photo} alt={book.title} placeholderType="product" />
                </div>
                <div className="p-2">
                  <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>{book.title}</h3>
                  <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{book.author}</p>
                  <p className="text-[0.8em] font-medium" style={{ color: "var(--color-rust)" }}>NT$ {book.price}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Author row */}
          {authors.length > 0 && (
            <div className="hscroll-track mb-6">
              {authors.map((a) => (
                <span key={a} className="flex-shrink-0 px-3 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Sort + count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>共 {books.length} 本</span>
            <div className="flex gap-1">
              {sortOptions.map((s) => (
                <button key={s} onClick={() => setActiveSort(s)} className="px-2 py-1 text-xs rounded transition-colors"
                  style={{ background: activeSort === s ? "var(--color-ink)" : "transparent", color: activeSort === s ? "#fff" : "var(--color-muted)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Book grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((book) => (
              <a key={book.id} href={`/product/${book.slug}`} className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[3/4] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <SafeImage src={book.photo} alt={book.title} placeholderType="product" />
                </div>
                <div className="p-3">
                  <h3 className="text-[0.9em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>{book.title}</h3>
                  {book.author !== "—" && (
                    <p className="text-[0.75em] mt-0.5" style={{ color: "var(--color-muted)" }}>{book.author}</p>
                  )}
                  <p className="text-[0.85em] font-medium mt-1" style={{ color: "var(--color-rust)" }}>NT$ {book.price}</p>
                </div>
              </a>
            ))}
          </div>

          {books.length === 0 && (
            <div className="py-16 text-center">
              <p style={{ color: "var(--color-mist)" }}>目前沒有上架的書籍</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
