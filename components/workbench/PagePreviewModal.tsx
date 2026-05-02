"use client";

import { useEffect, useState } from "react";
import { staffFetch } from "@/lib/staff-fetch";

interface PagePreviewModalProps {
  notionId: string;
  onClose: () => void;
}

interface PageData {
  title: string;
  properties: { name: string; value: string }[];
  contentHtml: string;
  notionUrl: string;
}

/**
 * 工作台「動態」Tab 點選通知後彈出的 Notion page 唯讀預覽。
 *
 * - 顯示 page properties（title / status / 對應關聯數量等）
 * - 顯示 page 內容 blocks（含內嵌 child_database 自動 render 成表格）
 * - 提供「在 Notion 開啟」連結（要編輯就跳出去）
 * - 整個 modal 不可編輯（read-only）
 */
export default function PagePreviewModal({ notionId, onClose }: PagePreviewModalProps) {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await staffFetch(`/api/staff/workbench/page/${notionId}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "讀取失敗");
        setData({
          title: json.title || "（未命名）",
          properties: json.properties || [],
          contentHtml: json.contentHtml || "",
          notionUrl: json.notionUrl || "",
        });
      } catch (err: any) {
        setError(err?.message || "未知錯誤");
      } finally {
        setLoading(false);
      }
    })();
  }, [notionId]);

  // ESC 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[230] flex items-stretch justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl flex flex-col"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — sticky 上方含「上一頁」+ 標題 + X */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "#fff", borderBottom: "1px solid #e8e0d4" }}>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm rounded-lg px-3 py-1.5"
            style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: "pointer" }}
            aria-label="返回"
          >
            ← 上一頁
          </button>
          <p className="flex-1 text-sm font-bold text-center truncate" style={{ color: "#333" }}>
            {loading ? "載入中…" : data?.title || "—"}
          </p>
          <button
            onClick={onClose}
            className="text-lg w-8 h-8 rounded-full"
            style={{ background: "transparent", border: "none", color: "#999", cursor: "pointer" }}
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* Body — 可捲動 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-center py-8" style={{ color: "#999" }}>載入 Notion 內容中…</p>}
          {error && <p className="text-sm py-4" style={{ color: "#e53e3e" }}>⚠️ {error}</p>}

          {data && (
            <>
              {/* Properties */}
              {data.properties.length > 0 && (
                <div className="mb-5 pb-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <p className="text-xs mb-2" style={{ color: "#888" }}>欄位資訊</p>
                  <dl className="text-sm grid gap-1" style={{ gridTemplateColumns: "auto 1fr" }}>
                    {data.properties.map((p) => (
                      <div key={p.name} className="contents">
                        <dt className="pr-3" style={{ color: "#888" }}>{p.name}</dt>
                        <dd style={{ color: "#333" }}>{p.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Content HTML */}
              <div
                className="notion-preview-content text-sm"
                style={{ color: "#333", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: data.contentHtml || "<p style='color:#999'>（沒有 page 內容）</p>" }}
              />
            </>
          )}
        </div>

        {/* Footer — 「在 Notion 開啟」連結（要編輯跳出去）*/}
        {data?.notionUrl && (
          <div className="sticky bottom-0 px-4 py-3 flex items-center justify-end gap-2" style={{ background: "#fff", borderTop: "1px solid #e8e0d4" }}>
            <p className="text-[11px] flex-1" style={{ color: "#999" }}>此處唯讀，要編輯請到 Notion</p>
            <a
              href={data.notionUrl}
              target="_blank"
              rel="noopener"
              className="text-sm px-4 py-2 rounded-lg"
              style={{ background: "#7a5c40", color: "#fff", textDecoration: "none" }}
            >
              在 Notion 開啟 ↗
            </a>
          </div>
        )}
      </div>

      {/* 內嵌樣式（只影響本 modal 內的 notion-preview-content）*/}
      <style jsx global>{`
        .notion-preview-content h2 { font-size: 1.2rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #333; }
        .notion-preview-content h3 { font-size: 1.05rem; font-weight: 700; margin: 0.8rem 0 0.4rem; color: #444; }
        .notion-preview-content h4 { font-size: 0.95rem; font-weight: 600; margin: 0.6rem 0 0.3rem; color: #555; }
        .notion-preview-content p { margin: 0.5rem 0; }
        .notion-preview-content ul, .notion-preview-content ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        .notion-preview-content li { margin: 0.2rem 0; }
        .notion-preview-content blockquote { border-left: 3px solid #7a5c40; padding-left: 1rem; margin: 0.8rem 0; color: #666; }
        .notion-preview-content .callout { display: flex; gap: 0.5rem; padding: 0.75rem; background: #faf8f4; border-radius: 0.5rem; margin: 0.8rem 0; }
        .notion-preview-content .callout-icon { flex-shrink: 0; }
        .notion-preview-content .callout-body { flex: 1; }
        .notion-preview-content hr { border: none; border-top: 1px solid #e8e0d4; margin: 1rem 0; }
        .notion-preview-content figure { margin: 1rem 0; }
        .notion-preview-content figure img { max-width: 100%; border-radius: 0.5rem; }
        .notion-preview-content figcaption { font-size: 0.8rem; color: #888; text-align: center; margin-top: 0.3rem; }
        .notion-preview-content code { background: #f5f5f5; padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.9em; }
        .notion-preview-content pre { background: #f5f5f5; padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.8rem 0; }
        .notion-preview-content pre code { background: none; padding: 0; }
        .notion-preview-content a { color: #7a5c40; text-decoration: underline; }
        .notion-preview-content table { width: 100%; border-collapse: collapse; margin: 0.8rem 0; font-size: 0.85rem; }
        .notion-preview-content th, .notion-preview-content td { border: 1px solid #e8e0d4; padding: 0.4rem 0.6rem; text-align: left; }
        .notion-preview-content th { background: #faf8f4; font-weight: 600; color: #555; }
        .notion-preview-content .notion-childdb { margin: 1rem 0; padding: 0.75rem; border: 1px dashed #b89e7a; border-radius: 0.5rem; background: #fafaf6; }
        .notion-preview-content .notion-childdb-title { font-size: 0.9rem; font-weight: 600; color: #7a5c40; margin: 0 0 0.5rem 0; }
        .notion-preview-content .notion-childdb-more { color: #888; margin-top: 0.5rem; }
        .notion-preview-content .text-xs { font-size: 0.75rem; color: #888; }
        .notion-preview-content details { margin: 0.5rem 0; }
        .notion-preview-content details summary { cursor: pointer; font-weight: 500; }
        .notion-preview-content .embed iframe { width: 100%; min-height: 300px; border: 1px solid #e8e0d4; border-radius: 0.5rem; }
        .notion-preview-content .column-list { display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.8rem 0; }
        .notion-preview-content .column { flex: 1; min-width: 200px; }
        .notion-preview-content .todo { display: flex; gap: 0.4rem; align-items: center; margin: 0.3rem 0; }
      `}</style>
    </div>
  );
}
