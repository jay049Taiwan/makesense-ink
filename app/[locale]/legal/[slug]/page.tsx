import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { queryDatabase, getPageContent, DB } from "@/lib/notion";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchLegalPage(slug: string) {
  const label = decodeURIComponent(slug);
  const notionValue = `${label}（footer）`;

  const results = await queryDatabase(
    DB.DB05_REGISTRATION,
    { property: "官網備項", select: { equals: notionValue } },
    [{ timestamp: "last_edited_time", direction: "descending" as const }],
    1
  );
  return results[0] || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = decodeURIComponent(slug);
  return {
    title: label,
    description: `現思文化創藝有限公司 — ${label}`,
  };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;

  let page: any = null;
  let contentHtml = "";
  let lastEdited: string | null = null;

  try {
    page = await fetchLegalPage(slug);
  } catch (e: any) {
    console.error("[legal] Notion fetch failed:", e?.message);
  }

  if (!page) notFound();

  lastEdited = page.last_edited_time || null;

  try {
    const rawId: string = page.id || "";
    const pageId = rawId.includes("-") ? rawId : rawId.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5"
    );
    contentHtml = await getPageContent(pageId);
  } catch (e: any) {
    console.error("[legal] getPageContent failed:", e?.message);
  }

  const label = decodeURIComponent(slug);
  const lastEditedDisplay = lastEdited
    ? new Date(lastEdited).toLocaleDateString("zh-TW", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 800 }}>
      <h1
        className="text-3xl font-semibold mb-2"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
      >
        {label}
      </h1>
      {lastEditedDisplay && (
        <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
          最後更新日期：{lastEditedDisplay}
        </p>
      )}
      {contentHtml ? (
        <div
          className="notion-content text-[0.9em] leading-[1.8] space-y-4"
          style={{ color: "var(--color-ink)" }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>
          內容尚未設定。
        </p>
      )}
    </div>
  );
}
