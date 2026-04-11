"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import { getVendorStats, getVendorProducts, getVendorActivities, MOCK_MEMBER_PURCHASES } from "@/lib/mock-data";

type VendorTab = "合作概覽" | "合作項目" | "帳務金流" | "單位設定";

export default function PartnerPage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";
  const displayName = isDev ? devRole.displayName : ((session as any)?.displayName || "合作單位");
  const email = isDev ? devRole.email : (session?.user?.email || "—");
  const phone = isDev ? devRole.phone : "—";

  const [activeTab, setActiveTab] = useState<VendorTab>("合作概覽");
  const stats = getVendorStats();

  // 分頁 tab（會員中心 / 合作後台）
  const pageTabs = [
    { href: "/dashboard", label: "會員中心", exact: true },
    { href: "/dashboard/partner", label: "合作後台", exact: false },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 問候列 */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-2">{displayName} <span className="font-normal">您好</span></p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span>📧 {email}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>📱 {phone}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>合作期間：2024/01 至今</span>
        </div>
      </div>

      {/* 頂部分頁 */}
      <nav className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
        {pageTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors" style={{ color: isActive ? "#1a1a2e" : "#888", borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`, marginBottom: -2 }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* 合作後台子 Tab */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "#f5f0e8" }}>
        {(["合作概覽", "合作項目", "帳務金流", "單位設定"] as VendorTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-2 rounded-md text-xs font-semibold transition-colors" style={{ background: activeTab === tab ? "#7a5c40" : "transparent", color: activeTab === tab ? "#fff" : "#7a5c40", border: "none", cursor: "pointer" }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "合作概覽" && <VendorOverview stats={stats} />}
      {activeTab === "合作項目" && <VendorItems />}
      {activeTab === "帳務金流" && <VendorFinance stats={stats} />}
      {activeTab === "單位設定" && <VendorSettings />}
    </div>
  );
}

// ═══════════════════════════════════════════
// 合作概覽
// ═══════════════════════════════════════════
function VendorOverview({ stats }: { stats: ReturnType<typeof getVendorStats> }) {
  return (
    <div>
      {/* 數據卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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

      {/* 近期評價 */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📝 近期顧客評價</h3>
        </div>
        {MOCK_MEMBER_PURCHASES.filter(p => p.rating > 0 && p.publisher === "旅人書店").map((p) => (
          <div key={p.id} className="px-6 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #f5f5f5" }}>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#333" }}>{p.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#888" }}>「{p.comment}」— 王大明・{p.date}</p>
            </div>
            <span className="flex items-center gap-0.5 flex-shrink-0">
              {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= p.rating ? "#f5a623" : "#ddd", fontSize: 14 }}>★</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 合作項目（商品 + 活動）
// ═══════════════════════════════════════════
function VendorItems() {
  const products = getVendorProducts();
  const activities = getVendorActivities();

  return (
    <div>
      {/* 商品列表 */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📚 上架商品</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              {["商品名稱", "售價", "庫存", "已售", "評分", "狀態"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{p.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>NT${p.price}</td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  <span style={{ color: p.stock === 0 ? "#e53e3e" : p.stock <= 5 ? "#e8935a" : "#333", fontWeight: p.stock <= 5 ? 700 : 400 }}>{p.stock}</span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{p.sold}</td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>
                  {p.avgRating ? <span style={{ color: "#f5a623" }}>★ {p.avgRating}</span> : <span style={{ color: "#ccc" }}>—</span>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    background: p.stock === 0 ? "#fde8e8" : p.stock <= 5 ? "#fff3cd" : "#d4edda",
                    color: p.stock === 0 ? "#e53e3e" : p.stock <= 5 ? "#856404" : "#155724",
                  }}>
                    {p.stock === 0 ? "缺貨" : p.stock <= 5 ? "庫存低" : "上架中"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 活動列表 */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>🎪 合作活動</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              {["活動名稱", "日期", "類型", "容量", "已報名", "報名率"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map(a => {
              const pct = Math.round((a.registered / a.capacity) * 100);
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{a.title}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{a.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#e8f5e9", color: "#2e7d32" }}>{a.type}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{a.capacity} 人</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{a.registered}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0", maxWidth: 80 }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#4CAF50" : pct >= 50 ? "#e8935a" : "#ddd" }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#4CAF50" : "#666" }}>{pct}%</span>
                    </div>
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

// ═══════════════════════════════════════════
// 帳務金流
// ═══════════════════════════════════════════
function VendorFinance({ stats }: { stats: ReturnType<typeof getVendorStats> }) {
  const monthlyData = [
    { month: "2026-04", revenue: stats.totalRevenue, qty: stats.totalSold, status: "待結算" },
    { month: "2026-03", revenue: 4500, qty: 12, status: "已入帳" },
    { month: "2026-02", revenue: 3200, qty: 8, status: "已入帳" },
    { month: "2026-01", revenue: 5800, qty: 15, status: "已入帳" },
  ];

  return (
    <div>
      {/* 金額概覽 */}
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

      {/* 月報表 */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>📊 月報表</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              {["月份", "營收", "銷售量", "狀態"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map(m => (
              <tr key={m.month} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{m.month}</td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>NT$ {m.revenue.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{m.qty} 件</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    background: m.status === "已入帳" ? "#d4edda" : "#fff3cd",
                    color: m.status === "已入帳" ? "#155724" : "#856404",
                  }}>{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 單位設定
// ═══════════════════════════════════════════
function VendorSettings() {
  return (
    <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: "#333" }}>單位資料</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="單位名稱" value="旅人書店" />
        <Field label="聯絡人" value="林世傑" />
        <Field label="Email" value="travelerbookstore@gmail.com" />
        <Field label="電話" value="039-325957" />
        <Field label="合作起始" value="2024/01/15" />
        <Field label="地址" value="宜蘭縣羅東鎮文化街55號" />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: "#888" }}>{label}</p>
      <p className="text-sm" style={{ color: "#333" }}>{value}</p>
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
