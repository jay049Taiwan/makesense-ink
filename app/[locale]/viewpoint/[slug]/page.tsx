"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import SafeImage from "@/components/ui/SafeImage";

interface TopicData {
  name: string;
  tag_type: string;
  summary: string | null;
  content: string | null;
}

export default function ViewpointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch the topic
      const { data } = await supabase
        .from("topics")
        .select("id, notion_id, name, tag_type, summary, content, status")
        .or(`notion_id.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (data) {
        setTopic({
          name: data.name,
          tag_type: data.tag_type || "tag",
          summary: data.summary,
          content: data.content,
        });

        // Fetch related topics (same tag_type, excluding self)
        const { data: related } = await supabase
          .from("topics")
          .select("id, notion_id, name, tag_type")
          .eq("status", "active")
          .eq("tag_type", data.tag_type)
          .neq("notion_id", slug)
          .limit(8);
        setRelatedTopics((related || []).map(t => ({ id: t.notion_id || t.id, name: t.name, slug: t.notion_id || t.id })));

        // Fetch some products for "related products"
        const { data: prods } = await supabase
          .from("products")
          .select("id, notion_id, name, price, images, status")
          .eq("status", "active")
          .eq("page_status", "有頁面")
          .limit(5);

        setRelatedProducts((prods || []).map(p => ({
          id: p.notion_id || p.id,
          name: p.name,
          price: p.price,
          photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
          slug: p.notion_id || p.id,
        })));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><p style={{ color: "var(--color-mist)" }}>載入中…</p></div>;
  }

  if (!topic) {
    return (
      <div className="flex items-center justify-center py-24 flex-col gap-2">
        <p className="text-4xl">💡</p>
        <p style={{ color: "var(--color-mist)" }}>找不到此觀點</p>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>

      {/* 1. 觀點簡介 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.75em] px-2 py-0.5 rounded-[3px]"
            style={{
              background: topic.tag_type === "viewpoint" ? "#E3F2FD" : "#E8F5E9",
              color: topic.tag_type === "viewpoint" ? "#1565C0" : "#2E7D32",
            }}>
            {topic.tag_type === "viewpoint" ? "觀點" : "標籤"}
          </span>
        </div>
        <h1 className="text-3xl font-semibold mb-3"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          {topic.name}
        </h1>
        {topic.summary && (
          <div className="rounded-lg p-5 text-sm leading-relaxed"
            style={{ background: "var(--color-warm-white)", color: "var(--color-ink)", borderLeft: "3px solid var(--color-teal)" }}>
            {topic.summary}
          </div>
        )}
      </section>

      {/* 2. 觀點內容 */}
      {topic.content && (
        <section className="mb-12">
          <div className="text-[0.95em] leading-[1.8] space-y-4 whitespace-pre-line"
            style={{ color: "var(--color-ink)" }}>
            {topic.content}
          </div>
        </section>
      )}

      {/* 3. 相關商品 */}
      {relatedProducts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>相關商品</h2>
          <div className="hscroll-track">
            {relatedProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`}
                className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  <SafeImage src={p.photo} alt={p.name} placeholderType="product" />
                </div>
                <div className="p-2.5">
                  <h3 className="text-[0.85em] line-clamp-1" style={{ color: "var(--color-ink)" }}>{p.name}</h3>
                  <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>NT$ {p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. 延伸探索 */}
      {relatedTopics.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>延伸探索</h2>
          <div className="flex flex-wrap gap-3">
            {relatedTopics.map((t) => (
              <Link key={t.id} href={`/viewpoint/${t.slug}`}
                className="px-4 py-2.5 rounded-full text-sm transition-all hover:shadow-sm"
                style={{ background: "var(--color-parchment)", color: "var(--color-bark)", border: "1px solid var(--color-dust)" }}>
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
