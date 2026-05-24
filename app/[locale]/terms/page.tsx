import type { Metadata } from "next";
import { queryDatabase, getPageContent, DB } from "@/lib/notion";

export const metadata: Metadata = {
  title: "服務條款、退換貨政策與隱私政策",
  description: "現思文化創藝有限公司 — 服務條款、退換貨政策與隱私政策。",
};

// 每次請求重新 fetch（條款更新頻率低，不需要快取，但要確保拿到最新版）
export const revalidate = 3600; // 1 小時 ISR

export default async function TermsPage() {
  let contentHtml = "";
  let lastEdited: string | null = null;
  let notionError = false;

  try {
    // 查 DB05：官網備項 = "服務條款"，取第一筆
    const results = await queryDatabase(
      DB.DB05_REGISTRATION,
      { property: "官網備項", select: { equals: "服務條款（footer）" } },
      [{ timestamp: "last_edited_time", direction: "descending" as const }],
      1
    );

    const page = results[0];
    if (page) {
      lastEdited = page.last_edited_time || null;

      // 把 Notion page ID 轉成有 dash 的格式（blocks API 需要）
      const rawId: string = page.id || "";
      const pageId = rawId.includes("-") ? rawId : rawId.replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        "$1-$2-$3-$4-$5"
      );

      contentHtml = await getPageContent(pageId);
    }
  } catch (e: any) {
    console.error("[terms] Notion fetch failed:", e?.message);
    notionError = true;
  }

  const lastEditedDisplay = lastEdited
    ? new Date(lastEdited).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 800 }}>
      <h1
        className="text-3xl font-semibold mb-2"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
      >
        服務條款、退換貨政策與隱私政策
      </h1>

      {lastEditedDisplay && (
        <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
          最後更新日期：{lastEditedDisplay}
        </p>
      )}

      {notionError && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ background: "#fff3cd", color: "#856404" }}>
          條款內容暫時無法載入，請稍後重試。
        </div>
      )}

      {contentHtml ? (
        <div
          className="notion-content text-[0.9em] leading-[1.8] space-y-4"
          style={{ color: "var(--color-ink)" }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : !notionError ? (
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>
          條款內容尚未設定，請在 Notion DB05 建立「官網備項＝服務條款（footer）」的頁面。
        </p>
      ) : null}
    </div>
  );
}
