"use client";

// 工作台 UI 抽到 components/workbench/WorkbenchShell.tsx，跟 /telegram/workbench 共用。
// 這個檔案只負責「官網入口」：分頁標籤、NextAuth session、寬度容器。
// 改 UI 請改 WorkbenchShell.tsx，不要在這裡複製組件。

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";

export default function WorkbenchPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";
  const displayName = isDev ? devRole.displayName : ((session as any)?.displayName || session?.user?.name || "員工");
  const email = isDev ? devRole.email : (session?.user?.email || "—");

  const pageTabs = [
    { href: "/dashboard", label: "個人紀錄", exact: true },
    { href: "/dashboard/workbench", label: "工作台", exact: false },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 分頁 tab（會員中心 / 工作台）*/}
      <nav className="flex gap-0 mb-4 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
        {pageTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
              style={{ color: isActive ? "#1a1a2e" : "#888", borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`, marginBottom: -2 }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <WorkbenchShell displayName={displayName} email={email} />
    </div>
  );
}
