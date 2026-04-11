"use client";

import { createContext, useContext, useState } from "react";
import { MOCK_PROFILES } from "@/lib/mock-data";

type Role = "member" | "staff" | "vendor";

interface DevRoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  displayName: string;
  email: string;
  phone: string;
  lineConnected: boolean;
}

const DevRoleContext = createContext<DevRoleCtx>({
  role: "member",
  setRole: () => {},
  displayName: "王大明",
  email: "wangdaming@gmail.com",
  phone: "0912-345-678",
  lineConnected: true,
});

export function useDevRole() {
  return useContext(DevRoleContext);
}

export default function DevRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("staff");
  const isDev = process.env.NODE_ENV === "development";

  const profile = MOCK_PROFILES[role];

  return (
    <DevRoleContext.Provider value={{ role, setRole, displayName: profile.displayName, email: profile.email, phone: profile.phone, lineConnected: profile.lineConnected }}>
      {children}

      {/* 浮動角色切換器 — 只在 dev 顯示 */}
      {isDev && (
        <div
          style={{
            position: "fixed",
            top: 70,
            left: 12,
            zIndex: 9999,
            background: "#1a1a2e",
            borderRadius: 12,
            padding: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <p style={{ color: "#fff", fontSize: 9, textAlign: "center", marginBottom: 4, opacity: 0.5 }}>DEV 角色</p>
          {(["member", "staff", "vendor"] as Role[]).map((r) => {
            const labels: Record<Role, string> = { member: "👤 會員", staff: "🔧 工作", vendor: "🏪 廠商" };
            const isActive = role === r;
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 12px",
                  marginBottom: 2,
                  borderRadius: 8,
                  border: "none",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  background: isActive ? "#4ECDC4" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      )}
    </DevRoleContext.Provider>
  );
}
