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
    { href: "/dashboard", label: "會員中心", exact: true },
    { href: "/dashboard/workbench", label: "工作台", exact: false },
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

  // staff 在任何 dashboard 頁面都顯示 tab；workbench 路徑也視為 staff
  const isStaffUser = role === "staff" || pathname.startsWith("/dashboard/workbench");
  const effectiveRole: Role = isStaffUser ? "staff" : role;
  const tabs = roleTabs[effectiveRole];
  const showTabs = isStaffUser || role === "vendor";

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1200 }}>
      {children}
    </div>
  );
}
