"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDevRole } from "@/components/providers/DevRoleProvider";

type Role = "member" | "vendor" | "staff";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const devRole = useDevRole();

  // 線上用 session，本地 dev 用 DevRole
  const isDev = process.env.NODE_ENV === "development";
  const role: Role = isDev
    ? devRole.role
    : ((session as any)?.role as Role) || "member";

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1200 }}>
      {children}
    </div>
  );
}
