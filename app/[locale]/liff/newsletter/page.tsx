"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";

interface ArticleItem {
  id: string;
  title: string;
  date: string | null;
  cover_url: string | null;
  slug: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function LiffNewsletterPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, notion_id, title, cover_url, published_at, status")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);

      if (error) { console.error("Newsletter err:", error); setLoading(false); return; }
      setArticles((data || []).map(a => ({
        id: a.notion_id || a.id,
        title: a.title,
        date: a.published_at,
        cover_url: a.cover_url,
        slug: a.notion_id || a.id,
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="pb-4">
      {/* 標題 */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>地方通訊</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>宜蘭在地的文化觀察與書寫</p>
      </div>

      {/* 文章列表 */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
          ))
        ) : articles.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "#999" }}>目前沒有通訊文章</p>
        ) : (
          articles.map((article) => (
            <a
              key={article.id}
              href={`/post/${article.slug}?liff_mode=true`}
              className="flex rounded-xl overflow-hidden transition-shadow hover:shadow-md"
              style={{ background: "#fff", border: "1px solid #ece8e1" }}
            >
              {/* 左側圖片 */}
              <div className="w-24 shrink-0">
                <div className="aspect-square overflow-hidden">
                  <SafeImage src={article.cover_url} alt={article.title} placeholderType="article" />
                </div>
              </div>
              {/* 右側內容 */}
              <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                <h3 className="text-sm font-medium line-clamp-2" style={{ color: "#2d2a26" }}>
                  {article.title}
                </h3>
                {article.date && (
                  <p className="text-xs mt-1" style={{ color: "#b89e7a" }}>
                    {formatDate(article.date)}
                  </p>
                )}
              </div>
            </a>
          ))
        )}
      </div>

      {/* 查看全部 */}
      <div className="px-4 mt-6">
        <a
          href="/local-newsletter?liff_mode=true"
          className="block w-full py-3 rounded-xl text-center text-sm font-medium"
          style={{ background: "#7a5c40", color: "#fff" }}
        >
          查看全部通訊
        </a>
      </div>
    </div>
  );
}
