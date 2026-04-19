"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import { activityProductConfig } from "@/lib/vendor-page-config";
import { supabase } from "@/lib/supabase";
import QrScanModal from "@/components/partner/QrScanModal";

type PartnerTab = "概覽" | "資訊" | "項目" | "金流" | "設定";

const tabIcons: Record<PartnerTab, string> = {
  概覽: "📊", 資訊: "🏪", 項目: "📦", 金流: "💰", 設定: "⚙️",
};

export interface VendorProduct {
  id: string; name: string; photo: string;
  price: number | ""; stock: number | ""; note: string; active: boolean;
}

interface VendorStats {
  totalProducts: number; totalSold: number; totalRevenue: number;
  avgRating: string; totalActivities: number; totalRegistrations: number; outOfStock: number;
}

const emptyStats: VendorStats = { totalProducts: 0, totalSold: 0, totalRevenue: 0, avgRating: "—", totalActivities: 0, totalRegistrations: 0, outOfStock: 0 };

export default function PartnerPage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";

  const displayName = isDev ? devRole.displayName : ((session as any)?.displayName || "合作單位");
  const email = isDev ? devRole.email : (session?.user?.email || "—");

  const [activeTab, setActiveTab] = useState<PartnerTab>("概覽");
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [stats, setStats] = useState<VendorStats>(emptyStats);

  // Load products and stats from Supabase
  useState(() => {
    (async () => {
      // Find partner by email
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("contact->>email" as any, email)
        .maybeSingle();

      if (!partner?.id) return;

      // Fetch products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, stock, description, images, status")
        .eq("publisher_id", partner.id)
        .order("created_at", { ascending: false });

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

      // Fetch partner performance stats
      const { data: perf } = await supabase
        .from("partner_performance")
        .select("revenue, attendance, rating")
        .eq("partner_id", partner.id);

      if (perf && perf.length > 0) {
        const totalRev = perf.reduce((s, r) => s + (r.revenue || 0), 0);
        const totalAtt = perf.reduce((s, r) => s + (r.attendance || 0), 0);
        const ratings = perf.filter(r => r.rating).map(r => r.rating!);
        const avg = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : "—";
        setStats(prev => ({
          ...prev,
          totalRevenue: totalRev,
          totalRegistrations: totalAtt,
          avgRating: avg,
          totalActivities: perf.length,
          totalSold: totalAtt,
        }));
      }
    })();
  });

  const pageTabs = [
    { href: "/dashboard", label: "個人紀錄", exact: true },
    { href: "/dashboard/partner", label: "協作平台", exact: false },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="rounded-xl p-5 mb-4" style={{ background: "#1a1a2e", color: "#fff" }}>
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
        {activeTab === "概覽" && <VendorOverview stats={stats} />}
        {activeTab === "資訊" && <VendorInfo products={products} setProducts={setProducts} />}
        {activeTab === "項目" && <VendorItems vendorProducts={products.filter(p => p.active)} />}
        {activeTab === "金流" && <VendorFinance stats={stats} />}
        {activeTab === "設定" && <VendorSettings />}
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
    </div>
  );
}

// ════════════════════════════════════════════
// 概覽
// ════════════════════════════════════════════
function VendorOverview({ stats }: { stats: VendorStats }) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div>
      {/* 統計標題列 + 掃碼按鈕 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: "#aaa" }}>本期數據概覽</p>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#1a1a2e", color: "#fff", border: "none", cursor: "pointer" }}
        >
          📷 掃碼簽到
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="上架商品" value={stats.totalProducts} unit="件" color="#7a5c40" />
        <StatCard label="總銷售量" value={stats.totalSold} unit="件" color="#4ECDC4" />
        <StatCard label="總營收" value={`NT$${stats.totalRevenue.toLocaleString()}`} unit="" color="#e8935a" />
        <StatCard label="平均評分" value={stats.avgRating} unit="" color="#f5a623" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="活動數" value={stats.totalActivities} unit="場" color="#1a1a2e" />
        <StatCard label="總報名人數" value={stats.totalRegistrations} unit="人" color="#4CAF50" />
        <StatCard label="缺貨商品" value={stats.outOfStock} unit="項" color="#e53e3e" />
      </div>
      <PartnerReviews />

      {showScanner && <QrScanModal onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// ════════════════════════════════════════════
// 資訊 — 商品自助上架
// ════════════════════════════════════════════
const EMPTY_FORM: Omit<VendorProduct, "id" | "active"> = { name: "", photo: "", price: "", stock: "", note: "" };

function VendorInfo({ products, setProducts }: { products: VendorProduct[]; setProducts: React.Dispatch<React.SetStateAction<VendorProduct[]>> }) {
  const [modal, setModal] = useState<{ open: boolean; editing: VendorProduct | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Omit<VendorProduct, "id" | "active">>(EMPTY_FORM);

  const active = products.filter(p => p.active);
  const inactive = products.filter(p => !p.active);

  function openAdd() { setForm(EMPTY_FORM); setModal({ open: true, editing: null }); }
  function openEdit(p: VendorProduct) {
    setForm({ name: p.name, photo: p.photo, price: p.price, stock: p.stock, note: p.note });
    setModal({ open: true, editing: p });
  }
  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) {
      setProducts(prev => prev.map(p => p.id === modal.editing!.id ? { ...p, ...form } : p));
    } else {
      setProducts(prev => [...prev, { id: `vp${Date.now()}`, ...form, active: true }]);
    }
    setModal({ open: false, editing: null });
  }
  function toggleActive(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>商品資訊</h2>
          <p className="text-xs mt-0.5" style={{ color: "#999" }}>在此管理上架商品，資料將顯示於商家頁面與市集預購系統</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "#7a5c40", color: "#fff", border: "none", cursor: "pointer" }}>
          ＋ 新增商品
        </button>
      </div>
      {active.length === 0 ? (
        <div className="rounded-xl py-12 text-center mb-6" style={{ background: "#faf8f4", border: "1px dashed #c8b89a" }}>
          <p className="text-2xl mb-2">🏪</p>
          <p className="text-sm font-medium" style={{ color: "#7a5c40" }}>尚未新增任何商品</p>
          <p className="text-xs mt-1" style={{ color: "#aaa" }}>點「新增商品」開始上架，30 秒完成一筆</p>
        </div>
      ) : (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {active.map(p => <ProductCard key={p.id} product={p} onEdit={() => openEdit(p)} onToggle={() => toggleActive(p.id)} />)}
        </div>
      )}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#aaa" }}>已下架（{inactive.length} 項）</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {inactive.map(p => <ProductCard key={p.id} product={p} onEdit={() => openEdit(p)} onToggle={() => toggleActive(p.id)} />)}
          </div>
        </div>
      )}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal({ open: false, editing: null }); }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6" style={{ background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: "#1a1a2e" }}>{modal.editing ? "編輯商品" : "新增商品"}</h3>
            <div className="space-y-3">
              <FormField label="商品名稱 *">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例：金棗果醬 100g" className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none" style={{ border: "1px solid #ddd" }} />
              </FormField>
              <FormField label="價格（NT$）">
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="0" className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none" style={{ border: "1px solid #ddd" }} />
              </FormField>
              <FormField label="庫存數量">
                <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="0" className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none" style={{ border: "1px solid #ddd" }} />
              </FormField>
              <FormField label="照片網址（選填）">
                <input value={form.photo} onChange={e => setForm({ ...form, photo: e.target.value })}
                  placeholder="https://..." className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none" style={{ border: "1px solid #ddd" }} />
                <p className="text-xs mt-1" style={{ color: "#aaa" }}>照片上傳功能開發中，目前支援貼網址</p>
              </FormField>
              <FormField label="備註 / 簡介">
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="商品描述、材質、保存方式等..." rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none" style={{ border: "1px solid #ddd" }} />
              </FormField>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal({ open: false, editing: null })}
                className="flex-1 h-10 rounded-lg text-sm font-medium"
                style={{ border: "1px solid #ddd", background: "#fff", color: "#888", cursor: "pointer" }}>取消</button>
              <button onClick={save} disabled={!form.name.trim()}
                className="flex-1 h-10 rounded-lg text-sm font-semibold"
                style={{ background: form.name.trim() ? "#7a5c40" : "#ccc", color: "#fff", border: "none", cursor: form.name.trim() ? "pointer" : "default" }}>
                {modal.editing ? "儲存變更" : "新增上架"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p, onEdit, onToggle }: { product: VendorProduct; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: p.active ? "#fff" : "#fafafa", border: `1px solid ${p.active ? "#e8e0d4" : "#eee"}`, opacity: p.active ? 1 : 0.6 }}>
      {p.photo && <img src={p.photo} alt={p.name} className="w-full h-32 object-cover rounded-lg mb-1" />}
      <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>{p.name}</p>
      <div className="flex items-center gap-3 text-xs" style={{ color: "#888" }}>
        {p.price !== "" && <span style={{ color: "#e8935a", fontWeight: 600 }}>NT$ {Number(p.price).toLocaleString()}</span>}
        {p.stock !== "" && (
          <span style={{ color: Number(p.stock) === 0 ? "#e53e3e" : Number(p.stock) <= 5 ? "#C4864A" : "#666" }}>
            庫存 {Number(p.stock) === 0 ? "缺貨" : `${p.stock} 件`}
          </span>
        )}
      </div>
      {p.note && <p className="text-xs" style={{ color: "#999" }}>{p.note}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onEdit} className="flex-1 h-8 rounded-lg text-xs font-medium"
          style={{ border: "1px solid #c8b89a", background: "#fff", color: "#7a5c40", cursor: "pointer" }}>編輯</button>
        <button onClick={onToggle} className="flex-1 h-8 rounded-lg text-xs font-medium"
          style={{ border: "none", background: p.active ? "#fdf0f0" : "rgba(78,205,196,0.1)", color: p.active ? "#B85C5C" : "#3aa89f", cursor: "pointer" }}>
          {p.active ? "下架" : "重新上架"}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "#666" }}>{label}</label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════
// 項目（合作活動 + 商品列表）
// ════════════════════════════════════════════
const TODAY = new Date("2026-04-13");

function isExpired(dateStr: string) {
  const [y, m, d] = dateStr.replace(/\//g, "-").split("-").map(Number);
  return new Date(y, m - 1, d) < TODAY;
}

interface VendorActivity { id: string; title: string; date: string; type: string; registered: number; capacity: number }

function VendorItems({ vendorProducts }: { vendorProducts: VendorProduct[] }) {
  const [activities, setActivities] = useState<VendorActivity[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, notion_id, title, event_date, theme, capacity, status")
        .order("event_date", { ascending: false })
        .limit(20);
      if (data) {
        setActivities(data.map(e => ({
          id: e.notion_id || e.id,
          title: e.title,
          date: e.event_date ? new Date(e.event_date).toLocaleDateString("zh-TW") : "日期待定",
          type: e.theme || "活動",
          registered: 0,
          capacity: e.capacity || 0,
        })));
      }
    })();
  }, []);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({}); // activityId → productIds
  const [generated, setGenerated] = useState<Record<string, boolean>>({}); // activityId → done

  function toggleProduct(activityId: string, productId: string) {
    setSelected(prev => {
      const cur = prev[activityId] || [];
      return {
        ...prev,
        [activityId]: cur.includes(productId) ? cur.filter(id => id !== productId) : [...cur, productId],
      };
    });
  }

  function generate(activityId: string) {
    const ids = selected[activityId] || [];
    activityProductConfig[activityId] = ids;
    setGenerated(prev => ({ ...prev, [activityId]: true }));
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <div>
      {/* 合作活動 */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-5 py-3" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>🎪 合作活動</h3>
          <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>未過期的活動可設定預購商品，產生民眾可直接報名/預購的連結</p>
        </div>
        <div>
          {activities.map(a => {
            const expired = isExpired(a.date);
            const isOpen = expanded === a.id;
            const isGenerated = generated[a.id];
            const selectedIds = selected[a.id] || [];
            const pct = Math.round((a.registered / a.capacity) * 100);
            const buyUrl = `${baseUrl}/buy/${a.id}`;

            return (
              <div key={a.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                {/* 活動列 */}
                <div className="flex items-center gap-3 px-5 py-3"
                  style={{ cursor: expired ? "default" : "pointer", opacity: expired ? 0.5 : 1 }}
                  onClick={() => !expired && setExpanded(isOpen ? null : a.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "#333" }}>{a.title}</span>
                      {expired && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f5f5f5", color: "#aaa" }}>已結束</span>}
                      {isGenerated && !expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(78,205,196,0.15)", color: "#3aa89f" }}>✓ 預購頁已產生</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#999" }}>
                      <span>{a.date}</span>
                      <span>{a.type}</span>
                      <span>{a.registered}/{a.capacity} 人</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 60, background: "#f0f0f0" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#4CAF50" : "#e8935a", borderRadius: 999 }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#666" }}>{pct}%</span>
                    {!expired && (
                      <span style={{ color: "#bbb", fontSize: 12, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                    )}
                  </div>
                </div>

                {/* 展開：設定預購商品 */}
                {isOpen && (
                  <div className="px-5 pb-5" style={{ background: "#fafcff", borderTop: "1px solid #f0f0f0" }}>
                    {isGenerated ? (
                      // 已產生狀態
                      <div className="pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold" style={{ color: "#3aa89f" }}>✅ 預購頁面已就緒</span>
                        </div>
                        <div className="rounded-lg p-3 mb-3 flex items-center gap-2" style={{ background: "#f0faf9", border: "1px solid #b2e8e4" }}>
                          <span className="text-xs flex-1 break-all" style={{ color: "#1a1a2e", fontFamily: "monospace" }}>{buyUrl}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => navigator.clipboard?.writeText(buyUrl)}
                            className="flex-1 h-9 rounded-lg text-xs font-semibold"
                            style={{ border: "1px solid #4ECDC4", background: "#fff", color: "#3aa89f", cursor: "pointer" }}>
                            複製連結
                          </button>
                          <a href={buyUrl} target="_blank" rel="noreferrer"
                            className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center"
                            style={{ background: "#7a5c40", color: "#fff", textDecoration: "none" }}>
                            開啟預覽 ↗
                          </a>
                          <button onClick={() => setGenerated(prev => ({ ...prev, [a.id]: false }))}
                            className="h-9 px-3 rounded-lg text-xs"
                            style={{ border: "1px solid #eee", background: "#fff", color: "#aaa", cursor: "pointer" }}>
                            重新設定
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 設定狀態
                      <div className="pt-4">
                        <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>
                          選擇要加入此活動預購的商品（可不選，純報名頁）：
                        </p>
                        {vendorProducts.length === 0 ? (
                          <p className="text-xs py-3" style={{ color: "#aaa" }}>尚無上架商品，請先到「資訊」Tab 新增商品</p>
                        ) : (
                          <div className="space-y-2 mb-4">
                            {vendorProducts.map(p => (
                              <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                                style={{ background: selectedIds.includes(p.id) ? "rgba(122,92,64,0.06)" : "#fff", border: `1px solid ${selectedIds.includes(p.id) ? "#c8b89a" : "#eee"}` }}>
                                <input type="checkbox" checked={selectedIds.includes(p.id)}
                                  onChange={() => toggleProduct(a.id, p.id)}
                                  style={{ accentColor: "#7a5c40", width: 16, height: 16 }} />
                                <span className="flex-1 text-sm" style={{ color: "#333" }}>{p.name}</span>
                                <span className="text-xs font-semibold" style={{ color: "#e8935a" }}>NT$ {Number(p.price).toLocaleString()}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setExpanded(null)}
                            className="h-9 px-4 rounded-lg text-xs"
                            style={{ border: "1px solid #ddd", background: "#fff", color: "#888", cursor: "pointer" }}>取消</button>
                          <button onClick={() => generate(a.id)}
                            className="flex-1 h-9 rounded-lg text-xs font-semibold"
                            style={{ background: "#7a5c40", color: "#fff", border: "none", cursor: "pointer" }}>
                            產生預購頁面 →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 上架商品（Supabase 版，目前用 mock） */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-5 py-3" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📚 上架商品</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              {["商品名稱", "售價", "庫存", "已售", "評分", "狀態"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendorProducts.map(p => {
              const stock = typeof p.stock === "number" ? p.stock : 0;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "12px 14px", fontSize: 14 }}>{p.name}</td>
                  <td style={{ padding: "12px 14px", fontSize: 14, color: "#666" }}>NT${p.price}</td>
                  <td style={{ padding: "12px 14px", fontSize: 14 }}>
                    <span style={{ color: stock === 0 ? "#e53e3e" : stock <= 5 ? "#e8935a" : "#333", fontWeight: stock <= 5 ? 700 : 400 }}>{stock}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 14, color: "#666" }}>—</td>
                  <td style={{ padding: "12px 14px", fontSize: 14 }}>
                    <span style={{ color: "#ccc" }}>—</span>
                  </td>
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
    </div>
  );
}

// ════════════════════════════════════════════
// 金流
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
  );
}

// ════════════════════════════════════════════
// 設定
// ════════════════════════════════════════════
function VendorSettings() {
  return (
    <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: "#333" }}>單位資料</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {[["單位名稱", "旅人書店"], ["聯絡人", "林世傑"], ["Email", "travelerbookstore@gmail.com"],
          ["電話", "039-325957"], ["合作起始", "2024/01/15"], ["地址", "宜蘭縣羅東鎮文化街55號"]].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#888" }}>{l}</p>
            <p className="text-sm" style={{ color: "#333" }}>{v}</p>
          </div>
        ))}
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
            {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? "#f5a623" : "#ddd", fontSize: 14 }}>★</span>)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "#fff", border: "1px solid #f0f0f0" }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}<span className="text-sm font-normal ml-0.5" style={{ color: "#aaa" }}>{unit}</span></p>
      <p className="text-xs mt-1" style={{ color: "#999" }}>{label}</p>
    </div>
  );
}
