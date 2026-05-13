"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

interface SavedItem {
  id: string;
  item_type: string;
  item_id: string;
  item_title: string | null;
  item_path: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  article: "📝 文章",
  event: "📅 活動",
  product: "📦 商品",
  topic: "🔍 觀點",
  page: "🔗 頁面",
};
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  article: { bg: "#e8eaf6", color: "#283593" },
  event:   { bg: "#fff3e0", color: "#e65100" },
  product: { bg: "#e0f7f4", color: "#00695c" },
  topic:   { bg: "#f3e5f5", color: "#6a1b9a" },
  page:    { bg: "#f5f5f5", color: "#555" },
};

export default function SavesPage() {
  const { data: session, status } = useSession();
  const [saves, setSaves] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { setLoading(false); return; }
    if (status !== "authenticated") return;
    fetch("/api/engagement/saves")
      .then(r => r.ok ? r.json() : { saves: [] })
      .then(d => setSaves(d.saves || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const handleRemove = async (item: SavedItem) => {
    setRemovingId(item.id);
    try {
      await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", item_type: item.item_type, item_id: item.item_id }),
      });
      setSaves(prev => prev.filter(s => s.id !== item.id));
    } catch {}
    setRemovingId(null);
  };

  const displayTitle = (item: SavedItem) => {
    if (item.item_title) return item.item_title.replace(/ \| .*$/, ""); // 去掉 " | 旅人書店" 後綴
    if (item.item_path) return item.item_path;
    return item.item_id.slice(0, 20);
  };

  const displayPath = (item: SavedItem) => item.item_path || `/${item.item_type}/${item.item_id}`;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-teal)" }}>← 回會員中心</Link>
      </div>
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, monospace" }}>— MY SAVES —</p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>我的收藏</h1>
      </div>

      {status === "unauthenticated" && (
        <div className="rounded-xl p-8 text-center" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
          <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>請先登入查看收藏清單</p>
          <button onClick={() => signIn()} className="px-5 py-2 rounded text-sm font-medium text-white"
            style={{ background: "var(--color-moss)" }}>登入</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "#e8e8e8", borderTopColor: "var(--color-teal)" }} />
          <span className="text-sm" style={{ color: "var(--color-mist)" }}>載入中…</span>
        </div>
      )}

      {!loading && status === "authenticated" && saves.length === 0 && (
        <div className="rounded-xl p-10 text-center" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
          <p style={{ fontSize: 40 }}>🔖</p>
          <p className="text-sm mt-3" style={{ color: "var(--color-mist)" }}>還沒有收藏任何內容</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-dust)" }}>在文章、活動、商品頁按下「收藏」即可加入</p>
        </div>
      )}

      {saves.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>共 {saves.length} 項</p>
          {saves.map(item => {
            const typeStyle = TYPE_COLORS[item.item_type] || TYPE_COLORS.page;
            return (
              <div key={item.id}
                className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{ background: "#fff", border: "1px solid #ede8e0" }}>
                <Link href={displayPath(item)} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: typeStyle.bg, color: typeStyle.color }}>
                      {TYPE_LABELS[item.item_type] || item.item_type}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                      {new Date(item.created_at).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                    {displayTitle(item)}
                  </p>
                </Link>
                <button
                  onClick={() => handleRemove(item)}
                  disabled={removingId === item.id}
                  className="shrink-0 text-xs px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                  style={{ color: "#e05a5a", border: "1px solid #fca5a5" }}>
                  {removingId === item.id ? "…" : "移除"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
