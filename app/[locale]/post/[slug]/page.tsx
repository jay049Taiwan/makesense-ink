import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getPageContent } from "@/lib/notion";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import Link from "next/link";
import SafeImage from "@/components/ui/SafeImage";
import WishlistButton from "@/components/ui/WishlistButton";
import PaywallButton from "@/components/ui/PaywallButton";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("articles")
    .select("title")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();
  return { title: data?.title || "文章" };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 從 Supabase 拿文章基本資料（含 summary + related_product_id）
  const { data: article } = await supabase
    .from("articles")
    .select("id, notion_id, title, summary, cover_url, published_at, status, related_event_id, related_product_id, content")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  // 文章不存在或已下架（status !== 'published'）都導去下架畫面
  if (!article || article.status !== "published") {
    return (
      <div className="flex items-center justify-center py-24 flex-col gap-2">
        <p className="text-4xl">📄</p>
        <p style={{ color: "var(--color-mist)" }}>
          {article ? "此文章已下架" : "找不到此文章"}
        </p>
        <Link href="/local-newsletter" className="text-sm mt-2" style={{ color: "var(--color-teal)" }}>
          回到地方通訊
        </Link>
      </div>
    );
  }

  // 優先讀 Supabase content（已預存的 HTML），沒有才 fallback Notion API
  let contentHtml = article.content || "";
  if (!contentHtml) {
    try {
      const notionPageId = (article.notion_id || slug).replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        "$1-$2-$3-$4-$5"
      );
      contentHtml = await getPageContent(notionPageId);
      // 順便回存，下次就不用再查 Notion
      if (contentHtml && contentHtml.trim()) {
        await supabase.from("articles").update({ content: contentHtml }).eq("id", article.id);
      }
    } catch (e: any) {
      console.error("Failed to fetch Notion content:", e.message);
    }
  }

  // 付費內容判斷：有 related_product_id → 檢查使用者是否已購買
  let paywallProduct: { id: string; notionId: string; name: string; price: number; subCategory: string | null } | null = null;
  let isPaid = true; // 預設開放；有 product 才判定
  if (article.related_product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("id, notion_id, name, price, sub_category")
      .eq("id", article.related_product_id)
      .maybeSingle();
    if (product) {
      paywallProduct = {
        id: product.id,
        notionId: product.notion_id,
        name: product.name,
        price: Number(product.price) || 0,
        subCategory: product.sub_category,
      };
      // 預設未付費；若登入且有該商品的 confirmed 訂單則標記已付費
      isPaid = false;
      const session = await auth();
      const email = normalizeEmail(session?.user?.email) || null;
      if (email) {
        const { data: member } = await supabase.from("members").select("id").eq("email", email).maybeSingle();
        if (member?.id) {
          const { data: owned } = await supabase
            .from("orders")
            .select("id, order_items!inner(item_id)")
            .eq("member_id", member.id)
            .eq("status", "confirmed")
            .eq("order_items.item_id", product.id)
            .limit(1);
          if (owned && owned.length > 0) isPaid = true;
        }
      }
    }
  }

  // 如果有關聯活動，查活動資訊
  let relatedEvent: { title: string; slug: string; date: string | null } | null = null;
  if (article.related_event_id) {
    const { data: ev } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date")
      .eq("id", article.related_event_id)
      .maybeSingle();
    if (ev) {
      relatedEvent = { title: ev.title, slug: ev.notion_id || ev.id, date: ev.event_date };
    }
  }

  const publishDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <article className="mx-auto px-4 py-12" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h1
            className="text-3xl font-semibold leading-tight"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            {article.title}
          </h1>
          <WishlistButton itemType="article" itemId={article.id} />
        </div>
        {publishDate && (
          <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-mist)" }}>
            <span>{publishDate}</span>
          </div>
        )}
      </header>

      {/* Cover image — 只在有圖片時顯示 */}
      {article.cover_url && (
        <div className="aspect-[16/9] rounded-lg mb-8 overflow-hidden" style={{ background: "var(--color-parchment)" }}>
          <SafeImage src={article.cover_url} alt={article.title} placeholderType="article" />
        </div>
      )}

      {/* Article body / Paywall */}
      {paywallProduct && !isPaid ? (
        <>
          {/* 簡介摘要（預覽） */}
          {article.summary && (
            <div
              className="text-[0.95em] leading-[1.8] mb-8"
              style={{ color: "var(--color-ink)" }}
            >
              {article.summary.split("\n").map((line, i) => (
                <p key={i} className="mb-3">{line}</p>
              ))}
            </div>
          )}
          {/* 付費解鎖 */}
          <PaywallButton product={paywallProduct} articleTitle={article.title} />
        </>
      ) : contentHtml ? (
        <div
          className="notion-content text-[0.95em] leading-[1.8] space-y-4"
          style={{ color: "var(--color-ink)" }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "var(--color-mist)" }}>
            文章內容載入中或暫無內容
          </p>
        </div>
      )}

      {/* 關聯活動 */}
      {relatedEvent && (
        <div className="my-10 rounded-xl p-5" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>📅 關聯活動</p>
          <Link
            href={`/events/${relatedEvent.slug}`}
            className="text-base font-medium hover:underline"
            style={{ color: "var(--color-teal)" }}
          >
            {relatedEvent.title}
          </Link>
          {relatedEvent.date && (
            <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>
              {new Date(relatedEvent.date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* 導購區 */}
      <AlsoWantToKnow />
      <MightAlsoLike />
    </article>
  );
}
