"use client";

import { useState } from "react";

const topics = ["不分主題", "宜蘭文學", "在地生活", "自然生態", "歷史文化"];
const authors = ["不分作者", "黃春明", "簡媜", "吳明益"];
const sortOptions = ["預設", "最新", "價格", "瀏覽數"];

const sampleBooks = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `書籍名稱 ${i + 1}`,
  author: authors[i % authors.length],
  price: 280 + i * 30,
  image: null,
}));

export default function ThemedSelectionPage() {
  const [activeTopic, setActiveTopic] = useState("不分主題");
  const [activeSort, setActiveSort] = useState("預設");

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-[1.5em] font-bold mb-6" style={{ color: "var(--color-ink)" }}>
        主題選書
      </h1>

      {/* Ts-S1: Featured carousel */}
      <div className="hscroll-track mb-8">
        {sampleBooks.slice(0, 6).map((book) => (
          <div
            key={book.id}
            className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
            style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
          >
            <div className="aspect-[3/4] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
              <span className="text-3xl opacity-30">📖</span>
            </div>
            <div className="p-2">
              <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>{book.title}</h3>
              <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{book.author}</p>
              <p className="text-[0.8em] font-medium" style={{ color: "var(--color-rust)" }}>NT$ {book.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ts-S2: Topic tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTopic(t)}
            className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeTopic === t ? "var(--color-moss)" : "var(--color-warm-white)",
              color: activeTopic === t ? "#fff" : "var(--color-muted)",
              border: `1px solid ${activeTopic === t ? "var(--color-moss)" : "var(--color-dust)"}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Ts-S3: Author/creator row */}
      <div className="hscroll-track mb-6">
        {authors.filter(a => a !== "不分作者").map((a) => (
          <span key={a} className="flex-shrink-0 px-3 py-1 rounded-full text-xs"
            style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
            {a}
          </span>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Ts-S4: Category sidebar */}
        <aside className="hidden lg:block w-[160px] flex-shrink-0">
          <div className="sticky top-20 rounded-lg p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-bark)" }}>書籍分類</p>
            {["散文", "小說", "詩集", "圖文", "攝影", "繪本"].map((cat) => (
              <button key={cat} className="block w-full text-left px-2 py-1.5 rounded text-sm" style={{ color: "var(--color-muted)" }}>
                {cat}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1">
          {/* Ts-S5: Sort */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>共 {sampleBooks.length} 本</span>
            <div className="flex gap-1">
              {sortOptions.map((s) => (
                <button key={s} onClick={() => setActiveSort(s)} className="px-2 py-1 text-xs rounded transition-colors"
                  style={{ background: activeSort === s ? "var(--color-ink)" : "transparent", color: activeSort === s ? "#fff" : "var(--color-muted)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ts-S6: Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sampleBooks.map((book) => (
              <div key={book.id} className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[3/4] flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <span className="text-3xl opacity-30">📖</span>
                </div>
                <div className="p-3">
                  <h3 className="text-[0.9em] line-clamp-2" style={{ color: "var(--color-ink)" }}>{book.title}</h3>
                  <p className="text-[0.75em]" style={{ color: "var(--color-muted)" }}>{book.author}</p>
                  <p className="text-[0.85em] font-medium mt-1" style={{ color: "var(--color-rust)" }}>NT$ {book.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
