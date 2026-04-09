"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// 模擬角色（之後接 NextAuth + DB08 判斷）
type Role = "member" | "vendor" | "staff";

const roleTabs: Record<Role, { href: string; label: string; exact: boolean }[]> = {
  member: [
    { href: "/dashboard", label: "總覽", exact: true },
    { href: "/dashboard/profile", label: "個人資料", exact: false },
    { href: "/dashboard/orders", label: "訂單紀錄", exact: false },
    { href: "/dashboard/yilan-map", label: "我的宜蘭", exact: false },
  ],
  vendor: [
    { href: "/dashboard", label: "合作概覽", exact: true },
    { href: "/dashboard/products", label: "我的產品", exact: false },
    { href: "/dashboard/proposals", label: "合作提案", exact: false },
    { href: "/dashboard/profile", label: "個人資料", exact: false },
  ],
  staff: [
    { href: "/dashboard", label: "工作台", exact: true },
    { href: "/dashboard/profile", label: "個人資料", exact: false },
    { href: "/dashboard/orders", label: "訂單紀錄", exact: false },
    { href: "/dashboard/yilan-map", label: "我的宜蘭", exact: false },
  ],
};

const roleLabels: Record<Role, string> = {
  member: "一般會員",
  vendor: "合作單位",
  staff: "工作團隊",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // 模擬角色切換（開發用，之後移除）
  const [role, setRole] = useState<Role>("member");

  const tabs = roleTabs[role];

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1200 }}>
      {/* 問候列 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            會員中心
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-mist)" }}>
            Hi, 使用者名稱 ・ {roleLabels[role]}
          </p>
        </div>

        {/* 開發用角色切換器（之後移除） */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--color-parchment)" }}>
          {(Object.keys(roleTabs) as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: role === r ? "var(--color-teal)" : "transparent",
                color: role === r ? "#fff" : "var(--color-mist)",
              }}
            >
              {roleLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 導航 */}
      <nav className="flex gap-0 mb-8 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
              style={{
                color: isActive ? "#1a1a2e" : "#888",
                borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`,
                marginBottom: -2,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
