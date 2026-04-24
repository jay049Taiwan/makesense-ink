"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/providers/LiffProvider";

interface MemberInfo {
  name: string;
  email: string | null;
  role: string;
  orderCount: number;
  totalSpent: number;
}

/**
 * /liff/profile — LIFF 模式的會員中心
 * 服務為輔：顯示基本會員資訊 + 訂單摘要 + 快速連結
 */
export default function LiffProfilePage() {
  const { liffUser } = useLiff();
  const [info, setInfo] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!liffUser?.email) {
        setInfo({
          name: liffUser?.lineProfile?.displayName || "旅人",
          email: null,
          role: "訪客",
          orderCount: 0,
          totalSpent: 0,
        });
        setLoading(false);
        return;
      }

      // 查會員
      const { data: member } = await supabase
        .from("members")
        .select("id, name")
        .eq("email", liffUser.email)
        .maybeSingle();

      let orderCount = 0;
      let totalSpent = 0;

      if (member) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total")
          .eq("member_id", member.id)
          .neq("status", "cancelled");

        orderCount = orders?.length || 0;
        totalSpent = (orders || []).reduce((s, o: any) => s + (o.total || 0), 0);
      }

      setInfo({
        name: liffUser.lineProfile?.displayName || member?.name || "會員",
        email: liffUser.email,
        role: liffUser.role || "會員",
        orderCount,
        totalSpent,
      });
      setLoading(false);
    })();
  }, [liffUser]);

  const pic = liffUser?.lineProfile?.pictureUrl;

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      {/* 頂部名片 */}
      <div className="px-4 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #7a5c40 0%, #b89e7a 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#fff" }}>
            {pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pic} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white truncate">{info?.name || "…"}</p>
            <p className="text-xs text-white/80 mt-0.5">
              {info?.email || "尚未綁定 Email"}
            </p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}>
            {info?.role || "訪客"}
          </span>
        </div>
      </div>

      {/* 數字摘要 */}
      <div className="grid grid-cols-2 gap-2 px-4 -mt-3">
        <div className="rounded-xl p-3 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
          <p className="text-[11px]" style={{ color: "#999" }}>訂單總數</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: "#2d2a26" }}>{loading ? "…" : info?.orderCount ?? 0}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
          <p className="text-[11px]" style={{ color: "#999" }}>累積消費</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: "#b5522a" }}>
            {loading ? "…" : `$${(info?.totalSpent ?? 0).toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* 快速連結 */}
      <div className="px-4 mt-5 space-y-2">
        <h2 className="text-xs font-semibold mb-2" style={{ color: "#999" }}>服務</h2>
        <Link href="/dashboard/orders?liff_mode=true" icon="📦" label="我的訂單" hint="查看歷史訂單與狀態" />
        <Link href="/liff/member" icon="🛒" label="購物清單" hint="目前購物車內容" />
        <Link href="/dashboard/profile?liff_mode=true" icon="⚙️" label="個人資料" hint="姓名、電話、Email" />
      </div>

      <div className="px-4 mt-5 space-y-2">
        <h2 className="text-xs font-semibold mb-2" style={{ color: "#999" }}>逛逛</h2>
        <Link href="/liff/shop" icon="📚" label="選書選物" hint="主題選書、風格選物、數位" />
        <Link href="/liff/events" icon="🎪" label="活動體驗" hint="近期活動、走讀、講座、市集" />
        <Link href="/liff/viewpoints" icon="🗺️" label="觀點漫遊" hint="宜蘭在地文化觀點" />
        <Link href="/liff/newsletter" icon="📮" label="地方通訊" hint="最新文章、觀察紀錄" />
      </div>

      {!liffUser?.email && (
        <div className="px-4 mt-5">
          <div className="rounded-xl p-4 text-center" style={{ background: "#fff8ef", border: "1px solid #f0d9a8" }}>
            <p className="text-sm" style={{ color: "#8a6d3b" }}>尚未綁定 Email</p>
            <p className="text-xs mt-1" style={{ color: "#b8997a" }}>綁定後可看到訂單、報名紀錄與累積消費</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Link({ href, icon, label, hint }: { href: string; icon: string; label: string; hint: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: "#fff", border: "1px solid #ece8e1" }}
    >
      <span className="text-lg w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f0ebe4" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "#2d2a26" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "#999" }}>{hint}</p>
      </div>
      <span className="text-sm" style={{ color: "#ccc" }}>›</span>
    </a>
  );
}
