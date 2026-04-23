"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/providers/LiffProvider";
import { useCart } from "@/components/providers/CartProvider";
import { supabase } from "@/lib/supabase";

interface MemberInfo {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  points: number;
  orderCount: number;
}

const QUICK_LINKS = [
  { label: "我的訂單", href: "/dashboard/orders?liff_mode=true", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  { label: "個人資料", href: "/dashboard/profile?liff_mode=true", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { label: "購買紀錄", href: "/dashboard?liff_mode=true", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
];

export default function LiffMemberPage() {
  const { isLiffMode, liffUser, needsBind, isLiffReady } = useLiff();
  const { items, totalPrice, totalItems } = useCart();
  const hasCart = items.length > 0;
  const [bindEmail, setBindEmail] = useState("");
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState("");
  const [bindSuccess, setBindSuccess] = useState(false);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);

  // 載入會員資料
  useEffect(() => {
    if (!liffUser || !liffUser.email) return;
    setLoadingMember(true);
    (async () => {
      // 查會員基本資料
      const { data: m } = await supabase
        .from("members")
        .select("id, name, email, phone, role, points")
        .eq("email", liffUser.email)
        .single();

      if (!m) { setLoadingMember(false); return; }

      // 查訂單數
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("member_id", m.id);

      setMember({
        name: m.name || liffUser.name || "會員",
        email: m.email,
        phone: m.phone,
        role: m.role || "member",
        points: m.points || 0,
        orderCount: count || 0,
      });
      setLoadingMember(false);
    })();
  }, [liffUser]);

  // 綁定帳號
  const handleBind = async () => {
    if (!bindEmail.trim()) { setBindError("請輸入 Email"); return; }
    setBinding(true);
    setBindError("");
    try {
      const res = await fetch("/api/liff/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUid: liffUser?.lineProfile?.userId, email: bindEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setBindSuccess(true);
      } else {
        setBindError(data.error || "綁定失敗，請確認 Email 是否正確");
      }
    } catch {
      setBindError("網路錯誤，請稍後再試");
    }
    setBinding(false);
  };

  // 載入中（最多等 5 秒）
  if (loadingMember || (!isLiffReady && isLiffMode)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#7a5c40] rounded-full animate-spin" />
      </div>
    );
  }

  // LIFF 未登入 — 顯示基本會員頁面（連結到官網登入）
  if (!liffUser && !needsBind) {
    return (
      <div className="pb-4">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>會員中心</h1>
        </div>
        <div className="mx-4 p-6 rounded-2xl text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#f0ebe4" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7a5c40" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: "#2d2a26" }}>歡迎來到會員中心</h2>
          <p className="text-xs mb-4" style={{ color: "#999" }}>登入後即可查看您的訂單與點數</p>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "#f8f7f4", border: "1px solid #ece8e1" }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#f0ebe4" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a5c40" strokeWidth="2">
                    <path d={link.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: "#2d2a26" }}>{link.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 需要綁定
  if (needsBind && !bindSuccess) {
    return (
      <div className="pb-4">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>會員中心</h1>
        </div>

        <div className="mx-4 p-6 rounded-2xl" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#f0ebe4" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7a5c40" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM20 8v6M23 11h-6" />
              </svg>
            </div>
            <h2 className="text-base font-semibold" style={{ color: "#2d2a26" }}>綁定您的帳號</h2>
            <p className="text-xs mt-1" style={{ color: "#999" }}>
              請輸入您在旅人書店註冊的 Email<br/>來連結 LINE 與會員帳號
            </p>
          </div>

          <input
            type="email"
            value={bindEmail}
            onChange={(e) => setBindEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
            style={{ background: "#f8f7f4", border: "1px solid #ece8e1", color: "#2d2a26" }}
          />

          {bindError && (
            <p className="text-xs mb-3" style={{ color: "#e74c3c" }}>{bindError}</p>
          )}

          <button
            onClick={handleBind}
            disabled={binding}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: "#7a5c40", color: "#fff" }}
          >
            {binding ? "綁定中..." : "確認綁定"}
          </button>
        </div>
      </div>
    );
  }

  // 綁定成功提示
  if (bindSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#e8f5e9" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-base font-semibold" style={{ color: "#2d2a26" }}>綁定成功！</h2>
          <p className="text-xs mt-1" style={{ color: "#999" }}>請重新開啟此頁面</p>
        </div>
      </div>
    );
  }

  // 已綁定會員
  return (
    <div className="pb-4">
      {/* 頁面標題 */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>結帳確認</h1>
      </div>

      {/* 購物車區（有商品才顯示） */}
      {hasCart && (
        <div className="mx-4 mt-2 p-4 rounded-2xl" style={{ background: "#fff", border: "2px solid #4ECDC4" }}>
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ECDC4" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <h2 className="text-sm font-bold flex-1" style={{ color: "#2d2a26" }}>購物車 ({totalItems} 件)</h2>
          </div>

          <div className="space-y-2 mb-3">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-xs" style={{ color: "#666" }}>
                <span className="line-clamp-1 flex-1">{item.name} ×{item.qty}</span>
                <span style={{ color: "#b5522a" }}>NT$ {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-xs" style={{ color: "#999" }}>...還有 {items.length - 3} 件商品</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#ece8e1" }}>
            <div>
              <p className="text-[10px]" style={{ color: "#999" }}>合計</p>
              <p className="text-lg font-bold" style={{ color: "#b5522a" }}>NT$ {totalPrice.toLocaleString()}</p>
            </div>
            <a
              href="/checkout?liff_mode=true"
              className="px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "#4ECDC4", color: "#fff" }}
            >
              前往結帳 →
            </a>
          </div>
        </div>
      )}

      {/* 會員資訊卡片 */}
      <div className="mx-4 mt-4 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, #7a5c40 0%, #b89e7a 100%)" }}>
        <div className="flex items-center gap-3 mb-4">
          {liffUser?.lineProfile?.pictureUrl ? (
            <img src={liffUser.pictureUrl} alt="" className="w-14 h-14 rounded-full border-2 border-white/30" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">{member?.name || liffUser?.lineProfile?.displayName || "會員"}</h2>
            <p className="text-xs text-white/70">{member?.email}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-2xl font-bold text-white">{member?.points || 0}</p>
            <p className="text-[10px] text-white/70 mt-0.5">點數</p>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-2xl font-bold text-white">{member?.orderCount || 0}</p>
            <p className="text-[10px] text-white/70 mt-0.5">訂單</p>
          </div>
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="px-4 mt-4 space-y-2">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center gap-3 p-4 rounded-xl transition-shadow hover:shadow-md"
            style={{ background: "#fff", border: "1px solid #ece8e1" }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#f0ebe4" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a5c40" strokeWidth="2">
                <path d={link.icon} />
              </svg>
            </div>
            <span className="text-sm font-medium flex-1" style={{ color: "#2d2a26" }}>{link.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
