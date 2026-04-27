import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import { cleanTitle } from "@/lib/clean-title";
import AddToCartButton from "@/components/ui/AddToCartButton";
import QuickBookButton from "@/components/ui/QuickBookButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `搜尋「${q}」` : "搜尋" };
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ || "").trim();

  if (!q) {
    return (
      <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 1200 }}>
        <p style={{ color: "var(--color-mist)" }}>請輸入搜尋關鍵字</p>
      </div>
    );
  }

  const like = `%${q}%`;

  const [productsRes, eventsRes, articlesRes, topicsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, notion_id, name, price, images, category, stock")
      .eq("status", "active")
      .ilike("name", like)
      .limit(60),
    supabase
      .from("events")
      .select("id, notion_id, title, cover_url, event_date, event_type, location")
      .eq("status", "active")
      .ilike("title", like)
      .order("event_date", { ascending: false })
      .limit(60),
    supabase
      .from("articles")
      .select("id, notion_id, title, summary, cover_url, published_at")
      .eq("status", "published")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .order("published_at", { ascending: false })
      .limit(60),
    supabase
      .from("topics")
      .select("id, notion_id, name, summary, tag_type, region")
      .eq("status", "active")
      .ilike("name", like)
      .limit(60),
  ]);

  const products = (productsRes.data || []).map((p: any) => {
    let photo: string | null = null;
    try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
    return {
      id: p.notion_id || p.id,
      name: cleanTitle(p.name),
      price: p.price,
      photo,
      category: p.category,
      stock: p.stock,
    };
  });
  const events = (eventsRes.data || []).map((e: any) => ({
    id: e.notion_id || e.id,
    title: cleanTitle(e.title),
    photo: e.cover_url,
    date: e.event_date,
    type: e.event_type,
    location: e.location,
  }));
  const articles = (articlesRes.data || []).map((a: any) => ({
    id: a.notion_id || a.id,
    title: cleanTitle(a.title),
    summary: a.summary,
    photo: a.cover_url,
    date: a.published_at,
  }));
  const topics = (topicsRes.data || []).map((t: any) => ({
    id: t.notion_id || t.id,
    name: cleanTitle(t.name),
    summary: t.summary,
    tagType: t.tag_type,
    region: Array.isArray(t.region) ? t.region : [],
  }));

  const total = products.length + events.length + articles.length + topics.length;

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2"
          style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          — SEARCH RESULTS —
        </p>
        <h1 className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          搜尋「{q}」
        </h1>
        <p className="text-sm" style={{ color: "var(--color-bark)" }}>
          共找到 {total} 筆結果
          {total > 0 && (
            <span style={{ color: "var(--color-mist)" }}>
              　·　商品 {products.length}　·　活動 {events.length}　·　文章 {articles.length}　·　觀點/標籤 {topics.length}
            </span>
          )}
        </p>
      </div>

      {total === 0 && (
        <div className="py-16 text-center">
          <p className="text-base mb-2" style={{ color: "var(--color-ink)" }}>沒有找到符合「{q}」的結果</p>
          <p className="text-sm" style={{ color: "var(--color-mist)" }}>試試其他關鍵字，或回首頁逛逛</p>
          <Link href="/" className="inline-block mt-4 px-4 py-2 rounded text-sm"
            style={{ background: "var(--color-teal)", color: "#fff" }}>
            回首頁
          </Link>
        </div>
      )}

      {/* 商品 */}
      {products.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>商品</h2>
            <span className="text-xs" style={{ color: "var(--color-mist)" }}>{products.length} 筆</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-lg overflow-hidden transition-shadow hover:shadow-md flex flex-col"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <Link href={`/product/${p.id}`} className="block">
                  <div className="aspect-square flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                    <SafeImage src={p.photo} alt={p.name} placeholderType="product" />
                  </div>
                  <div className="p-3 pb-1.5">
                    <h3 className="text-[0.9em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>{p.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-[0.85em] font-medium" style={{ color: "#b5522a" }}>NT$ {p.price}</span>
                    </div>
                  </div>
                </Link>
                <div className="px-3 pb-3 mt-auto">
                  <AddToCartButton productId={p.id} notionId={p.id} name={p.name} price={p.price} stock={p.stock} subCategory={p.category} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 活動 */}
      {events.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>活動</h2>
            <span className="text-xs" style={{ color: "var(--color-mist)" }}>{events.length} 筆</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => {
              const ended = e.date ? new Date(e.date) < new Date() : false;
              return (
                <div key={e.id}
                  className="flex flex-col rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                  style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                  <Link href={`/events/${e.id}`} className="flex gap-3 p-3">
                    <div className="w-28 flex-shrink-0 aspect-[16/10] rounded overflow-hidden" style={{ background: "var(--color-parchment)" }}>
                      <SafeImage src={e.photo} alt={e.title} placeholderType="event" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[0.95em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>{e.title}</h3>
                      {e.date && (
                        <p className="text-[0.75em] mt-1" style={{ color: "var(--color-mist)" }}>
                          {new Date(e.date).toLocaleDateString("zh-TW")}
                        </p>
                      )}
                      {e.location && (
                        <p className="text-[0.7em] mt-0.5 line-clamp-1" style={{ color: "var(--color-bark)" }}>
                          📍 {e.location}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <QuickBookButton slug={e.id} ended={ended} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 文章 */}
      {articles.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>文章</h2>
            <span className="text-xs" style={{ color: "var(--color-mist)" }}>{articles.length} 筆</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((a) => (
              <Link key={a.id} href={`/post/${a.id}`}
                className="flex gap-3 rounded-lg overflow-hidden transition-shadow hover:shadow-md p-3"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="w-32 flex-shrink-0 aspect-[16/10] rounded overflow-hidden" style={{ background: "var(--color-parchment)" }}>
                  <SafeImage src={a.photo} alt={a.title} placeholderType="article" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[0.95em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>{a.title}</h3>
                  {a.date && (
                    <p className="text-[0.75em] mt-1" style={{ color: "var(--color-mist)" }}>
                      {new Date(a.date).toLocaleDateString("zh-TW")}
                    </p>
                  )}
                  {a.summary && (
                    <p className="text-[0.8em] mt-1 line-clamp-2" style={{ color: "var(--color-bark)" }}>
                      {a.summary}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 觀點/標籤 */}
      {topics.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              觀點 / 標籤
            </h2>
            <span className="text-xs" style={{ color: "var(--color-mist)" }}>{topics.length} 筆</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {topics.map((t) => (
              <Link key={t.id} href={`/viewpoint/${t.id}`}
                className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <div className="aspect-[4/3]">
                  <ImagePlaceholder type="topic" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="flex-shrink-0 text-[0.7em] px-1.5 py-0.5 rounded-[3px]"
                      style={{
                        background: t.tagType === "viewpoint" ? "#E3F2FD" : "#E8F5E9",
                        color: t.tagType === "viewpoint" ? "#1565C0" : "#2E7D32",
                      }}>
                      {t.tagType === "viewpoint" ? "觀點" : "標籤"}
                    </span>
                    {t.region.length > 0 && (
                      <span className="text-[0.7em]" style={{ color: "var(--color-mist)" }}>
                        {t.region.join(" / ")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[0.9em] line-clamp-2 font-medium" style={{ color: "var(--color-ink)" }}>{t.name}</h3>
                  {t.summary && (
                    <p className="text-[0.75em] line-clamp-2 mt-1" style={{ color: "var(--color-bark)" }}>
                      {t.summary}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
