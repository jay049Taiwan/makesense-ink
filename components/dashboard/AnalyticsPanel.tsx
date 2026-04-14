"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  period: string;
  pageViews: number;
  topPages: { path: string; count: number }[];
  searches: number;
  topSearches: { keyword: string; count: number }[];
  orders: {
    total: number;
    revenue: number;
    bySource: Record<string, number>;
  };
  members: number;
  wishlist: number;
}

const SOURCE_LABELS: Record<string, string> = {
  web: "官網",
  liff: "LINE",
  telegram: "Telegram",
  preorder: "市集預購",
};

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("載入失敗");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-xl p-8"
        style={{ background: "#fff", border: "1px solid #e8e8e8" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{
              borderColor: "#e8e8e8",
              borderTopColor: "#4ECDC4",
            }}
          />
          <span className="text-sm" style={{ color: "#999" }}>
            載入分析資料中...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "#fff",
          border: "1px solid #e8e8e8",
          color: "#999",
        }}
      >
        <p className="text-sm">分析資料載入失敗：{error || "未知錯誤"}</p>
      </div>
    );
  }

  const topPagesMax = data.topPages[0]?.count || 1;
  const topSearchesMax = data.topSearches[0]?.count || 1;
  const sourceEntries = Object.entries(data.orders.bySource).sort(
    (a, b) => b[1] - a[1]
  );
  const sourceMax = sourceEntries[0]?.[1] || 1;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #e8e8e8" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{
          background: "#fafafa",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: "#333", margin: 0 }}
        >
          📈 網站營運分析
        </h3>
        <p className="text-xs mt-1" style={{ color: "#aaa" }}>
          近 30 天數據總覽
        </p>
      </div>

      <div className="p-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <AnalyticStatCard
            label="頁面瀏覽數"
            value={data.pageViews.toLocaleString()}
            color="#7a5c40"
          />
          <AnalyticStatCard
            label="搜尋次數"
            value={data.searches.toLocaleString()}
            color="#4ECDC4"
          />
          <AnalyticStatCard
            label="訂單數"
            value={data.orders.total.toLocaleString()}
            color="#e8935a"
          />
          <AnalyticStatCard
            label="會員數"
            value={data.members.toLocaleString()}
            color="#1a1a2e"
          />
        </div>

        {/* Revenue + Wishlist row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className="rounded-xl p-4"
            style={{ background: "#faf8f4", border: "1px solid #f0ebe3" }}
          >
            <p className="text-xs mb-1" style={{ color: "#999" }}>
              營收總額
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "#7a5c40", fontFamily: "var(--font-display)" }}
            >
              ${data.orders.revenue.toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ background: "#f4faf9", border: "1px solid #e0f0ee" }}
          >
            <p className="text-xs mb-1" style={{ color: "#999" }}>
              收藏清單
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "#4ECDC4", fontFamily: "var(--font-display)" }}
            >
              {data.wishlist.toLocaleString()}
              <span
                className="text-sm font-normal ml-1"
                style={{ color: "#aaa" }}
              >
                筆
              </span>
            </p>
          </div>
        </div>

        {/* Top Pages + Top Searches */}
        <div className="grid sm:grid-cols-2 gap-8 mb-8">
          {/* Top Pages */}
          <div>
            <p
              className="text-xs font-semibold mb-4"
              style={{ color: "#555" }}
            >
              熱門頁面 Top 5
            </p>
            {data.topPages.length === 0 ? (
              <p className="text-xs" style={{ color: "#ccc" }}>
                尚無資料
              </p>
            ) : (
              <div className="space-y-3">
                {data.topPages.slice(0, 5).map((page, i) => {
                  const pct = (page.count / topPagesMax) * 100;
                  return (
                    <div key={page.path}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm truncate"
                          style={{ color: "#333", maxWidth: "70%" }}
                          title={page.path}
                        >
                          <span
                            className="text-xs mr-1.5"
                            style={{ color: "#aaa" }}
                          >
                            {i + 1}.
                          </span>
                          {page.path}
                        </span>
                        <span
                          className="text-xs font-bold flex-shrink-0"
                          style={{ color: "#b89e7a" }}
                        >
                          {page.count} 次
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "#f0f0f0" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg, #b89e7a, #b89e7acc)",
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Searches */}
          <div>
            <p
              className="text-xs font-semibold mb-4"
              style={{ color: "#555" }}
            >
              熱門搜尋 Top 5
            </p>
            {data.topSearches.length === 0 ? (
              <p className="text-xs" style={{ color: "#ccc" }}>
                尚無資料
              </p>
            ) : (
              <div className="space-y-3">
                {data.topSearches.slice(0, 5).map((search, i) => {
                  const pct = (search.count / topSearchesMax) * 100;
                  return (
                    <div key={search.keyword}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm" style={{ color: "#333" }}>
                          <span
                            className="text-xs mr-1.5"
                            style={{ color: "#aaa" }}
                          >
                            {i + 1}.
                          </span>
                          {search.keyword}
                        </span>
                        <span
                          className="text-xs font-bold flex-shrink-0"
                          style={{ color: "#4ECDC4" }}
                        >
                          {search.count} 次
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "#f0f0f0" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg, #4ECDC4, #4ECDC4cc)",
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Orders by Source */}
        {sourceEntries.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold mb-4"
              style={{ color: "#555" }}
            >
              訂單來源分佈
            </p>
            <div className="space-y-3">
              {sourceEntries.map(([source, count]) => {
                const pct = (count / sourceMax) * 100;
                const label = SOURCE_LABELS[source] || source;
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: "#333" }}>
                        {label}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: "#e8935a" }}
                      >
                        {count} 筆
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "#f0f0f0" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #e8935a, #e8935acc)",
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}
    >
      <p
        className="text-3xl font-bold"
        style={{ color, fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "#999" }}>
        {label}
      </p>
    </div>
  );
}
