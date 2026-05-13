"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface AnalyticsData {
  period: string;
  pageViews: number;
  likes: number;
  saves: number;
  searches: number;
  members: number;
  wishlist?: number;
  orders: { total: number; revenue: number; bySource: Record<string, number> };
  topPages: { path: string; count: number }[];
  topSearches: { keyword: string; count: number }[];
  deviceBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  dailyViews: { date: string; views: number }[];
}

const DEVICE_LABELS: Record<string, string> = { desktop: "桌機", mobile: "手機", tablet: "平板", unknown: "未知" };
const SOURCE_LABELS: Record<string, string> = { web: "官網", liff: "LINE", telegram: "Telegram" };
const PATH_LABELS: Record<string, string> = {
  "/": "首頁", "/bookstore": "旅人書店", "/cultureclub": "宜蘭文化俱樂部",
  "/sense": "關於我們", "/goods-selection": "選品", "/search": "搜尋",
  "/login": "登入", "/dashboard": "會員中心", "/checkout": "結帳",
};
function labelPath(path: string) {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  if (path.startsWith("/post/")) return `📝 ${path.replace("/post/", "").slice(0, 20)}`;
  if (path.startsWith("/events/")) return `📅 ${path.replace("/events/", "").slice(0, 20)}`;
  if (path.startsWith("/product/")) return `📦 ${path.replace("/product/", "").slice(0, 20)}`;
  if (path.startsWith("/viewpoint/")) return `🔍 ${path.replace("/viewpoint/", "").slice(0, 20)}`;
  return path.slice(0, 30);
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
      <p className="text-xs mb-1" style={{ color: "var(--color-mist)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>{sub}</p>}
    </div>
  );
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-36 truncate shrink-0" style={{ color: "var(--color-ink)" }} title={label}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#f0ece6" }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: "var(--color-teal)", transition: "width 0.4s" }} />
      </div>
      <span className="text-sm w-10 text-right shrink-0" style={{ color: "var(--color-bark)" }}>{count}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => {
        if (r.status === 401) throw new Error("請先登入");
        if (r.status === 403) throw new Error("需要 L2 以上工作帳號才能查看");
        if (!r.ok) throw new Error("載入失敗");
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px 80px" }}>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--color-teal)" }}>← 回會員中心</Link>
      </div>
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, monospace" }}>— ANALYTICS —</p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>數據觀測</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>最近 30 天</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "#e8e8e8", borderTopColor: "var(--color-teal)" }} />
          <span className="text-sm" style={{ color: "var(--color-mist)" }}>載入中…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#fff5f5", border: "1px solid #fca5a5" }}>
          <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* 總覽數字 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="頁面瀏覽" value={data.pageViews} sub="30 天內" />
            <StatCard label="按讚" value={data.likes} sub="累計" />
            <StatCard label="收藏" value={data.saves} sub="累計" />
            <StatCard label="搜尋次數" value={data.searches} sub="30 天內" />
            <StatCard label="訂單數" value={data.orders.total} sub="30 天內" />
            <StatCard label="訂單金額" value={`NT$ ${data.orders.revenue.toLocaleString()}`} sub="30 天內" />
            <StatCard label="會員總數" value={data.members} />
            <StatCard label="收藏清單" value={data.wishlist ?? 0} />
          </div>

          {/* 每日瀏覽趨勢 */}
          {data.dailyViews && data.dailyViews.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>每日瀏覽趨勢</h2>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  const max = Math.max(...data.dailyViews.map(d => d.views), 1);
                  return data.dailyViews.slice(-30).map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.date}: ${d.views}`}>
                      <div className="w-full rounded-t" style={{ height: `${Math.round((d.views / max) * 100)}%`, minHeight: 2, background: "var(--color-teal)", opacity: 0.8 }} />
                      <span className="text-[9px] hidden group-hover:block absolute -bottom-5" style={{ color: "var(--color-mist)" }}>{d.date.slice(5)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 熱門頁面 */}
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>熱門頁面 Top 10</h2>
              {data.topPages.slice(0, 10).map((p, i) => (
                <MiniBar key={p.path} label={`${i + 1}. ${labelPath(p.path)}`} count={p.count} max={data.topPages[0]?.count || 1} />
              ))}
            </div>

            {/* 熱門搜尋 */}
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>熱門搜尋關鍵字</h2>
              {data.topSearches.length > 0
                ? data.topSearches.map((s, i) => (
                    <MiniBar key={s.keyword} label={`${i + 1}. ${s.keyword}`} count={s.count} max={data.topSearches[0]?.count || 1} />
                  ))
                : <p className="text-sm" style={{ color: "var(--color-mist)" }}>尚無搜尋紀錄</p>
              }
            </div>

            {/* 裝置分佈 */}
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>裝置分佈</h2>
              {Object.entries(data.deviceBreakdown).sort((a, b) => b[1] - a[1]).map(([device, count]) => {
                const total = Object.values(data.deviceBreakdown).reduce((s, v) => s + v, 0);
                return (
                  <MiniBar key={device} label={DEVICE_LABELS[device] || device} count={count} max={total} />
                );
              })}
            </div>

            {/* 來源分佈 */}
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #ede8e0" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-ink)" }}>流量來源</h2>
              {Object.entries(data.sourceBreakdown).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
                const total = Object.values(data.sourceBreakdown).reduce((s, v) => s + v, 0);
                return (
                  <MiniBar key={src} label={SOURCE_LABELS[src] || src} count={count} max={total} />
                );
              })}
              {/* 訂單來源 */}
              {Object.keys(data.orders.bySource).length > 0 && (
                <>
                  <p className="text-xs mt-4 mb-2 font-medium" style={{ color: "var(--color-mist)" }}>訂單來源</p>
                  {Object.entries(data.orders.bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                    <MiniBar key={src} label={SOURCE_LABELS[src] || src} count={count} max={data.orders.total || 1} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
