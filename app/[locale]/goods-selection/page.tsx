"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";

interface GoodsItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  photo: string | null;
  category: string | null;
  slug: string;
}

const sortOptions = ["預設", "最新", "價格", "瀏覽數"];

export default function GoodsSelectionPage() {
  const [activeTopic, setActiveTopic] = useState("不分主題");
  const [activeSort, setActiveSort] = useState("預設");
  const [goods, setGoods] = useState<GoodsItem[]>([]);
  const [topics, setTopics] = useState<string[]>(["不分主題"]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch products with category containing "選物"
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, stock, category, images, status, publisher_id")
        .eq("status", "active")
        .gt("stock", 0)
        .eq("category", "商品/選物")
        .order("updated_at", { ascending: false })
        .limit(60);

      if (data) {
        // Resolve publisher names for brand display
        const pubIds = [...new Set(data.map(p => p.publisher_id).filter(Boolean))];
        let pubMap: Record<string, string> = {};
        if (pubIds.length > 0) {
          const { data: persons } = await supabase
            .from("persons")
            .select("id, name")
            .in("id", pubIds);
          for (const p of persons || []) pubMap[p.id] = p.name;
        }

        const items: GoodsItem[] = data.map(p => ({
          id: p.notion_id || p.id,
          title: p.name,
          brand: p.publisher_id ? (pubMap[p.publisher_id] || "—") : "—",
          price: p.price,
          photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
          category: p.category,
          slug: p.notion_id || p.id,
        }));

        setGoods(items);

        // Extract unique categories and brands
        const cats = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];
        setTopics(["不分主題", ...cats]);
        const bNames = [...new Set(items.map(i => i.brand).filter(b => b !== "—"))];
        setBrands(bNames);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activeTopic === "不分主題"
    ? goods
    : goods.filter(g => g.category?.includes(activeTopic));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-[1.5em] font-bold mb-6" style={{ color: "var(--color-ink)" }}>
        風格選物
      </h1>

      {loading ? (
        <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>載入中…</p>
      ) : (
        <>
          {/* Gs-S1: Featured carousel */}
          <div className="hscroll-track mb-8">
            {filtered.slice(0, 6).map((g) => (
              <a key={g.id} href={`/product/${g.slug}`} className="flex-shrink-0 w-[200px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <SafeImage src={g.photo} alt={g.title} placeholderType="product" />
                </div>
                <div className="p-2">
                  <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>{g.title}</h3>
                  <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{g.brand}</p>
                  <p className="text-[0.8em] font-medium" style={{ color: "var(--color-rust)" }}>NT$ {g.price}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Gs-S2: Topic tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {topics.map((t) => (
              <button key={t} onClick={() => setActiveTopic(t)}
                className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  background: activeTopic === t ? "var(--color-moss)" : "var(--color-warm-white)",
                  color: activeTopic === t ? "#fff" : "var(--color-muted)",
                  border: `1px solid ${activeTopic === t ? "var(--color-moss)" : "var(--color-dust)"}`,
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Gs-S3: Brand row */}
          {brands.length > 0 && (
            <div className="hscroll-track mb-6">
              {brands.map((b) => (
                <span key={b} className="flex-shrink-0 px-3 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-6">
            {/* Gs-S4: Category sidebar */}
            <aside className="hidden lg:block w-[160px] flex-shrink-0">
              <div className="sticky top-20 rounded-lg p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-bark)" }}>商品分類</p>
                {topics.filter(t => t !== "不分主題").map((cat) => (
                  <button key={cat} onClick={() => setActiveTopic(cat)}
                    className="block w-full text-left px-2 py-1.5 rounded text-sm"
                    style={{ color: activeTopic === cat ? "var(--color-ink)" : "var(--color-muted)", fontWeight: activeTopic === cat ? 600 : 400 }}>
                    {cat}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1">
              {/* Sort */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm" style={{ color: "var(--color-muted)" }}>共 {filtered.length} 件</span>
                <div className="flex gap-1">
                  {sortOptions.map((s) => (
                    <button key={s} onClick={() => setActiveSort(s)} className="px-2 py-1 text-xs rounded transition-colors"
                      style={{ background: activeSort === s ? "var(--color-ink)" : "transparent", color: activeSort === s ? "#fff" : "var(--color-muted)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gs-S6: Product grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((g) => (
                  <a key={g.id} href={`/product/${g.slug}`} className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                    style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                    <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                      <SafeImage src={g.photo} alt={g.title} placeholderType="product" />
                    </div>
                    <div className="p-3">
                      <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>{g.title}</h3>
                      <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{g.brand}</p>
                      <p className="text-[0.85em] font-medium mt-1" style={{ color: "var(--color-rust)" }}>NT$ {g.price}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
