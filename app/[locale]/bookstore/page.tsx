import type { Metadata } from "next";
import { fetchSBProducts, fetchSBArticles, fetchSBTopics, fetchSBEvents, applyTranslations } from "@/lib/fetch-supabase";
import ViewpointExplorer from "@/components/bookstore/ViewpointExplorer";
import HeroCarousel from "@/components/ui/HeroCarousel";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import SafeImage from "@/components/ui/SafeImage";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bookstore" });
  return { title: t("title") };
}

export const revalidate = 300;

function ProductCard({ id, name, price, originalPrice, photo, author, publisher }: {
  id: string; name: string; price: number; originalPrice?: number; photo?: string | null; author?: string; publisher?: string;
}) {
  return (
    <Link
      href={`/product/${id.replace(/-/g, "")}`}
      className="flex-shrink-0 w-[180px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: "1px solid #e8e0d4", background: "#fff" }}
    >
      <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ background: "#f2ede6" }}>
        <SafeImage src={photo} alt={name} placeholderType="product" />
      </div>
      <div className="p-2.5">
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
  );
}

export default async function BookstorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bookstore");
  const te = await getTranslations("events");

  const [booksRaw, goodsRaw, articlesRaw, viewpointsRaw, eventsRaw] = await Promise.all([
    fetchSBProducts("選書", 12),
    fetchSBProducts("選物", 12),
    fetchSBArticles(5),
    fetchSBTopics("viewpoint", 3),
    fetchSBEvents(3),
  ]);

  // 非中文時套用翻譯
  const books = await applyTranslations(booksRaw, "products", locale, ["name", "description"]);
  const goods = await applyTranslations(goodsRaw, "products", locale, ["name", "description"]);
  const articles = await applyTranslations(articlesRaw, "articles", locale, ["title"]);
  const viewpoints = await applyTranslations(viewpointsRaw, "topics", locale, ["name", "summary"]);
  const events = await applyTranslations(eventsRaw, "events", locale, ["title", "description"]);

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
            <ProductCard key={book.id} id={book.id} name={book.name} price={book.price} photo={book.photo} author={book.author} publisher={book.publisher} />
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
            <ProductCard key={good.id} id={good.id} name={good.name} price={good.price} photo={good.photo} author={good.author} publisher={good.publisher} />
          ))}
          {goods.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist)" }}>{t("noGoodsYet")}</p>}
        </div>
      </section>

      {/* ── 區塊 B4: 主題策展 ── */}
      {viewpoints.length > 0 && (
        <section className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[1.5em] font-bold" style={{ color: "#1a1612" }}>{t("themeCuration")}</h2>
            <Link href="/viewpoint-stroll" className="text-xs" style={{ color: "var(--color-teal)" }}>{t("viewpointExplorer")} →</Link>
          </div>
          <div className="hscroll-track">
            {viewpoints.map((vp) => (
              <Link key={vp.id} href={`/viewpoint/${vp.slug}`}
                className="flex-shrink-0 w-[260px] rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid #e8e0d4", background: "#fff" }}>
                <div className="aspect-[16/9] flex items-center justify-center" style={{ background: "#f2ede6" }}>
                  <ImagePlaceholder type="topic" />
                </div>
                <div className="p-3">
                  <h3 className="text-[0.95em] font-medium line-clamp-2 mb-1" style={{ color: "#1a1612" }}>{vp.name}</h3>
                  {vp.summary && <p className="text-[0.75em] line-clamp-2" style={{ color: "#8b7355" }}>{vp.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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

      {/* ── 觀點漫遊地圖 ── */}
      <ViewpointExplorer />
    </div>
  );
}
