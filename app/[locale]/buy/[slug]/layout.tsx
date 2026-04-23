import type { Metadata, ResolvingMetadata } from "next";
import { getPage } from "@/lib/notion";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://makesense.ink").trim().replace(/\/$/, "");

function t(prop: any): string { return prop?.title?.[0]?.plain_text || prop?.title?.map((x: any) => x.plain_text).join("") || ""; }
function tx(prop: any): string { return prop?.rich_text?.map((x: any) => x.plain_text).join("") || ""; }
function st(prop: any): string { return prop?.status?.name || prop?.select?.name || ""; }

/**
 * Per-route metadata：讓 FB / LINE / Twitter 分享有預覽
 * - /buy/vendor-{id}  → 抓 DB05 品牌資料
 * - /buy/market-{id}  → 抓 DB04 活動資料
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const url = `${SITE}/buy/${slug}`;

  try {
    if (slug.startsWith("vendor-")) {
      const id = slug.slice("vendor-".length);
      const page: any = await getPage(id);
      const props = page?.properties || {};
      const admissionStatus = st(props["錄取狀態"]);
      if (admissionStatus !== "錄取") {
        return { title: "預購頁已下架", robots: { index: false } };
      }
      const summary = tx(props["明細內容"]) || "";
      const brand: Record<string, string> = {};
      summary.split("\n").forEach((line: string) => {
        const m = line.match(/^([^：:]+)[：:]\s*(.*)$/);
        if (m) brand[m[1].trim()] = m[2].trim();
      });
      const brandName = brand["品牌名稱"] || t(props["表單名稱"]) || "攤商預購";
      const intro = (brand["品牌簡介"] || "").slice(0, 120);
      const files = props["上傳檔案"]?.files || [];
      const imageUrl =
        files.find((f: any) => f.name?.includes("情境"))?.external?.url ||
        files.find((f: any) => f.name?.includes("Logo"))?.external?.url ||
        files[0]?.external?.url;
      return {
        title: `${brandName} · 預購 | 現思市集`,
        description: intro || "於市集當天現場交付。立即查看商品/體驗/活動時間並預購。",
        openGraph: {
          title: `${brandName} · 預購`,
          description: intro,
          url,
          type: "website",
          siteName: "現思文化・旅人書店",
          ...(imageUrl ? { images: [{ url: imageUrl, alt: brandName }] } : {}),
        },
        twitter: { card: imageUrl ? "summary_large_image" : "summary" },
        alternates: { canonical: url },
      };
    }

    if (slug.startsWith("market-")) {
      const id = slug.slice("market-".length);
      const page: any = await getPage(id);
      const props = page?.properties || {};
      const title = t(props["主題名稱"]) || t(props["交接名稱"]) || "市集";
      const dateProp = props["執行時間"]?.date || props["活動日期"]?.date;
      const dateStr = dateProp?.start
        ? new Date(dateProp.start).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
        : "";
      const desc = `${dateStr}｜現思市集攤商預購頁．查看所有攤商與商品，市集當天現場交付。`;
      const files = props["上傳檔案"]?.files || [];
      const imageUrl = files[0]?.external?.url;
      return {
        title: `${title} · 市集預購 | 現思文化`,
        description: desc,
        openGraph: {
          title: `${title} · 市集預購`,
          description: desc,
          url,
          type: "website",
          siteName: "現思文化・旅人書店",
          ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
        },
        twitter: { card: imageUrl ? "summary_large_image" : "summary" },
        alternates: { canonical: url },
      };
    }
  } catch (e) {
    // Notion 查詢失敗時 fallback 預設 metadata，不阻止頁面渲染
  }

  return {
    title: "預購 | 現思文化",
    description: "市集攤商預購頁。",
  };
}

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
