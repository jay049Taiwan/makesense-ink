"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "總覽", exact: true },
  { href: "/dashboard/profile", label: "個人資料", exact: false },
  { href: "/dashboard/orders", label: "訂單紀錄", exact: false },
  { href: "/dashboard/yilan-map", label: "我的宜蘭", exact: false },
  { href: "/dashboard/volunteer", label: "志工服務", exact: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-brown mb-6">會員中心</h1>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b border-border mb-8 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-brand-brown text-brand-brown"
                  : "border-transparent text-muted hover:text-brand-brown hover:border-brand-tan"
              }`}
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
