"use client";

import { useDevRole } from "@/components/providers/DevRoleProvider";
import { useRouter } from "next/navigation";

export default function DevLogin() {
  const { role, setRole } = useDevRole();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) return null;

  const handleLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="mt-4 p-4 rounded-lg" style={{ background: "#faf8f4", border: "1px dashed #d4c5b0" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "#7a5c40" }}>🔧 DEV 快速登入</p>
      <div className="flex gap-2 mb-3">
        {(["member", "staff", "vendor"] as const).map((r) => {
          const labels = { member: "👤 一般會員", staff: "🔧 工作團隊", vendor: "🏪 合作廠商" };
          return (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{
                background: role === r ? "#7a5c40" : "#fff",
                color: role === r ? "#fff" : "#7a5c40",
                border: role === r ? "none" : "1px solid #d4c5b0",
                cursor: "pointer",
              }}
            >
              {labels[r]}
            </button>
          );
        })}
      </div>
      <button
        onClick={handleLogin}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90"
        style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}
      >
        以「{role === "member" ? "一般會員" : role === "staff" ? "工作團隊" : "合作廠商"}」身分登入 →
      </button>
    </div>
  );
}
