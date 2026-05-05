"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/providers/LiffProvider";
import { getLiffAccessToken } from "@/lib/liff";

interface RecentItem {
  type: "order" | "registration" | "review";
  title: string;
  qty?: number;
  amount?: number;
  rating?: number;
  comment?: string;
  at: string;
}

interface Dashboard {
  partner: { id: string; name: string } | null;
  summary?: {
    mtdRevenue: number;
    mtdOrders: number;
    avgRating: number | null;
    pendingCheckin: number;
  };
  recent?: RecentItem[];
  productCount?: number;
  eventCount?: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
}

function ActivityIcon({ type }: { type: RecentItem["type"] }) {
  const icons = {
    order: { emoji: "📦", bg: "#fff3e6", color: "#b87333" },
    registration: { emoji: "🎪", bg: "#e6f7f5", color: "#0e9889" },
    review: { emoji: "⭐", bg: "#fff8de", color: "#c89000" },
  };
  const cfg = icons[type];
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
      style={{ background: cfg.bg }}
    >
      {cfg.emoji}
    </span>
  );
}

export default function LiffPartnerDashboardPage() {
  const { liffUser } = useLiff();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = getLiffAccessToken();
      if (!token) {
        setError("請從 LINE 開啟此頁面");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/liff/partner/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        const j = await res.json();
        if (!j.ok) {
          setError(j.message || "載入失敗");
        } else if (!j.partner) {
          setError("您尚未綁定為合作廠商");
        } else {
          setData(j);
        }
      } catch (e: any) {
        setError(e.message || "網路錯誤");
      } finally {
        setLoading(false);
      }
    })();
  }, [liffUser]);

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-24 space-y-3">
        <div className="h-20 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-12 text-center" style={{ minHeight: "100vh" }}>
        <p className="text-base font-semibold" style={{ color: "#2d2a26" }}>
          {error}
        </p>
        <p className="text-xs mt-2" style={{ color: "#999" }}>
          如有疑問請聯繫旅人書店
        </p>
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary!;

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      {/* 名片 */}
      <div className="px-4 pt-5 pb-5" style={{ background: "linear-gradient(135deg, #7a5c40 0%, #b89e7a 100%)" }}>
        <p className="text-xs text-white/80">合作廠商</p>
        <h1 className="text-xl font-semibold text-white mt-0.5">{data.partner?.name}</h1>
        <p className="text-xs text-white/80 mt-2">
          名下商品 {data.productCount ?? 0} 件 · 活動 {data.eventCount ?? 0} 場
        </p>
      </div>

      {/* 4 張頂卡 */}
      <div className="grid grid-cols-2 gap-2 px-4 -mt-3">
        <Card label="本月營收" value={`$${s.mtdRevenue.toLocaleString()}`} color="#b5522a" />
        <Card label="本月訂單" value={s.mtdOrders.toString()} color="#2d2a26" />
        <Card
          label="平均評價"
          value={s.avgRating != null ? `★ ${s.avgRating}` : "—"}
          color="#c89000"
        />
        <Card
          label="待簽到"
          value={s.pendingCheckin.toString()}
          color={s.pendingCheckin > 0 ? "#0e9889" : "#999"}
          highlight={s.pendingCheckin > 0}
        />
      </div>

      {/* 最近動態 */}
      <div className="px-4 mt-5">
        <h2 className="text-sm font-semibold mb-2" style={{ color: "#2d2a26" }}>
          最近動態
        </h2>
        {data.recent && data.recent.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            {data.recent.map((it, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3"
                style={{ borderTop: i > 0 ? "1px solid #f0ebe4" : undefined }}
              >
                <ActivityIcon type={it.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1" style={{ color: "#2d2a26" }}>
                    {it.title}
                  </p>
                  {it.type === "review" ? (
                    <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                      <span style={{ color: "#c89000" }}>{"★".repeat(it.rating || 0)}</span>
                      {it.comment && <span> · {it.comment}</span>}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                      {it.type === "registration" ? "新報名" : "新訂單"} · ×{it.qty} · ${it.amount?.toLocaleString()}
                    </p>
                  )}
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "#999" }}>
                  {timeAgo(it.at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-5 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            <p className="text-sm" style={{ color: "#999" }}>還沒有銷售紀錄</p>
          </div>
        )}
      </div>

      {/* 入口 */}
      <div className="px-4 mt-5 space-y-2">
        <NavRow href="/liff/partner/products" icon="📦" label="我的商品" hint="即時庫存、30 天銷售" />
        <NavRow href="/liff/partner/events" icon="🎪" label="我的活動" hint="活動清單、報名進度" />
        <NavRow href="/liff/partner/scan" icon="📷" label="簽到掃碼" hint="活動現場 QR 掃描" />
        <NavRow href="/dashboard/partner?liff_mode=true" icon="📊" label="完整後台" hint="桌面版的所有功能（金流、提案、設定）" />
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "#fff",
        border: highlight ? "2px solid #4ECDC4" : "1px solid #ece8e1",
      }}
    >
      <p className="text-[11px]" style={{ color: "#999" }}>
        {label}
      </p>
      <p className="text-xl font-bold mt-0.5" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
  hint,
  disabled,
}: {
  href: string;
  icon: string;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fff", border: "1px solid #ece8e1", opacity: disabled ? 0.5 : 1 }}>
      <span className="text-lg w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f0ebe4" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "#2d2a26" }}>
          {label} {disabled && <span className="text-[10px]" style={{ color: "#999" }}>（製作中）</span>}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "#999" }}>
          {hint}
        </p>
      </div>
      <span className="text-sm" style={{ color: "#ccc" }}>›</span>
    </div>
  );
  if (disabled) return <div>{inner}</div>;
  return <a href={href}>{inner}</a>;
}
