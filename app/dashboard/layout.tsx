"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
    { href: "/dashboard", label: "總覽", exact: true },
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
  const { data: session } = useSession();

  // 從 session 取得角色和顯示名稱
  const role: Role = ((session as any)?.role as Role) || "member";
  const displayName = (session as any)?.displayName || session?.user?.name || "會員";

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
            Hi, {displayName} ・ {roleLabels[role]}
          </p>
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
