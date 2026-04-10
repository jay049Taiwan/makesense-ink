"use client";

import Link from "next/link";

interface SearchResults {
  keywords: { name: string; slug: string }[];
  products: { name: string; category: string; slug: string }[];
  activities: { title: string; date: string | null; type: string; slug: string }[];
  articles: { title: string; type: string; date: string | null; slug: string }[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { mm, dd, yyyy };
}

export default function SearchDropdown({
  results,
  onClose,
}: {
  results: SearchResults;
  onClose: () => void;
}) {
  const hasResults =
    results.keywords.length > 0 ||
    results.products.length > 0 ||
    results.activities.length > 0 ||
    results.articles.length > 0;

  if (!hasResults) {
    return (
      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-50 p-6 text-center text-sm" style={{ color: "var(--color-mist)" }}>
        找不到相關結果
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-[70vh] overflow-y-auto">
      {/* 關鍵字 */}
      {results.keywords.length > 0 && (
        <Section icon="🏷️" title="相關關鍵字">
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {results.keywords.map((kw) => (
              <Link
                key={kw.slug}
                href={`/keyword/${kw.slug}`}
                onClick={onClose}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: "var(--color-parchment, #f5f0e8)", color: "var(--color-bark, #7a5c40)" }}
              >
                # {kw.name}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 商品 */}
      {results.products.length > 0 && (
        <Section icon="📚" title="商品">
          {results.products.map((p) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "var(--color-parchment, #f5f0e8)" }}>
                📚
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink, #1a1a2e)" }}>{p.name}</p>
                <p className="text-xs" style={{ color: "var(--color-mist, #999)" }}>{p.category}</p>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* 活動 */}
      {results.activities.length > 0 && (
        <Section icon="🎪" title="活動">
          {results.activities.map((a) => {
            const d = formatDate(a.date);
            return (
              <Link
                key={a.slug}
                href={`/activity/${a.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                {d ? (
                  <span className="w-9 h-9 rounded-lg flex flex-col items-center justify-center text-xs flex-shrink-0 font-bold" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                    <span>{d.mm}/{d.dd}</span>
                    <span className="text-[9px] font-normal">{d.yyyy}</span>
                  </span>
                ) : (
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#e8f5e9" }}>🎪</span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink, #1a1a2e)" }}>{a.title}</p>
                  {a.type && (
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                      {a.type}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </Section>
      )}

      {/* 文章 */}
      {results.articles.length > 0 && (
        <Section icon="📝" title="文章">
          {results.articles.map((a) => (
            <Link
              key={a.slug}
              href={`/article/${a.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#fff8e1" }}>
                📝
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink, #1a1a2e)" }}>{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#fff8e1", color: "#f57f17" }}>
                    {a.type}
                  </span>
                  {a.date && <span className="text-[10px]" style={{ color: "var(--color-mist, #999)" }}>{a.date}</span>}
                </div>
              </div>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
      <div className="flex items-center gap-1.5 px-4 pb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--color-bark, #7a5c40)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
