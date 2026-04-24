"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/components/providers/CartProvider";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import SafeImage from "@/components/ui/SafeImage";
import WishlistButton from "@/components/ui/WishlistButton";

interface ProductData {
  name: string;
  price: number;
  stock: number;
  category: string;
  subCategory: string | null;
  description: string | null;
  photos: string[];
  author: string;
  publisher: string;
  relatedTopics: { id: string; name: string; slug: string }[];
  relatedArticles: { id: string; title: string; slug: string }[];
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, notion_id, name, price, stock, category, sub_category, description, images, author_id, publisher_id, related_topic_ids, related_article_ids, status")
          .or(`notion_id.eq.${slug},id.eq.${slug}`)
          .maybeSingle();

        if (data) {
          // Resolve author/publisher names
          const personIds = [data.author_id, data.publisher_id].filter(Boolean);
          let personMap: Record<string, string> = {};
          if (personIds.length > 0) {
            const { data: persons } = await supabase.from("persons").select("id, name").in("id", personIds);
            for (const p of persons || []) personMap[p.id] = p.name;
          }

          let photos: string[] = [];
          try { photos = JSON.parse(data.images || "[]"); } catch {}

          // Resolve related topics
          let relatedTopics: { id: string; name: string; slug: string }[] = [];
          const topicIds: string[] = (() => { try { return JSON.parse(data.related_topic_ids || "[]"); } catch { return []; } })();
          if (topicIds.length > 0) {
            const { data: topics } = await supabase.from("topics").select("id, notion_id, name").in("id", topicIds);
            relatedTopics = (topics || []).map(t => ({ id: t.id, name: t.name, slug: t.notion_id || t.id }));
          }

          // Resolve related articles
          let relatedArticles: { id: string; title: string; slug: string }[] = [];
          const articleIds: string[] = (() => { try { return JSON.parse(data.related_article_ids || "[]"); } catch { return []; } })();
          if (articleIds.length > 0) {
            const { data: articles } = await supabase.from("articles").select("id, notion_id, title").in("id", articleIds);
            relatedArticles = (articles || []).map(a => ({ id: a.id, title: a.title, slug: a.notion_id || a.id }));
          }

          setProduct({
            name: data.name,
            price: data.price,
            stock: data.stock,
            category: data.category || "",
            subCategory: data.sub_category || null,
            description: data.description,
            photos,
            author: data.author_id ? (personMap[data.author_id] || "—") : "—",
            publisher: data.publisher_id ? (personMap[data.publisher_id] || "—") : "—",
            relatedTopics,
            relatedArticles,
          });
        }
      } catch (err) {
        console.error("[product page] load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><p style={{ color: "var(--color-mist)" }}>載入中…</p></div>;
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-24 flex-col gap-2">
        <p className="text-4xl">📦</p>
        <p style={{ color: "var(--color-mist)" }}>找不到此商品</p>
      </div>
    );
  }

  const mainPhoto = product.photos[0] || null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(mainPhoto && { image: mainPhoto }),
    ...(product.author !== "—" && {
      brand: { "@type": "Brand", name: product.author },
    }),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "TWD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://makesense.ink/product/${slug}`,
      seller: {
        "@type": "Organization",
        name: "現思文化創藝術有限公司",
      },
    },
  };

  return (
    <div className="mx-auto py-12 px-4 sm:px-10" style={{ maxWidth: 1200 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Left: Gallery */}
        <div className="md:sticky md:top-6">
          <div className="aspect-square rounded-[2px] flex items-center justify-center overflow-hidden"
            style={{ background: "var(--color-parchment)" }}>
            <SafeImage src={mainPhoto} alt={product.name} placeholderType="product" />
          </div>
          {product.photos.length > 1 && (
            <div className="flex gap-2 mt-2.5">
              {product.photos.slice(0, 4).map((photo, i) => (
                <div key={i} className="flex-1 aspect-[3/4] rounded-[2px] overflow-hidden"
                  style={{ background: "var(--color-parchment)" }}>
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div>
          {product.category && (
            <div className="flex flex-wrap gap-2 mb-4">
              {product.category.split("/").map(cat => (
                <span key={cat} className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                  {cat}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
              {product.name}
            </h1>
            <WishlistButton itemType="product" itemId={slug} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-6">
            {product.author !== "—" && (
              <span style={{ color: "var(--color-mist)" }}>
                作者：<span style={{ color: "var(--color-bark)" }}>{product.author}</span>
              </span>
            )}
            {product.publisher !== "—" && (
              <span style={{ color: "var(--color-mist)" }}>
                發行：<span style={{ color: "var(--color-bark)" }}>{product.publisher}</span>
              </span>
            )}
          </div>

          <p className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-rust)" }}>
            NT$ {product.price.toLocaleString()}
          </p>
          {product.stock === 0 ? (
            <span className="inline-block px-3 py-1 rounded text-xs font-bold text-white mb-6" style={{ background: "#e53e3e" }}>
              無庫存
            </span>
          ) : (
            <p className="text-xs mb-6" style={{ color: "var(--color-mist)" }}>
              庫存 {product.stock} 件
            </p>
          )}

          {/* Add to cart */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center border rounded" style={{ borderColor: "var(--color-dust)" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 text-lg" style={{ color: "var(--color-bark)" }}>−</button>
              <span className="w-10 h-10 flex items-center justify-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 text-lg" style={{ color: "var(--color-bark)" }}>+</button>
            </div>
            <button
              disabled={product.stock === 0}
              onClick={() => {
                addItem({
                  id: `product-${slug}`,
                  name: product.name,
                  subtitle: product.category,
                  type: "商品",
                  price: product.price,
                  qty,
                  productId: slug,
                  subCategory: product.subCategory || undefined,
                });
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              }}
              className="flex-1 h-10 rounded text-sm font-medium text-white transition-colors"
              style={{ background: added ? "var(--color-teal)" : product.stock > 0 ? "var(--color-moss)" : "#ccc" }}>
              {added ? "✓ 已加入" : product.stock > 0 ? "加入購物車" : "無庫存"}
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-lg p-4 text-sm leading-relaxed mb-6 whitespace-pre-line"
              style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}>
              {product.description}
            </div>
          )}

          <div className="text-xs space-y-1" style={{ color: "var(--color-mist)" }}>
            <p>• 付款後 1-3 個工作天出貨</p>
            <p>• 商品圖片僅供參考，以實物為準</p>
          </div>

          {/* 相關觀點 */}
          {product.relatedTopics.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>相關觀點</p>
              <div className="flex flex-wrap gap-2">
                {product.relatedTopics.map(topic => (
                  <a key={topic.id} href={`/viewpoint/${topic.slug}`}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                    style={{ background: "var(--color-parchment)", color: "var(--color-teal)" }}>
                    {topic.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 相關文章 */}
          {product.relatedArticles.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>相關文章</p>
              <div className="space-y-1">
                {product.relatedArticles.map(article => (
                  <a key={article.id} href={`/post/${article.slug}`}
                    className="block text-sm hover:underline" style={{ color: "var(--color-teal)" }}>
                    📝 {article.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlsoWantToKnow />
      <MightAlsoLike />
    </div>
  );
}
