"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import { activityProductConfig } from "@/lib/vendor-page-config";
import { supabase } from "@/lib/supabase";
import QrScanModal from "@/components/partner/QrScanModal";

type PartnerTab = "概覽" | "項目" | "收益" | "設定";

const tabIcons: Record<PartnerTab, string> = {
  概覽: "📊", 項目: "📦", 收益: "💰", 設定: "⚙️",
};

export interface VendorProduct {
  id: string; name: string; photo: string;
  price: number | ""; stock: number | ""; note: string; active: boolean;
}

interface VendorStats {
  totalProducts: number; totalSold: number; totalRevenue: number;
  avgRating: string; totalActivities: number; totalRegistrations: number; outOfStock: number;
  reviewCount: number;
}

interface VendorActivity {
  id: string; title: string; date: string; type: string; registered: number; capacity: number;
}

interface Participation {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventType: string;
  vendorName: string;
  status: "pending" | "approved";
  createdAt: string;
}

const emptyStats: VendorStats = {
  totalProducts: 0, totalSold: 0, totalRevenue: 0, avgRating: "—",
  totalActivities: 0, totalRegistrations: 0, outOfStock: 0, reviewCount: 0,
};

// Gmail strips dots from local part — normalize before querying members table
function normalizeEmailClient(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email.toLowerCase();
  if (domain.toLowerCase() === "gmail.com") {
    return local.replace(/\./g, "").toLowerCase() + "@gmail.com";
  }
  return email.toLowerCase();
}

export default function PartnerPage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";

  const displayName = isDev ? devRole.displayName : ((session as any)?.displayName || "合作單位");
  const email = isDev ? devRole.email : (session?.user?.email || "—");
  const notionId = isDev ? null : ((session as any)?.notionId?.replace(/-/g, "") || null);

  const [activeTab, setActiveTab] = useState<PartnerTab>("概覽");
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [activities, setActivities] = useState<VendorActivity[]>([]);
  const [newsletters, setNewsletters] = useState<{ id: string; title: string; date: string; summary: string }[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [stats, setStats] = useState<VendorStats>(emptyStats);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!notionId && !isDev) return;
    (async () => {
      // ── 商品（庫存類型=商品 + 對應發行=此廠商）──
      let prodsQuery = supabase
        .from("products")
        .select("id, name, price, stock, description, images, status, publisher_notion_id")
        .like("category", "商品%")
        .order("created_at", { ascending: false });

      if (notionId) {
        prodsQuery = prodsQuery.eq("publisher_notion_id", notionId);
      } else {
        prodsQuery = prodsQuery.limit(20);
      }

      const { data: prods } = await prodsQuery;
      if (prods) {
        setProducts(prods.map(p => ({
          id: p.id,
          name: p.name,
          photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || ""; } catch { return ""; } })(),
          price: p.price ?? "",
          stock: p.stock ?? "",
          note: p.description || "",
          active: p.status === "active",
        })));
        const activeProds = prods.filter(p => p.status === "active");
        setStats(prev => ({
          ...prev,
          totalProducts: activeProds.length,
          outOfStock: prods.filter(p => p.stock === 0 && p.status === "active").length,
        }));
      }

      if (notionId) {
        // ── 合作活動（交接類型=專案協作 + 協作類別=辦理活動 + 含此廠商）──
        const { data: evts } = await supabase
          .from("events")
          .select("id, notion_id, title, event_date, theme, capacity, status")
          .contains("related_partner_ids", [notionId])
          .eq("event_category", "專案協作")
          .eq("collab_type", "辦理活動")
          .order("event_date", { ascending: false })
          .limit(50);

        if (evts) {
          setActivities(evts.map(e => ({
            id: e.notion_id || e.id,
            title: e.title,
            date: e.event_date ? new Date(e.event_date).toLocaleDateString("zh-TW") : "日期待定",
            type: e.theme || "活動",
            registered: 0,
            capacity: e.capacity || 0,
          })));
        }

        // ── 收費內容（官網備項=地方通訊 + 對應對象=此廠商）──
        const { data: arts } = await supabase
          .from("articles")
          .select("id, notion_id, title, published_at, summary")
          .contains("related_partner_ids", [notionId])
          .contains("web_tag", ["地方通訊"])
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(30);

        if (arts) {
          setNewsletters(arts.map(a => ({
            id: a.notion_id || a.id,
            title: a.title,
            date: a.published_at ? new Date(a.published_at).toLocaleDateString("zh-TW") : "—",
            summary: a.summary || "",
          })));
        }

        // ── 績效數據（partner_metrics_v VIEW，走 server API 確保只回自己的 row）──
        let metrics: any = null;
        try {
          const r = await fetch("/api/user/partner-metrics");
          if (r.ok) {
            const d = await r.json();
            metrics = d.metrics;
          }
        } catch (e) {
          console.error("[partner dashboard] metrics fetch failed", e);
        }

        if (metrics) {
          const avgR = Number(metrics.avg_rating) || 0;
          setStats(prev => ({
            ...prev,
            totalProducts: Number(metrics.product_count) || prev.totalProducts,
            outOfStock: Number(metrics.out_of_stock_count) || prev.outOfStock,
            totalRevenue: Number(metrics.total_revenue) || 0,
            totalSold: Number(metrics.conversion_count) || 0,
            totalActivities: Number(metrics.event_count) || 0,
            totalRegistrations: Number(metrics.reach_count) || 0,
            avgRating: avgR > 0 ? avgR.toFixed(1) : "—",
            reviewCount: Number(metrics.review_count) || 0,
          }));
        }
      }

      // ── 參與活動（market_applications，走 server API 反查 member + applications）──
      if (email && email !== "—") {
        let apps: any[] | null = null;
        try {
          const r = await fetch("/api/user/partner-applications");
          if (r.ok) {
            const d = await r.json();
            apps = d.applications || [];
          }
        } catch (e) {
          console.error("[partner dashboard] applications fetch failed", e);
        }

        if (apps && apps.length > 0) {
            const eventIds = (apps as any[]).map(a => a.event_id).filter(Boolean);
            let evtMap = new Map<string, any>();
            if (eventIds.length > 0) {
              const { data: appEvts } = await supabase
                .from("events")
                .select("id, title, event_date, theme")
                .in("id", eventIds);
              if (appEvts) evtMap = new Map(appEvts.map(e => [e.id, e]));
            }

            setParticipations((apps as any[]).map(app => {
              const evt = evtMap.get(app.event_id);
              return {
                id: app.id,
                eventId: app.event_id,
                eventTitle: evt?.title || "活動",
                eventDate: evt?.event_date ? new Date(evt.event_date).toLocaleDateString("zh-TW") : "",
                eventType: evt?.theme || "",
                vendorName: app.vendor_name || "",
                status: app.status as "pending" | "approved",
                createdAt: new Date(app.created_at).toLocaleDateString("zh-TW"),
              };
            }));
        }
      }
    })();
  }, [notionId, isDev, email]);

  const pageTabs = [
    { href: "/dashboard", label: "個人紀錄", exact: true },
    { href: "/dashboard/partner", label: "協作平台", exact: false },
  ];

  return (
    <div className="px-3 sm:px-0" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="rounded-xl p-4 sm:p-5 mb-4" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-1">{displayName} <span className="font-normal">您好</span></p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          <span>📧 {email}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>合作期間：2024/01 至今</span>
        </div>
      </div>

      <nav className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
        {pageTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
              style={{ color: isActive ? "#1a1a2e" : "#888", borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`, marginBottom: -2 }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mb-24">
        {activeTab === "概覽" && <VendorOverview stats={stats} onOpenScanner={() => setShowScanner(true)} />}
        {activeTab === "項目" && (
          <VendorItems
            vendorProducts={products.filter(p => p.active)}
            activities={activities}
            newsletters={newsletters}
            participations={participations}
          />
        )}
        {activeTab === "收益" && <VendorFinance stats={stats} />}
        {activeTab === "設定" && <VendorSettings notionId={notionId} />}
      </div>

      <div className="sticky bottom-0 z-40" style={{ background: "#fff", borderTop: "1px solid #e8e0d4" }}>
        <div className="flex justify-center">
          <div className="flex" style={{ maxWidth: 600, width: "100%" }}>
            {(Object.keys(tabIcons) as PartnerTab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 flex flex-col items-center py-2.5 transition-colors"
                style={{ color: activeTab === tab ? "#7a5c40" : "#999", fontWeight: activeTab === tab ? 700 : 400, background: "transparent", border: "none", cursor: "pointer" }}>
                <span className="text-lg">{tabIcons[tab]}</span>
                <span className="text-xs mt-0.5">{tab}</span>
                {activeTab === tab && <span style={{ display: "block", width: 16, height: 2, background: "#7a5c40", borderRadius: 1, marginTop: 2 }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showScanner && <QrScanModal onClose={() => setShowScanner(false)} notionId={notionId} />}
    </div>
  );
}

// ════════════════════════════════════════════
// 概覽
// ════════════════════════════════════════════
function VendorOverview({ stats, onOpenScanner }: { stats: VendorStats; onOpenScanner: () => void }) {
  const avgPrice = stats.totalSold > 0 ? Math.round(stats.totalRevenue / stats.totalSold) : 0;
  const narrativeParts: string[] = [];
  if (stats.totalRegistrations > 0) narrativeParts.push(`你的商品與活動被 ${stats.totalRegistrations.toLocaleString()} 人看過`);
  if (stats.totalSold > 0) narrativeParts.push(`帶來 ${stats.totalSold} 件成交／次報名`);
  if (avgPrice > 0) narrativeParts.push(`平均客單 NT$${avgPrice.toLocaleString()}`);
  if (stats.totalRevenue > 0) narrativeParts.push(`累計營收 NT$${stats.totalRevenue.toLocaleString()}`);
  const narrative = narrativeParts.length > 0 ? narrativeParts.join("，") + "。" : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: "#aaa" }}>本期數據概覽</p>
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1.5 px-3 h-10 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}>
          📷 掃碼簽到
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="上架商品" value={stats.totalProducts} unit="件" color="#7a5c40" />
        <StatCard label="有效參與" value={stats.totalSold} unit="件／次" color="#4ECDC4" />
        <StatCard label="累計營收" value={`NT$${stats.totalRevenue.toLocaleString()}`} unit="" color="#e8935a" />
        <StatCard label="評價評分" value={stats.avgRating} unit={stats.reviewCount > 0 ? `(${stats.reviewCount}則)` : ""} color="#f5a623" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="合作活動" value={stats.totalActivities} unit="場" color="#1a1a2e" />
        <StatCard label="曝光觸及" value={stats.totalRegistrations} unit="人次" color="#4CAF50" />
        <StatCard label="缺貨商品" value={stats.outOfStock} unit="項" color="#e53e3e" />
      </div>

      {narrative ? (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm" style={{ background: "rgba(78,205,196,0.07)", border: "1px solid rgba(78,205,196,0.2)", color: "#1a1a2e", lineHeight: 1.7 }}>
          📊 {narrative}
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm" style={{ background: "#faf8f4", border: "1px dashed #c8b89a", color: "#aaa" }}>
          資料累積中，成交或瀏覽紀錄出現後即會顯示摘要。
        </div>
      )}

      <PartnerReviews />
    </div>
  );
}

// ════════════════════════════════════════════
// 項目 — 共用小元件
// ════════════════════════════════════════════
const TODAY = new Date("2026-04-13");

function isExpired(dateStr: string) {
  const [y, m, d] = dateStr.replace(/\//g, "-").split("-").map(Number);
  return new Date(y, m - 1, d) < TODAY;
}

/** 每筆資料下方的統計微字列（觸及率…售價，商品加庫存）*/
function ItemStatsRow({ price, stock, isProduct }: { price?: number | ""; stock?: number | ""; isProduct?: boolean }) {
  const fmtPrice = price !== "" && price !== undefined ? `NT$${Number(price).toLocaleString()}` : "—";
  const fmtStock = stock !== "" && stock !== undefined ? String(stock) : "—";

  const stats = [
    { label: "觸及率", value: "—" },
    { label: "開啟率", value: "—" },
    { label: "購買率", value: "—" },
    { label: "售出件數", value: "—" },
    { label: "平均評分", value: "—" },
    { label: "售價", value: fmtPrice },
    ...(isProduct ? [{ label: "庫存", value: fmtStock }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
      {stats.map(s => (
        <span key={s.label} style={{ fontSize: 10, color: "#888" }}>
          {s.label}:{" "}
          <span style={{ color: s.value === "—" ? "#aaa" : "#444", fontWeight: s.value !== "—" ? 600 : 400 }}>
            {s.value}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Section 容器：empty=true 時整個不渲染 */
function ItemSection({ emoji, title, subtitle, headerRight, empty, children }: {
  emoji: string;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <div className="px-5 py-3 flex items-start justify-between gap-3" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>{emoji} {title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Info key/value pair inside modal */
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "#aaa" }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: "#333" }}>{value}</p>
    </div>
  );
}

// ════════════════════════════════════════════
// 詳情 Modal
// ════════════════════════════════════════════
type ModalItemType = "activity" | "participation" | "newsletter" | "product";
type ModalItem = { type: ModalItemType; data: any };

function ItemDetailModal({ item, onClose, vendorProducts, selected, setSelected, generated, setGenerated }: {
  item: ModalItem;
  onClose: () => void;
  vendorProducts: VendorProduct[];
  selected: Record<string, string[]>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  generated: Record<string, boolean>;
  setGenerated: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const { type, data } = item;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const activityId = data.id;
  const isGen = !!generated[activityId];
  const selectedIds = selected[activityId] || [];
  const expired = type === "activity" ? isExpired(data.date) : false;

  function toggleProduct(productId: string) {
    setSelected(prev => {
      const cur = prev[activityId] || [];
      return { ...prev, [activityId]: cur.includes(productId) ? cur.filter(id => id !== productId) : [...cur, productId] };
    });
  }

  const title =
    type === "activity" ? data.title :
    type === "participation" ? data.eventTitle :
    type === "newsletter" ? data.title :
    data.name;

  const tagLabel =
    type === "activity" ? "合作活動" :
    type === "participation" ? (data.status === "pending" ? "受理中" : "已通過") :
    type === "newsletter" ? "收費內容" :
    "上架商品";

  const tagStyle: React.CSSProperties =
    type === "activity" ? { background: "#1a1a2e", color: "#fff" } :
    type === "participation" ? (data.status === "pending"
      ? { background: "#fff3cd", color: "#856404" }
      : { background: "rgba(78,205,196,0.15)", color: "#3aa89f" }) :
    type === "newsletter" ? { background: "#f0f0f0", color: "#666" } :
    { background: "#7a5c40", color: "#fff" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}>
      <div className="w-full sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{ maxWidth: 520, background: "#fff", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle bar (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, background: "#e0e0e0", borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={tagStyle}>{tagLabel}</span>
              {type === "activity" && expired && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f5f5f5", color: "#aaa" }}>已結束</span>
              )}
            </div>
            <p className="text-base font-semibold leading-snug" style={{ color: "#1a1a2e" }}>{title}</p>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#bbb", flexShrink: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Basic info grid */}
          <div className="grid grid-cols-2 gap-4">
            {type === "activity" && (
              <>
                <InfoCell label="活動日期" value={data.date} />
                <InfoCell label="活動形式" value={data.type} />
                <InfoCell label="報名人數" value={`${data.registered} / ${data.capacity} 人`} />
              </>
            )}
            {type === "participation" && (
              <>
                <InfoCell label="活動日期" value={data.eventDate || "日期待定"} />
                <InfoCell label="活動形式" value={data.eventType || "—"} />
                <InfoCell label="申請狀態" value={data.status === "pending" ? "受理中" : "已通過"} />
                <InfoCell label="申請時間" value={data.createdAt} />
              </>
            )}
            {type === "newsletter" && (
              <>
                <InfoCell label="發佈日期" value={data.date} />
                {data.summary && <div className="col-span-2"><InfoCell label="摘要" value={data.summary} /></div>}
              </>
            )}
            {type === "product" && (
              <>
                <InfoCell label="售價" value={data.price !== "" ? `NT$${Number(data.price).toLocaleString()}` : "—"} />
                <InfoCell label="庫存" value={data.stock !== "" ? String(data.stock) : "—"} />
              </>
            )}
          </div>

          {/* 合作活動：預購設定 */}
          {type === "activity" && !expired && (
            <div className="pt-3" style={{ borderTop: "1px solid #f0f0f0" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>🛒 預購商品設定</p>
              {isGen ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold" style={{ color: "#3aa89f" }}>✅ 預購頁面已就緒</span>
                  </div>
                  <div className="rounded-lg p-3 mb-3" style={{ background: "#f0faf9", border: "1px solid #b2e8e4" }}>
                    <span className="text-xs break-all" style={{ color: "#1a1a2e", fontFamily: "monospace" }}>
                      {baseUrl}/buy/{activityId}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(`${baseUrl}/buy/${activityId}`)}
                      className="flex-1 h-10 rounded-lg text-xs font-semibold"
                      style={{ border: "1px solid #4ECDC4", background: "#fff", color: "#3aa89f", cursor: "pointer" }}>
                      複製連結
                    </button>
                    <a href={`${baseUrl}/buy/${activityId}`} target="_blank" rel="noreferrer"
                      className="flex-1 h-10 rounded-lg text-xs font-semibold flex items-center justify-center"
                      style={{ background: "#7a5c40", color: "#fff", textDecoration: "none" }}>
                      開啟預覽 ↗
                    </a>
                    <button onClick={() => setGenerated(prev => ({ ...prev, [activityId]: false }))}
                      className="h-10 px-3 rounded-lg text-xs"
                      style={{ border: "1px solid #eee", background: "#fff", color: "#aaa", cursor: "pointer" }}>
                      重設
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs mb-2" style={{ color: "#aaa" }}>
                    選擇要加入此活動預購的商品（可不選，純報名頁）：
                  </p>
                  {vendorProducts.length === 0 ? (
                    <p className="text-xs py-3" style={{ color: "#aaa" }}>尚無上架商品</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {vendorProducts.map(p => {
                        const sel = selectedIds.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                            style={{ background: sel ? "rgba(122,92,64,0.06)" : "#fafafa", border: `1px solid ${sel ? "#c8b89a" : "#eee"}` }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleProduct(p.id)}
                              style={{ accentColor: "#7a5c40", width: 16, height: 16 }} />
                            <span className="flex-1 text-sm" style={{ color: "#333" }}>{p.name}</span>
                            <span className="text-xs font-semibold" style={{ color: "#e8935a" }}>
                              NT$ {Number(p.price).toLocaleString()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      activityProductConfig[activityId] = selectedIds;
                      setGenerated(prev => ({ ...prev, [activityId]: true }));
                    }}
                    className="w-full h-10 rounded-lg text-xs font-semibold"
                    style={{ background: "#7a5c40", color: "#fff", border: "none", cursor: "pointer" }}>
                    產生預購頁面 →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 其他類型：功能開發中 placeholder */}
          {(type === "newsletter" || type === "product" || type === "participation") && (
            <div className="rounded-lg p-4 text-center" style={{ background: "#fafafa", border: "1px dashed #e8e8e8" }}>
              <p className="text-xs" style={{ color: "#ccc" }}>詳細功能開發中</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 項目（4 區塊 + 空則隱藏 + 統計列 + 點擊 Modal）
// ════════════════════════════════════════════
function VendorItems({ vendorProducts, activities, newsletters, participations }: {
  vendorProducts: VendorProduct[];
  activities: VendorActivity[];
  newsletters: { id: string; title: string; date: string; summary: string }[];
  participations: Participation[];
}) {
  const [modal, setModal] = useState<ModalItem | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [generated, setGenerated] = useState<Record<string, boolean>>({});

  const rowStyle = (i: number, len: number): React.CSSProperties => ({
    borderBottom: i < len - 1 ? "1px solid #f5f5f5" : "none",
    cursor: "pointer",
  });

  return (
    <div>
      {/* ── 合作活動 ── */}
      <ItemSection
        emoji="🎪" title="合作活動"
        subtitle="主辦單位指定加入的活動"
        empty={activities.length === 0}>
        {activities.map((a, i) => {
          const expired = isExpired(a.date);
          const isGen = !!generated[a.id];
          return (
            <div key={a.id}
              className="px-5 py-3 hover:bg-gray-50 transition-colors"
              style={{ ...rowStyle(i, activities.length), opacity: expired ? 0.6 : 1 }}
              onClick={() => setModal({ type: "activity", data: a })}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium" style={{ color: "#333" }}>{a.title}</span>
                {expired && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f5f5f5", color: "#aaa" }}>已結束</span>
                )}
                {isGen && !expired && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(78,205,196,0.15)", color: "#3aa89f" }}>✓ 預購頁已產生</span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#999" }}>
                {a.date} · {a.type} · {a.registered}/{a.capacity} 人
              </p>
              <ItemStatsRow />
            </div>
          );
        })}
      </ItemSection>

      {/* ── 參與活動 ── */}
      <ItemSection
        emoji="🙋" title="參與活動"
        subtitle="你報名申請的活動（已拒絕不顯示）"
        empty={participations.length === 0}>
        {participations.map((p, i) => (
          <div key={p.id}
            className="px-5 py-3 hover:bg-gray-50 transition-colors"
            style={rowStyle(i, participations.length)}
            onClick={() => setModal({ type: "participation", data: p })}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: "#333" }}>{p.eventTitle}</span>
              {p.status === "pending" && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fff3cd", color: "#856404" }}>受理中</span>
              )}
              {p.status === "approved" && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(78,205,196,0.15)", color: "#3aa89f" }}>已通過</span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#999" }}>
              {p.eventDate || "日期待定"}
              {p.eventType ? ` · ${p.eventType}` : ""}
              {" · 申請於 "}{p.createdAt}
            </p>
            <ItemStatsRow />
          </div>
        ))}
      </ItemSection>

      {/* ── 收費內容 ── */}
      <ItemSection
        emoji="📰" title="收費內容"
        subtitle="標記為地方通訊的已發佈文章"
        empty={newsletters.length === 0}>
        {newsletters.map((a, i) => (
          <div key={a.id}
            className="px-5 py-3 hover:bg-gray-50 transition-colors"
            style={rowStyle(i, newsletters.length)}
            onClick={() => setModal({ type: "newsletter", data: a })}>
            <p className="text-sm font-medium" style={{ color: "#333" }}>{a.title}</p>
            {a.summary && <p className="text-xs mt-0.5" style={{ color: "#888" }}>{a.summary}</p>}
            <p className="text-xs mt-0.5" style={{ color: "#999" }}>{a.date}</p>
            <ItemStatsRow />
          </div>
        ))}
      </ItemSection>

      {/* ── 上架商品 ── */}
      <ItemSection
        emoji="📚" title="上架商品"
        empty={vendorProducts.length === 0}
        headerRight={
          <a href="https://lin.ee/964ervay" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{ background: "#06C755", color: "#fff", textDecoration: "none" }}>
            💬 聯繫新增／修改
          </a>
        }>
        {/* Mobile card list */}
        <div className="sm:hidden">
          {vendorProducts.map((p, i) => {
            const stock = typeof p.stock === "number" ? p.stock : 0;
            return (
              <div key={p.id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors"
                style={rowStyle(i, vendorProducts.length)}
                onClick={() => setModal({ type: "product", data: p })}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1" style={{ color: "#333" }}>{p.name}</p>
                  <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: stock === 0 ? "#fde8e8" : stock <= 5 ? "#fff3cd" : "#d4edda", color: stock === 0 ? "#e53e3e" : stock <= 5 ? "#856404" : "#155724" }}>
                    {stock === 0 ? "缺貨" : stock <= 5 ? "庫存低" : "上架中"}
                  </span>
                </div>
                <ItemStatsRow price={p.price} stock={p.stock} isProduct />
              </div>
            );
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                {["商品名稱", "售價", "庫存", "觸及率", "開啟率", "購買率", "售出件數", "平均評分", "狀態"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorProducts.map((p, i) => {
                const stock = typeof p.stock === "number" ? p.stock : 0;
                return (
                  <tr key={p.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < vendorProducts.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer" }}
                    onClick={() => setModal({ type: "product", data: p })}>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "#666" }}>
                      NT${p.price !== "" ? Number(p.price).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14 }}>
                      <span style={{ color: stock === 0 ? "#e53e3e" : stock <= 5 ? "#e8935a" : "#333", fontWeight: stock <= 5 ? 700 : 400 }}>{stock}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>—</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>—</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>—</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>—</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>—</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{ background: stock === 0 ? "#fde8e8" : stock <= 5 ? "#fff3cd" : "#d4edda", color: stock === 0 ? "#e53e3e" : stock <= 5 ? "#856404" : "#155724" }}>
                        {stock === 0 ? "缺貨" : stock <= 5 ? "庫存低" : "上架中"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ItemSection>

      {/* Detail Modal */}
      {modal && (
        <ItemDetailModal
          item={modal}
          onClose={() => setModal(null)}
          vendorProducts={vendorProducts}
          selected={selected}
          setSelected={setSelected}
          generated={generated}
          setGenerated={setGenerated}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 收益
// ════════════════════════════════════════════
function VendorFinance({ stats }: { stats: VendorStats }) {
  const monthly = [
    { month: "2026-04", revenue: stats.totalRevenue, qty: stats.totalSold, status: "待結算" },
    { month: "2026-03", revenue: 4500, qty: 12, status: "已入帳" },
    { month: "2026-02", revenue: 3200, qty: 8, status: "已入帳" },
    { month: "2026-01", revenue: 5800, qty: 15, status: "已入帳" },
  ];
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-5" style={{ background: "#1a1a2e", color: "#fff" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>累計總營收</p>
          <p className="text-2xl font-bold mt-1">NT$ {(stats.totalRevenue + 13500).toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
          <p className="text-xs" style={{ color: "#888" }}>本月待結算</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#e8935a" }}>NT$ {stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
          <p className="text-xs" style={{ color: "#888" }}>帳戶餘額</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#4CAF50" }}>NT$ 13,500</p>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-5 py-3" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📊 月報表</h3>
        </div>
        {/* Mobile */}
        <div className="sm:hidden">
          {monthly.map(m => (
            <div key={m.month} className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid #f5f5f5" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#333" }}>{m.month}</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>NT$ {m.revenue.toLocaleString()}・{m.qty} 件</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: m.status === "已入帳" ? "#d4edda" : "#fff3cd", color: m.status === "已入帳" ? "#155724" : "#856404" }}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #eee" }}>
              {["月份", "營收", "銷售量", "狀態"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {monthly.map(m => (
                <tr key={m.month} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600 }}>{m.month}</td>
                  <td style={{ padding: "12px 14px", fontSize: 14 }}>NT$ {m.revenue.toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", fontSize: 14, color: "#666" }}>{m.qty} 件</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: m.status === "已入帳" ? "#d4edda" : "#fff3cd", color: m.status === "已入帳" ? "#155724" : "#856404" }}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 設定
// ════════════════════════════════════════════
function VendorSettings({ notionId }: { notionId: string | null }) {
  const [info, setInfo] = useState<{
    name: string; contactPerson: string | null; email: string | null;
    phone: string | null; address: string | null; since: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!notionId) { setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch("/api/user/partner-info");
        if (r.ok) {
          const { partner } = await r.json();
          if (partner) {
            setInfo({
              name: partner.name,
              contactPerson: partner.contact?.contactPerson || null,
              email: partner.contact?.email || null,
              phone: partner.contact?.phone || null,
              address: partner.contact?.address || null,
              since: partner.created_at
                ? new Date(partner.created_at).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })
                : null,
            });
          }
        }
      } catch (e) {
        console.error("[partner dashboard] fetch partner-info failed", e);
      }
      setLoading(false);
    })();
  }, [notionId]);

  const rows = info ? [
    ["單位名稱", info.name],
    ["聯絡人", info.contactPerson || "—"],
    ["Email", info.email || "—"],
    ["電話", info.phone || "—"],
    ["合作起始", info.since || "—"],
    ["地址", info.address || "—"],
  ] : [];

  return (
    <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: "#333" }}>單位資料</h3>
      {loading && <p className="text-sm" style={{ color: "#aaa" }}>載入中…</p>}
      {!loading && !info && (
        <p className="text-sm" style={{ color: "#aaa" }}>
          {notionId ? "找不到單位資料，請確認 Notion DB08 已同步。" : "開發模式：無法讀取廠商資料。"}
        </p>
      )}
      {!loading && info && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map(([l, v]) => (
            <div key={l}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#888" }}>{l}</p>
              <p className="text-sm break-all" style={{ color: "#333" }}>{v}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid #f0f0f0" }}>
        <p className="text-xs" style={{ color: "#aaa" }}>
          如需修改單位資料，請透過{" "}
          <a href="https://lin.ee/964ervay" target="_blank" rel="noreferrer" style={{ color: "#06C755", fontWeight: 600 }}>LINE 官方帳號</a>{" "}
          或{" "}
          <a href="mailto:hello@makesense.ink" style={{ color: "#7a5c40", fontWeight: 600 }}>hello@makesense.ink</a>{" "}
          聯繫管理員。
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 近期顧客評價
// ════════════════════════════════════════════
function PartnerReviews() {
  const [reviews, setReviews] = useState<{ id: string; name: string; comment: string; rating: number; date: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, member_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        setReviews(data.map(r => ({
          id: r.id,
          name: "顧客",
          comment: r.comment || "",
          rating: r.rating,
          date: new Date(r.created_at).toLocaleDateString("zh-TW"),
        })));
      }
    })();
  }, []);

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <p className="text-sm" style={{ color: "#aaa" }}>尚無顧客評價</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <div className="px-5 py-3" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
        <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📝 近期顧客評價</h3>
      </div>
      {reviews.map(r => (
        <div key={r.id} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "#333" }}>{r.name}</p>
            {r.comment && <p className="text-xs mt-0.5" style={{ color: "#888" }}>「{r.comment}」・{r.date}</p>}
          </div>
          <span className="flex gap-0.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} style={{ color: i <= r.rating ? "#f5a623" : "#ddd", fontSize: 14 }}>★</span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "#fff", border: "1px solid #f0f0f0" }}>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}<span className="text-sm font-normal ml-0.5" style={{ color: "#aaa" }}>{unit}</span>
      </p>
      <p className="text-xs mt-1" style={{ color: "#999" }}>{label}</p>
    </div>
  );
}
