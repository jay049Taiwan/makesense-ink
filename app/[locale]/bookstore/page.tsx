import type { Metadata } from "next";
import { fetchSBProducts, fetchSBArticles, fetchSBTopics, fetchSBEvents, applyTranslations } from "@/lib/fetch-supabase";
import { supabase } from "@/lib/supabase";
import YilanMap, { type MapViewpoint } from "@/components/viewpoint/YilanMap";
import { TOWNSHIPS, townshipSlugFromRegion, seedXY } from "@/lib/yilan-townships";
import { cleanTitle } from "@/lib/clean-title";
import HeroCarousel from "@/components/ui/HeroCarousel";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SafeImage from "@/components/ui/SafeImage";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import AddToCartButton from "@/components/ui/AddToCartButton";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bookstore" });
  return { title: t("title") };
}

export const revalidate = 300;

function ProductCard({ id, name, price, originalPrice, photo, author, publisher, stock, subCategory }: {
  id: string; name: string; price: number; originalPrice?: number; photo?: string | null; author?: string; publisher?: string; stock?: number; subCategory?: string | null;
}) {
  const notionId = id.replace(/-/g, "");
  return (
    <div
      className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md flex flex-col"
      style={{ border: "1px solid #e8e0d4", background: "#fff" }}
    >
      <Link href={`/product/${notionId}`} className="block">
        <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ background: "#f2ede6" }}>
          <SafeImage src={photo} alt={name} placeholderType="product" />
        </div>
        <div className="p-2.5 pb-1.5">
          <h3 className="text-[0.85em] line-clamp-1 font-medium" style={{ color: "#1a1612" }}>{name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            {originalPrice && originalPrice > price ? (
              <>
                <span className="text-[0.75em] line-through" style={{ color: "#aaa" }}>NT${originalPrice}</span>
                <span className="text-[0.8em] font-bold" style={{ color: "#e53e3e" }}>NT${price}</span>
              </>
            ) : (
              <span className="text-[0.8em] font-medium" style={{ color: "#b5522a" }}>NT$ {price}</span>
            )}
          </div>
          {(author || publisher) && (
            <p className="text-[0.7em] mt-0.5 line-clamp-1" style={{ color: "#999" }}>
              {author && author !== "—" ? author : ""}{author && author !== "—" && publisher ? " / " : ""}{publisher || ""}
            </p>
          )}
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 mt-auto">
        <AddToCartButton
          productId={id}
          notionId={notionId}
          name={name}
          price={price}
          stock={stock}
          subCategory={subCategory}
          size="sm"
        />
      </div>
    </div>
  );
}

export default async function BookstorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookstore");
  const te = await getTranslations("events");

  const [booksRaw, goodsRaw, articlesRaw, eventsRaw, topicShowcasesRaw, viewpointsRaw] = await Promise.all([
    fetchSBProducts("選書", 12),
    fetchSBProducts("選物", 12),
    fetchSBArticles(5),
    fetchSBEvents(3),
    // 話題推薦：DB05 官網備項=話題推薦 的文章，each with its related products
    (async () => {
      const { data: showcases } = await supabase
        .from("articles")
        .select("id, notion_id, title, summary, related_product_ids")
        .eq("status", "published")
        .contains("web_tag", ["話題推薦"])
        .order("updated_at", { ascending: false })
        .limit(3);
      if (!showcases || showcases.length === 0) return [];
      // Collect all product ids
      const allPids = new Set<string>();
      showcases.forEach((s: any) => {
        const ids = Array.isArray(s.related_product_ids) ? s.related_product_ids
          : (typeof s.related_product_ids === "string" ? (() => { try { return JSON.parse(s.related_product_ids); } catch { return []; } })() : []);
        ids.forEach((id: string) => allPids.add(id));
      });
      if (allPids.size === 0) return [];
      const { data: prods } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images, author_id, publisher_id, stock, status")
        .in("id", [...allPids])
        .eq("status", "active")
        .eq("page_status", "有頁面");
      const { data: persons } = await supabase.from("persons").select("id, name");
      const personMap = new Map((persons || []).map((p: any) => [p.id, p.name]));
      const pMap = new Map((prods || []).map((p: any) => {
        let photos: string[] = [];
        try { photos = JSON.parse(p.images || "[]"); } catch {}
        return [p.id, {
          id: p.notion_id || p.id,
          name: p.name,
          price: p.price,
          photo: photos[0] || null,
          author: p.author_id ? personMap.get(p.author_id) : undefined,
          publisher: p.publisher_id ? personMap.get(p.publisher_id) : undefined,
          stock: p.stock,
        }];
      }));
      return showcases.map((s: any) => {
        const ids = Array.isArray(s.related_product_ids) ? s.related_product_ids
          : (typeof s.related_product_ids === "string" ? (() => { try { return JSON.parse(s.related_product_ids); } catch { return []; } })() : []);
        return {
          id: s.id,
          title: s.title,
          summary: s.summary,
          products: ids.map((id: string) => pMap.get(id)).filter(Boolean),
        };
      }).filter((s: any) => s.products.length > 0);
    })(),
    // 觀點漫遊地圖資料：tag_type=viewpoint + region 對應到鄉鎮
    (async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, notion_id, name, summary, region")
        .eq("status", "active")
        .eq("tag_type", "viewpoint")
        .order("updated_at", { ascending: false })
        .limit(200);
      const byTownship: Record<string, { id: string; name: string; summary: string | null }[]> = {};
      for (const t of data || []) {
        const slug = townshipSlugFromRegion(t.region);
        if (!slug) continue;
        (byTownship[slug] ||= []).push({
          id: t.notion_id || t.id,
          name: cleanTitle(t.name),
          summary: t.summary,
        });
      }
      const markers: MapViewpoint[] = [];
      for (const t of TOWNSHIPS) {
        const list = byTownship[t.id] || [];
        list.forEach((tp, i) => {
          markers.push({
            id: tp.id,
            name: tp.name,
            township: t.id,
            xy: seedXY(t, i, list.length),
            summary: tp.summary,
          });
        });
      }
      return markers;
    })(),
  ]);

  // 非中文時套用翻譯
  const books = await applyTranslations(booksRaw, "products", locale, ["name", "description"]);
  const goods = await applyTranslations(goodsRaw, "products", locale, ["name", "description"]);
  const articles = await applyTranslations(articlesRaw, "articles", locale, ["title"]);
  const events = await applyTranslations(eventsRaw, "events", locale, ["title", "description"]);
  const topicShowcases = topicShowcasesRaw;

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ── 區塊 1: Hero 輪播 ── */}
      <section className="py-8">
        <HeroCarousel slides={[
          ...events.filter(ev => ev.cover_url).map(ev => ({
            image: ev.cover_url,
            title: ev.title,
            subtitle: ev.date ? `${new Date(ev.date).toLocaleDateString(locale === "zh" ? "zh-TW" : locale)} — ${ev.theme || ""}` : ev.description?.slice(0, 60) || "",
            cta: { text: te("register"), href: `/events/${ev.slug}` },
          })),
          ...articles.filter(a => a.cover_url).slice(0, Math.max(0, 4 - events.filter(ev => ev.cover_url).length)).map(a => ({
            image: a.cover_url,
            title: a.title,
            subtitle: a.date ? new Date(a.date).toLocaleDateString(locale === "zh" ? "zh-TW" : locale) : "",
            cta: { text: t("localNewsletter"), href: `/post/${a.slug}` },
          })),
          { image: null, title: t("title"), subtitle: "", cta: { text: t("themeCuration"), href: "/cultureclub" } },
        ]} />
      </section>

      {/* ── 區塊 2: 主題選書 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>{t("themeBooks")}</h2>
          <Link href="/book-selection" className="text-xs" style={{ color: "var(--color-teal)" }}>{t("moreThemeBooks")}</Link>
        </div>
        <div className="hscroll-track">
          {books.map((book) => (
            <ProductCard key={book.id} id={book.id} name={book.name} price={book.price} photo={book.photo} author={book.author} publisher={book.publisher} stock={book.stock} subCategory={book.category} />
          ))}
          {books.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>{t("noBooksYet")}</p>}
        </div>
      </section>

      {/* ── 區塊 3: 風格選物 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>{t("styleGoods")}</h2>
          <Link href="/goods-selection" className="text-xs" style={{ color: "var(--color-teal)" }}>{t("moreStyleGoods")}</Link>
        </div>
        <div className="hscroll-track">
          {goods.map((good) => (
            <ProductCard key={good.id} id={good.id} name={good.name} price={good.price} photo={good.photo} author={good.author} publisher={good.publisher} stock={good.stock} subCategory={good.category} />
          ))}
          {goods.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>{t("noGoodsYet")}</p>}
        </div>
      </section>

      {/* ── 區塊 B4: 話題推薦 ── 每個 DB05「官網備項=話題推薦」的文章渲染一行，標題 = 主題名稱，內容卡片 = 對應庫存商品 */}
      {topicShowcases.map((showcase: any) => (
        <section key={showcase.id} className="py-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>{showcase.title}</h2>
              {showcase.summary && <p className="text-xs mt-1" style={{ color: "#8b7355" }}>{showcase.summary}</p>}
            </div>
          </div>
          <div className="hscroll-track">
            {showcase.products.map((product: any) => (
              <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} photo={product.photo} author={product.author} publisher={product.publisher} stock={product.stock} subCategory={product.category} />
            ))}
          </div>
        </section>
      ))}

      {/* ── 區塊 B5: 地方通訊 ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>{t("localNewsletter")}</h2>
          <Link href="/local-newsletter" className="text-xs" style={{ color: "var(--color-teal)" }}>{t("localNewsletter")} →</Link>
        </div>
        <div>
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/post/${article.slug}`}
              className="flex items-start gap-4 py-4 px-2 -mx-2 rounded transition-colors hover:bg-[#faf8f5]"
              style={{ borderBottom: "1px solid #f0f0f0" }}
            >
              <span className="text-[0.8em] flex-shrink-0 min-w-[100px]" style={{ color: "#999" }}>
                {article.date ? new Date(article.date).toLocaleDateString(locale === "zh" ? "zh-TW" : locale) : ""}
              </span>
              <span className="text-[0.95em]" style={{ color: "#1a1612" }}>
                {article.title}
              </span>
            </Link>
          ))}
          {articles.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>—</p>}
        </div>
      </section>

      {/* ── 觀點漫遊地圖（編輯風 SVG，接 Supabase topics）── */}
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-1" style={{ color: "#1a1612" }}>觀點漫遊</h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-mist)" }}>
          十二個鄉鎮，{viewpointsRaw.length} 個觀點，從在地視角延伸的散步路徑
        </p>
        <YilanMap viewpoints={viewpointsRaw} height={620} />
      </section>
    </div>
  );
}
