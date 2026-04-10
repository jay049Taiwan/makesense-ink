"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

function StaffWorkbench() {
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/bridge-token")
      .then((res) => res.json())
      .then((data) => {
        if (data.bridgeUrl) setBridgeUrl(data.bridgeUrl);
        else setError(data.error || "無法載入工作台");
      })
      .catch(() => setError("連線失敗"));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <p style={{ color: "var(--color-mist)" }}>{error}</p>
      </div>
    );
  }

  if (!bridgeUrl) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
        <p style={{ color: "var(--color-mist)" }}>載入工作台中...</p>
      </div>
    );
  }

  return (
    <iframe
      src={bridgeUrl}
      style={{
        width: "100%",
        border: "none",
        minHeight: "calc(100vh - 200px)",
        borderRadius: 12,
        background: "#F5F2ED",
      }}
      allow="clipboard-write"
    />
  );
}

function MemberOverview() {
  const { data: session } = useSession();
  const displayName = (session as any)?.displayName || session?.user?.name || "會員";
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user/orders")
      .then((res) => res.json())
      .then((data) => setRegistrationCount((data.registrations || []).length))
      .catch(() => setRegistrationCount(0));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
        歡迎回來，{displayName}
      </h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>我的點數</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>0</p>
        </div>
        <Link href="/dashboard/orders" className="rounded-xl p-5 block hover:shadow-sm transition-shadow" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>活動報名紀錄</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-rust)" }}>
            {registrationCount === null ? "—" : registrationCount}
          </p>
        </Link>
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>我的等級</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-teal)" }}>Lv.1</p>
        </div>
      </div>
    </div>
  );
}

function VendorOverview() {
  return (
    <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
      <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>合作概覽</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>4</p>
          <p className="text-xs" style={{ color: "var(--color-mist)" }}>上架產品</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>3</p>
          <p className="text-xs" style={{ color: "var(--color-mist)" }}>合作提案</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>NT$ 12,340</p>
          <p className="text-xs" style={{ color: "var(--color-mist)" }}>本月營收</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session as any)?.role || "member";

  if (role === "staff") return <StaffWorkbench />;
  if (role === "vendor") return <VendorOverview />;
  return <MemberOverview />;
}
