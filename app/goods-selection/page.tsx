"use client";

import { useState } from "react";

const topics = ["不分主題", "手作", "食品", "文具", "生活用品", "飾品"];
const brands = ["不分品牌", "宜蘭好物", "在地職人", "旅人選物"];
const sortOptions = ["預設", "最新", "價格", "瀏覽數"];

const sampleGoods = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `選物商品 ${i + 1}`,
  brand: brands[i % brands.length],
  price: 150 + i * 50,
  image: null,
}));

export default function GoodsSelectionPage() {
  const [activeTopic, setActiveTopic] = useState("不分主題");
  const [activeSort, setActiveSort] = useState("預設");

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-[1.5em] font-bold mb-6" style={{ color: "var(--color-ink)" }}>
        風格選物
      </h1>

      {/* Gs-S1: Featured carousel */}
      <div className="hscroll-track mb-8">
        {sampleGoods.slice(0, 6).map((g) => (
          <div key={g.id} className="flex-shrink-0 w-[200px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
            style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
            <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
              <span className="text-3xl opacity-30">🎁</span>
            </div>
            <div className="p-2">
              <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>{g.title}</h3>
              <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{g.brand}</p>
              <p className="text-[0.8em] font-medium" style={{ color: "var(--color-rust)" }}>NT$ {g.price}</p>
            </div>
          </div>
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
      <div className="hscroll-track mb-6">
        {brands.filter(b => b !== "不分品牌").map((b) => (
          <span key={b} className="flex-shrink-0 px-3 py-1 rounded-full text-xs"
            style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
            {b}
          </span>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Gs-S4: Category sidebar */}
        <aside className="hidden lg:block w-[160px] flex-shrink-0">
          <div className="sticky top-20 rounded-lg p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-bark)" }}>商品分類</p>
            {["手作", "食品", "文具", "生活", "飾品", "禮盒"].map((cat) => (
              <button key={cat} className="block w-full text-left px-2 py-1.5 rounded text-sm" style={{ color: "var(--color-muted)" }}>
                {cat}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1">
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>共 {sampleGoods.length} 件</span>
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
            {sampleGoods.map((g) => (
              <div key={g.id} className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <span className="text-3xl opacity-30">🎁</span>
                </div>
                <div className="p-3">
                  <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>{g.title}</h3>
                  <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{g.brand}</p>
                  <p className="text-[0.85em] font-medium mt-1" style={{ color: "var(--color-rust)" }}>NT$ {g.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
