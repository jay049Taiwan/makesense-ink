"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

// ═══════════════════════════════════════════
// 一般會員總覽
// ═══════════════════════════════════════════
function MemberOverview() {
  const { data: session } = useSession();
  const displayName = (session as any)?.displayName || session?.user?.name || "會員";
  const email = session?.user?.email || "";
  const [registrationCount, setRegistrationCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/user/orders")
      .then((res) => res.json())
      .then((data: any) => setRegistrationCount((data.registrations || []).length))
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* 問候列 */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-lg font-semibold mb-2">
          <span className="font-bold">{displayName}</span> 您好
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          {email && <><span>📧 {email}</span><span style={{ color: "rgba(255,255,255,0.3)" }}>|</span></>}
          <span>📱 —</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>⭐ 積分 <strong style={{ color: "#ffcc00", fontSize: 16 }}>0</strong> / 0</span>
        </div>
      </div>

      {/* 概覽卡片 */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <DashCard label="可用點數" value="0" color="var(--color-ink, #1a1a2e)" border="var(--color-teal, #4ECDC4)" />
        <Link href="/dashboard/orders" className="block" style={{ textDecoration: "none" }}>
          <DashCard label="活動報名" value={String(registrationCount)} color="var(--color-rust, #e8935a)" />
        </Link>
        <DashCard label="會員等級" value="Lv.1" color="var(--color-teal, #4ECDC4)" />
      </div>

      {/* 個人資料 */}
      <SectionCard title="個人資料" linkText="編輯" linkHref="/dashboard/profile">
        <div className="grid sm:grid-cols-2 gap-4 p-5">
          <FieldDisplay label="姓名" value={displayName} />
          <FieldDisplay label="Email" value={email || "—"} />
          <FieldDisplay label="電話" value="—" />
          <FieldDisplay label="通知方式" value="Email" />
        </div>
      </SectionCard>

      {/* 已購書籍 */}
      <SectionCard title="已購書籍" linkText="查看全部" linkHref="/dashboard/orders">
        <RecordTable
          headers={["書名", "購買日期", "累計積分", "評價"]}
          emptyText="尚無購書紀錄，前往書店逛逛吧！"
          emptyLink="/bookstore"
          emptyLinkText="→ 主題選書"
          rows={[]}
        />
      </SectionCard>

      {/* 已購商品 */}
      <SectionCard title="已購商品" linkText="查看全部" linkHref="/dashboard/orders">
        <RecordTable
          headers={["商品名稱", "購買日期", "累計積分", "評價"]}
          emptyText="尚無購物紀錄，前往選物逛逛吧！"
          emptyLink="/goods-selection"
          emptyLinkText="→ 風格選物"
          rows={[]}
        />
      </SectionCard>

      {/* 已參與活動 */}
      <SectionCard title="已參與活動" linkText="查看全部" linkHref="/dashboard/orders">
        <RecordTable
          headers={["活動名稱", "參與日期", "累計積分", "評價"]}
          emptyText="尚無活動紀錄，看看有什麼活動吧！"
          emptyLink="/cultureclub"
          emptyLinkText="→ 宜蘭文化俱樂部"
          rows={[]}
        />
      </SectionCard>

      {/* 已收藏文章 */}
      <SectionCard title="已收藏文章">
        <RecordTable
          headers={["文章名稱", "累計積分", "最後留言"]}
          emptyText="尚未收藏任何文章"
          rows={[]}
        />
      </SectionCard>

      {/* 宜蘭足跡地圖 */}
      <SectionCard title="宜蘭足跡地圖">
        <div className="p-10 text-center" style={{ background: "#f8fdf8" }}>
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-sm" style={{ color: "#999" }}>
            參加活動、購買商品，累積你的宜蘭足跡！
          </p>
          <p className="text-xs mt-2" style={{ color: "#ccc" }}>
            地圖功能開發中，敬請期待
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════
// 工作人員工作台
// ═══════════════════════════════════════════
function StaffWorkbench() {
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/bridge-token")
      .then((res) => res.json())
      .then((data: any) => {
        if (data.bridgeUrl) setBridgeUrl(data.bridgeUrl);
        else setError(data.error || "無法載入工作台");
      })
      .catch(() => setError("連線失敗"));
  }, []);

  if (error) return <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}><p style={{ color: "var(--color-mist)" }}>{error}</p></div>;
  if (!bridgeUrl) return <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}><p style={{ color: "var(--color-mist)" }}>載入工作台中...</p></div>;

  return <iframe src={bridgeUrl} style={{ width: "100%", border: "none", minHeight: "calc(100vh - 200px)", borderRadius: 12, background: "#F5F2ED" }} allow="clipboard-write" />;
}

// ═══════════════════════════════════════════
// 合作單位概覽
// ═══════════════════════════════════════════
function VendorOverview() {
  return (
    <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
      <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>合作概覽</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>—</p><p className="text-xs" style={{ color: "var(--color-mist)" }}>上架產品</p></div>
        <div><p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>—</p><p className="text-xs" style={{ color: "var(--color-mist)" }}>合作提案</p></div>
        <div><p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>—</p><p className="text-xs" style={{ color: "var(--color-mist)" }}>本月營收</p></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 共用元件
// ═══════════════════════════════════════════
function DashCard({ label, value, color, border }: { label: string; value: string; color: string; border?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#fff", border: `1.5px solid ${border || "var(--color-dust, #e8e0d4)"}` }}>
      <p className="text-sm mb-1" style={{ color: "var(--color-mist, #999)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color }}>{value}</p>
    </div>
  );
}

function SectionCard({ title, linkText, linkHref, children }: { title: string; linkText?: string; linkHref?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl mb-6 overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
      <div className="flex justify-between items-center px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
        <h3 className="text-base font-semibold" style={{ color: "#333", margin: 0 }}>{title}</h3>
        {linkText && linkHref && (
          <Link href={linkHref} className="text-sm hover:underline" style={{ color: "#666", textDecoration: "none" }}>{linkText}</Link>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: "#999" }}>{label}</p>
      <p className="text-sm" style={{ color: "#333" }}>{value}</p>
    </div>
  );
}

function RecordTable({ headers, rows, emptyText, emptyLink, emptyLinkText }: {
  headers: string[];
  rows: string[][];
  emptyText: string;
  emptyLink?: string;
  emptyLinkText?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm" style={{ color: "#aaa" }}>
        <p>{emptyText}</p>
        {emptyLink && emptyLinkText && (
          <Link href={emptyLink} className="inline-block mt-2 text-sm hover:underline" style={{ color: "#0066cc" }}>{emptyLinkText}</Link>
        )}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 20px", fontSize: 12, fontWeight: 600, color: "#999", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "12px 20px", fontSize: 14, color: "#333", borderBottom: "1px solid #f5f5f5" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════
// 主頁面
// ═══════════════════════════════════════════
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const role = (session as any)?.role || "member";

  // 未登入 → 顯示 demo 版（一般會員）
  if (status === "unauthenticated" || !session) {
    return <MemberOverview />;
  }

  if (role === "staff") return <StaffWorkbench />;
  if (role === "vendor") return <VendorOverview />;
  return <MemberOverview />;
}
