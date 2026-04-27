"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

interface TopicItem {
  id: string;
  name: string;
  tag_type: string;
  summary: string | null;
  slug: string;
}

export default function ViewpointStrollPage() {
  const [activeType, setActiveType] = useState("全部");
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("topics")
        .select("id, notion_id, name, tag_type, summary, status")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (data) {
        setTopics(data.map(t => ({
          id: t.notion_id || t.id,
          name: t.name,
          tag_type: t.tag_type || "tag",
          summary: t.summary,
          slug: t.notion_id || t.id,
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const types = ["全部", "viewpoint", "tag"];
  const typeLabels: Record<string, string> = { "全部": "全部", "viewpoint": "觀點", "tag": "標籤" };
  const filtered = activeType === "全部" ? topics : topics.filter(t => t.tag_type === activeType);

  // Extract unique keywords from topic names for the keyword carousel
  const keywords = topics.slice(0, 12).map(t => t.name);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
        觀點漫遊
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
        探索宜蘭的文化脈絡與在地觀點
      </p>

      {loading ? (
        <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>載入中…</p>
      ) : (
        <>
          {/* Keyword carousel */}
          <div className="hscroll-track mb-6">
            {keywords.map((kw) => (
              <Link key={kw} href={`/viewpoint/${topics.find(t => t.name === kw)?.slug || kw}`}
                className="flex-shrink-0 px-4 py-2 rounded-full border text-sm transition-all hover:shadow-sm"
                style={{ borderColor: "var(--color-dust)", background: "var(--color-warm-white)", color: "var(--color-bark)" }}>
                {kw}
              </Link>
            ))}
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {types.map((t) => (
              <button key={t} onClick={() => setActiveType(t)}
                className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  background: activeType === t ? "var(--color-teal)" : "var(--color-warm-white)",
                  color: activeType === t ? "#fff" : "var(--color-muted)",
                  border: `1px solid ${activeType === t ? "var(--color-teal)" : "var(--color-dust)"}`,
                }}>
                {typeLabels[t] || t}
              </button>
            ))}
          </div>

          {/* Count + grid */}
          <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>共 {filtered.length} 筆</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((topic) => (
              <Link key={topic.id} href={`/viewpoint/${topic.slug}`}
                className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[4/3]">
                  <ImagePlaceholder type="topic" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="flex-shrink-0 text-[0.7em] px-1.5 py-0.5 rounded-[3px]"
                      style={{
                        background: topic.tag_type === "viewpoint" ? "#E3F2FD" : "#E8F5E9",
                        color: topic.tag_type === "viewpoint" ? "#1565C0" : "#2E7D32",
                      }}>
                      {topic.tag_type === "viewpoint" ? "觀點" : "標籤"}
                    </span>
                  </div>
                  <h3 className="text-[0.9em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>
                    {topic.name}
                  </h3>
                  {topic.summary && (
                    <p className="text-[0.75em] line-clamp-2 mt-1" style={{ color: "var(--color-muted)" }}>
                      {topic.summary}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p style={{ color: "var(--color-mist)" }}>目前沒有觀點資料</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
