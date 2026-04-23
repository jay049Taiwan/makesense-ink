"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";

// ── Dev mock 訂單資料 ──
const DEV_ORDERS = [
  { id: "ord-dev-001", created_at: "2026-04-04T10:30:00Z", total: 850, source: "liff",
    order_items: [
      { id: "oi-d001", name: "走讀收費", item_type: "event", quantity: 1, price: 450, reviews: [] },
      { id: "oi-d002", name: "加購宜蘭街散步圖", item_type: "goods", quantity: 2, price: 200, reviews: [{ rating: 5, comment: "很實用！" }] },
    ] },
  { id: "ord-dev-002", created_at: "2026-03-31T14:20:00Z", total: 640, source: "web",
    order_items: [
      { id: "oi-d003", name: "手作繪圖木掛句", item_type: "goods", quantity: 1, price: 320, reviews: [] },
      { id: "oi-d004", name: "手工縫製女孩鑰匙圈", item_type: "goods", quantity: 1, price: 320, reviews: [] },
    ] },
  { id: "ord-dev-003", created_at: "2026-03-15T09:00:00Z", total: 350, source: "web",
    order_items: [
      { id: "oi-d005", name: "宜蘭地方誌 Vol.3", item_type: "book", quantity: 1, price: 350, reviews: [{ rating: 4, comment: "內容豐富" }] },
    ] },
];
const CAT_LABELS: Record<string, string> = { event: "活動", book: "選書", goods: "選物", article: "內容", ticket: "票券" };

// ═══════════════════════════════════════════
// 一般會員總覽
// ═══════════════════════════════════════════
function MemberOverview() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";
  const displayName = isDev ? devRole.displayName : ((session as any)?.displayName || session?.user?.name || "會員");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [profileLineConnected, setProfileLineConnected] = useState<boolean>(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [bindMsg, setBindMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("line_bind");
    const MSG: Record<string, { type: "success" | "error"; text: string }> = {
      success: { type: "success", text: "LINE 帳號已綁定" },
      missing_params: { type: "error", text: "LINE 授權回傳資料不完整" },
      invalid_state: { type: "error", text: "授權逾時或被竄改" },
      no_email: { type: "error", text: "找不到登入 email" },
      token_failed: { type: "error", text: "LINE 授權失敗" },
      profile_failed: { type: "error", text: "讀取 LINE 個人資料失敗" },
      already_bound: { type: "error", text: "此 LINE 帳號已綁給別的會員" },
      save_failed: { type: "error", text: "存入資料失敗" },
    };
    if (code && MSG[code]) {
      setBindMsg(MSG[code]);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setBindMsg(null), 5000);
    }
  }, []);
  const email = isDev ? devRole.email : (profileEmail || session?.user?.email || "—");
  const phone = isDev ? devRole.phone : (profilePhone || "—");
  const lineConnected = isDev ? devRole.lineConnected : profileLineConnected;

  // 從 /api/user/profile 讀真實資料
  useEffect(() => {
    if (isDev) return;
    fetch("/api/user/profile").then(r => r.ok ? r.json() : null).then(d => {
      if (d && !d.error) {
        setProfileEmail(d.email || "");
        setProfilePhone(d.phone || "");
        setProfileLineConnected(!!d.lineUid);
      }
    }).catch(() => {});
  }, [isDev]);

  // 三顆編輯按鈕的處理
  const handleEmailRebind = () => {
    if (!confirm("帳號已綁定 Google。是否要重新綁定（用另一個 Google 帳號登入）？")) return;
    signIn("google", { callbackUrl: "/dashboard" });
  };
  const handleLineBind = () => {
    if (profileLineConnected && !confirm("LINE 帳號已綁定，是否要重新綁定？")) return;
    window.location.href = "/api/user/link-line/start";
  };
  const handlePhoneEdit = () => {
    setPhoneDraft(profilePhone || "");
    setEditingPhone(true);
  };
  const [savingPhone, setSavingPhone] = useState(false);
  const handlePhoneSave = async () => {
    const next = phoneDraft.trim();
    setSavingPhone(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setProfilePhone(next);
        setEditingPhone(false);
      } else {
        alert(`儲存失敗：${data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      alert(`儲存失敗：${err?.message || "網路錯誤"}`);
    } finally {
      setSavingPhone(false);
    }
  };
  const [stats, setStats] = useState({ points: 0, level: "Lv.1" as string, totalSpent: 0, totalItems: 0, totalEvents: 0 });

  const [purchases, setPurchases] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);

  // 從 Supabase 載入真實訂單
  const loadOrders = useCallback(async () => {
    if (!email || email === "—") return;
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.orders && data.orders.length > 0) {
        setMemberId(data.memberId);
        setOrders(data.orders);
        const realPurchases = data.orders.flatMap((order: any) =>
          (order.order_items || []).map((item: any) => ({
            id: item.id,
            orderItemId: item.id,
            memberId: data.memberId,
            productId: item.meta?.productId || "",
            name: item.meta?.name || "—",
            qty: item.quantity,
            author: "—",
            publisher: "—",
            date: new Date(order.created_at).toLocaleDateString("zh-TW"),
            price: item.price,
            rating: item.reviews?.[0]?.rating || 0,
            comment: item.reviews?.[0]?.comment || "",
            category: item.item_type,
            topics: [],
          }))
        );
        setPurchases(realPurchases);
        // 計算 stats
        const totalSpent = realPurchases.reduce((s: number, p: any) => s + p.price * p.qty, 0);
        const totalItems = realPurchases.reduce((s: number, p: any) => s + p.qty, 0);
        const totalEvents = realPurchases.filter((p: any) => p.category === "event").length;
        const points = Math.floor(totalSpent / 10);
        setStats({ totalSpent, totalItems, totalEvents, points, level: points >= 200 ? "Lv.3" : points >= 100 ? "Lv.2" : "Lv.1" });
      }
    } catch (err) {
      console.error("載入訂單失敗:", err);
    }
  }, [email]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Dev: 沒真實資料時用 mock 填充
  useEffect(() => {
    if (isDev && purchases.length === 0) {
      setPurchases(DEV_ORDERS.flatMap(o => o.order_items.map(i => ({
        id: i.id, orderItemId: i.id, memberId: "dev-member-001",
        name: i.name, qty: i.quantity, price: i.price,
        author: "—", publisher: "旅人書店",
        date: new Date(o.created_at).toLocaleDateString("zh-TW"),
        rating: i.reviews?.[0]?.rating || 0,
        comment: i.reviews?.[0]?.comment || "",
        category: i.item_type, topics: [],
      }))));
    }
  }, [isDev, purchases.length]);

  const [showQR, setShowQR] = useState(false);
  const [detailTab, setDetailTab] = useState<"orders" | "categories">("orders");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState("全部");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const pendingCount = purchases.filter((p) => p.rating === 0 && !submitted[p.id]).length;

  const handleSubmitRating = async (id: string) => {
    const item = purchases.find((p) => p.id === id);
    if (!ratings[id] || !item) return;

    // 有 orderItemId 就寫入 Supabase
    if (item.orderItemId && item.memberId) {
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderItemId: item.orderItemId,
            memberId: item.memberId,
            rating: ratings[id],
            comment: comments[id] || "",
          }),
        });
        if (!res.ok) throw new Error("評價失敗");
      } catch (err) {
        console.error("送出評價失敗:", err);
        alert("送出評價失敗，請稍後再試");
        return;
      }
    }
    setSubmitted((prev) => ({ ...prev, [id]: true }));
  };

  // ── 分析資料 ──
  const categoryCount: Record<string, number> = {};
  const authorCount: Record<string, number> = {};
  const publisherCount: Record<string, number> = {};
  const topicCount: Record<string, number> = {};
  purchases.forEach((p) => {
    categoryCount[p.category] = (categoryCount[p.category] || 0) + p.qty;
    if (p.author !== "—") authorCount[p.author] = (authorCount[p.author] || 0) + p.qty;
    if (p.publisher !== "—") publisherCount[p.publisher] = (publisherCount[p.publisher] || 0) + p.qty;
    p.topics.forEach((t) => { topicCount[t] = (topicCount[t] || 0) + p.qty; });
  });
  const totalQty = purchases.reduce((s, p) => s + p.qty, 0);
  const ratedCount = purchases.filter((p) => p.rating > 0 || submitted[p.id]).length;

  // 用戶還沒探索的類型（平台有但用戶沒買過的）
  const allCategories = ["書籍", "商品", "走讀", "講座", "市集", "空間體驗", "付費文章"];
  const unexplored = allCategories.filter((c) => !categoryCount[c]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ── 綁定訊息 toast ── */}
      {bindMsg && (
        <div className="rounded-lg px-4 py-2 mb-3 text-sm" style={{ background: bindMsg.type === "success" ? "#d1f5e0" : "#fde2e2", color: bindMsg.type === "success" ? "#0f5132" : "#842029" }}>
          {bindMsg.text}
        </div>
      )}

      {/* ── 問候列 ── */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-2">
          {displayName} <span className="font-normal">您好</span>
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          {/* 會員編號 + QR 按鈕 */}
          {(isDev || memberId) && (() => {
            const displayId = isDev ? "dev-member-001" : memberId!;
            const shortId = displayId.slice(0, 8).toUpperCase();
            return (
              <span className="flex items-center gap-1.5">
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>會員編號</span>
                <span style={{ fontFamily: "monospace", letterSpacing: "0.05em", color: "#fff", fontSize: 13 }}>{shortId}</span>
                <button onClick={() => setShowQR(true)} title="顯示 QR Code" style={{ background: "none", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", padding: "2px 8px", borderRadius: 4, color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                  QR
                </button>
              </span>
            );
          })()}
          <Divider />
          <span className="flex items-center gap-1">
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>會員信箱</span>
            <span>{email}</span>
            <EditIconButton onClick={handleEmailRebind} title="重新綁定 Email（Google）" />
          </span>
          <Divider />
          <span className="flex items-center gap-1">
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>LINE帳號</span>
            <span>{lineConnected ? "已綁定" : "未綁定"}</span>
            <EditIconButton onClick={handleLineBind} title={lineConnected ? "重新綁定 LINE" : "綁定 LINE"} />
          </span>
          <Divider />
          {editingPhone ? (
            <span className="flex items-center gap-1">
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>聯繫電話</span>
              <input
                type="tel"
                value={phoneDraft}
                autoFocus
                onChange={(e: any) => setPhoneDraft(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter") handlePhoneSave();
                  if (e.key === "Escape") setEditingPhone(false);
                }}
                placeholder="0912-345-678"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, padding: "2px 6px", color: "#fff", fontSize: 13, width: 120 }}
              />
              <button type="button" onClick={handlePhoneSave} disabled={savingPhone} style={{ background: "#4ECDC4", border: "none", borderRadius: 4, padding: "2px 8px", color: "#fff", fontSize: 11, cursor: savingPhone ? "wait" : "pointer", opacity: savingPhone ? 0.6 : 1 }}>{savingPhone ? "存中…" : "存"}</button>
              <button onClick={() => setEditingPhone(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, padding: "2px 8px", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" }}>取消</button>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>聯繫電話</span>
              <span>{phone}</span>
              <EditIconButton onClick={handlePhoneEdit} title="修改電話" />
            </span>
          )}
          <Divider />
          <span className="flex items-center gap-1">
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>積分</span>
            <strong style={{ color: "#ffcc00", fontSize: 16 }}>{stats.points}</strong>
          </span>
        </div>
      </div>

      {/* ── QR Code Modal ── */}
      {showQR && (isDev || memberId) && (
        <div onClick={() => setShowQR(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "32px 24px", width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <p className="text-sm font-semibold" style={{ color: "#333", margin: 0 }}>我的會員條碼</p>
            <QRCodeSVG value={`https://makesense.ink/m/${isDev ? "dev-member-001" : memberId}`} size={240} level="M" />
            <button onClick={() => setShowQR(false)} style={{ marginTop: 4, padding: "8px 24px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#666" }}>關閉</button>
          </div>
        </div>
      )}

      {/* ── Staff 分頁 tab（問候列下方）── */}
      <StaffTabs />

      {/* ── 我的參與分析 ── */}
      <div className="rounded-xl mb-6 overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-base font-semibold" style={{ color: "#333", margin: 0 }}>📊 我的參與分析</h3>
          <p className="text-xs mt-1" style={{ color: "#aaa" }}>從你的購買與參與紀錄，看見自己的文化足跡</p>
        </div>
        <div className="p-6">
          {/* 概覽數字 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="購買總數" value={totalQty} unit="件" color="#1a1a2e" />
            <StatCard label="已評價" value={ratedCount} unit="筆" color="#4CAF50" />
            <StatCard label="待評價" value={pendingCount} unit="筆" color="#e8935a" />
            <StatCard label="平均評分" value={purchases.filter(p => p.rating > 0).length > 0 ? (purchases.filter(p => p.rating > 0).reduce((s, p) => s + p.rating, 0) / purchases.filter(p => p.rating > 0).length).toFixed(1) : "—"} unit="" color="#f5a623" />
          </div>

          {/* 第一排：類型 + 議題 */}
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold mb-4 self-start" style={{ color: "#555" }}>購買類型分佈</p>
              <DonutChart data={categoryCount} colors={["#4ECDC4", "#b89e7a", "#e8935a", "#7a5c40", "#f5a623"]} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-4" style={{ color: "#555" }}>你關注的議題</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(topicCount).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                  <Link key={topic} href={`/keyword/${encodeURIComponent(topic)}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:shadow-md" style={{ background: "#f5f0e8", color: "#7a5c40", textDecoration: "none", border: "1px solid transparent" }}>
                    <span>#{topic}</span>
                    <span className="text-xs font-bold" style={{ color: "#b89e7a" }}>{count}</span>
                  </Link>
                ))}
              </div>
              {Object.keys(topicCount).length > 0 && (
                <p className="text-xs mt-3" style={{ color: "#aaa" }}>點擊議題標籤，發現更多相關的書籍與活動</p>
              )}
            </div>
          </div>

          {/* 第二排：作者 + 發行商 */}
          <div className="grid sm:grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-xs font-semibold mb-4" style={{ color: "#555" }}>你最支持的作者</p>
              <RankList data={authorCount} color="#b89e7a" max={5} linkPrefix="/author/" />
              {Object.keys(authorCount).length > 0 && (
                <p className="text-xs mt-3" style={{ color: "#aaa" }}>點擊作者名稱，探索他們的其他作品</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold mb-4" style={{ color: "#555" }}>你最支持的發行商</p>
              <RankList data={publisherCount} color="#4ECDC4" max={5} linkPrefix="/publisher/" />
            </div>
          </div>

          {/* 你還沒探索的 */}
          {unexplored.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: "linear-gradient(135deg, #faf8f4, #f0ebe3)", border: "1px dashed #d4c5b0" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#7a5c40" }}>🌱 還有更多等你探索</p>
              <p className="text-xs mb-3" style={{ color: "#999" }}>你還沒體驗過這些類型，也許會有驚喜：</p>
              <div className="flex flex-wrap gap-2">
                {unexplored.map((cat) => {
                  const links: Record<string, string> = { "講座": "/cultureclub", "空間體驗": "/space-experience", "付費文章": "/viewpoint-stroll" };
                  return (
                    <Link key={cat} href={links[cat] || "/bookstore"} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:shadow-md" style={{ background: "#fff", color: "#7a5c40", border: "1px solid #d4c5b0", textDecoration: "none" }}>
                      {cat} →
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 購買紀錄 ── */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "#fff", border: "1px solid #e8e8e8" }}>
        <div className="flex items-center gap-3 px-6 py-4" style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
          <h3 className="text-base font-semibold" style={{ color: "#333", margin: 0 }}>🛒 購買紀錄</h3>
          {pendingCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "#e8935a" }}>
              {pendingCount} 待評價
            </span>
          )}
        </div>

        {/* 桌面版表格 */}
        <div className="hidden md:block">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                {["商品名稱", "數量", "作者", "購買日期", "評價", "留言"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map((item) => {
                const isSubmitted = submitted[item.id] || item.rating > 0;
                const currentRating = ratings[item.id] || item.rating;
                const currentComment = comments[item.id] ?? item.comment;
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14, maxWidth: 200 }}>
                      <span style={{ color: "#0066cc" }}>{item.name}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "center" }}>{item.qty}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>
                      {item.author !== "—" ? <Link href={`/author/${encodeURIComponent(item.author)}`} style={{ color: "#0066cc", textDecoration: "none" }}>{item.author}</Link> : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#666", whiteSpace: "nowrap" }}>{item.date}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {isSubmitted ? <StarDisplay rating={currentRating} /> : <StarInput value={currentRating} onChange={(v) => setRatings((prev) => ({ ...prev, [item.id]: v }))} />}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {isSubmitted ? (
                        <span className="text-sm" style={{ color: "#666" }}>{currentComment || "—"}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input type="text" placeholder="選填" value={currentComment} onChange={(e: any) => setComments((prev) => ({ ...prev, [item.id]: e.target.value }))} className="text-sm px-2 py-1 rounded" style={{ border: "1px solid #ddd", width: 70, outline: "none" }} />
                          <button onClick={() => handleSubmitRating(item.id)} disabled={!currentRating} className="text-xs px-2 py-1 rounded text-white flex-shrink-0" style={{ background: currentRating ? "#4CAF50" : "#ccc", border: "none", cursor: currentRating ? "pointer" : "default" }}>送出</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 手機版卡片 */}
        <div className="md:hidden">
          {purchases.map((item) => {
            const isSubmitted = submitted[item.id] || item.rating > 0;
            const currentRating = ratings[item.id] || item.rating;
            const currentComment = comments[item.id] ?? item.comment;
            return (
              <div key={item.id} className="p-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "#0066cc" }}>{item.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: "#888" }}>
                  <span>數量 {item.qty}</span>
                  <span>{item.author}</span>
                  <span>{item.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isSubmitted ? <StarDisplay rating={currentRating} /> : <StarInput value={currentRating} onChange={(v) => setRatings((prev) => ({ ...prev, [item.id]: v }))} />}
                  {!isSubmitted && (
                    <>
                      <input type="text" placeholder="留言" value={currentComment} onChange={(e: any) => setComments((prev) => ({ ...prev, [item.id]: e.target.value }))} className="text-sm px-2 py-1 rounded flex-1" style={{ border: "1px solid #ddd", outline: "none" }} />
                      <button onClick={() => handleSubmitRating(item.id)} disabled={!currentRating} className="text-xs px-2 py-1 rounded text-white" style={{ background: currentRating ? "#4CAF50" : "#ccc", border: "none" }}>送出</button>
                    </>
                  )}
                  {isSubmitted && currentComment && <span className="text-xs" style={{ color: "#888" }}>{currentComment}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 網站營運分析（僅 staff 可見）── */}
      {(() => {
        const roleForAnalytics = isDev ? devRole.role : ((session as any)?.role || "member");
        return roleForAnalytics === "staff" ? <AnalyticsPanel /> : null;
      })()}
    </div>
  );
}

// ── 分析圖表元件 ──
function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
      <p className="text-3xl font-bold" style={{ color, fontFamily: "var(--font-display)" }}>{value}<span className="text-sm font-normal ml-0.5" style={{ color: "#aaa" }}>{unit}</span></p>
      <p className="text-xs mt-1" style={{ color: "#999" }}>{label}</p>
    </div>
  );
}

function DonutChart({ data, colors }: { data: Record<string, number>; colors: string[] }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-xs" style={{ color: "#ccc" }}>尚無資料</p>;

  const size = 160;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {entries.map(([label, value], i) => {
          const pct = value / total;
          const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
          const dashOffset = -circumference * offset;
          offset += pct;
          return (
            <circle
              key={label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.5s, stroke-dashoffset 0.5s" }}
            />
          );
        })}
        <text x="50%" y="48%" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: "#333" }}>{total}</text>
        <text x="50%" y="62%" textAnchor="middle" style={{ fontSize: 10, fill: "#999" }}>件商品</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {entries.map(([label, value], i) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ color: "#666" }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            {label} {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function RankList({ data, color, max, linkPrefix }: { data: Record<string, number>; color: string; max: number; linkPrefix?: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, max);
  const topVal = entries[0]?.[1] || 1;
  if (entries.length === 0) return <p className="text-xs" style={{ color: "#ccc" }}>尚無資料</p>;

  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-3">
      {entries.map(([name, count], i) => {
        const pct = (count / topVal) * 100;
        const nameEl = linkPrefix ? (
          <Link href={`${linkPrefix}${encodeURIComponent(name)}`} className="hover:underline" style={{ color: "#333", textDecoration: "none" }}>{name}</Link>
        ) : <span style={{ color: "#333" }}>{name}</span>;
        return (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">
                {i < 3 ? <span className="mr-1">{medals[i]}</span> : <span className="text-xs mr-1" style={{ color: "#aaa" }}>{i + 1}.</span>}
                {nameEl}
              </span>
              <span className="text-xs font-bold" style={{ color }}>{count} 件</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 星等評分（互動）──
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0" style={{ cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)} style={{ fontSize: 18, color: i <= (hover || value) ? "#f5a623" : "#ddd", transition: "color 0.1s" }}>★</span>
      ))}
    </span>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (<span key={i} style={{ fontSize: 16, color: i <= rating ? "#f5a623" : "#ddd" }}>★</span>))}
      <span className="text-xs ml-1" style={{ color: "#888" }}>{rating}.0</span>
    </span>
  );
}

function EditIconButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
      </svg>
    </button>
  );
}

function Divider() {
  return <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>;
}

function StaffTabs() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";
  const role = isDev ? devRole.role : ((session as any)?.role || "member");

  if (role !== "staff" && role !== "vendor") return null;

  const tabs = role === "staff"
    ? [{ href: "/dashboard", label: "個人紀錄", exact: true }, { href: "/dashboard/workbench", label: "工作台", exact: false }]
    : [{ href: "/dashboard", label: "個人紀錄", exact: true }, { href: "/dashboard/partner", label: "協作平台", exact: false }];

  return (
    <nav className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors" style={{ color: isActive ? "#1a1a2e" : "#888", borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`, marginBottom: -2 }}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── 保留的元件（之後用）──
function StaffWorkbench() {
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  import("react").then(({ useEffect }) => {});
  return <div className="rounded-xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}><p style={{ color: "var(--color-mist)" }}>工作台</p></div>;
}

function VendorOverview() {
  return <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}><p>合作概覽</p></div>;
}

// ═══════════════════════════════════════════
// 主頁面
// ═══════════════════════════════════════════
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && status === "loading") return null;

  // 所有角色都先看會員總覽（staff/vendor 有額外 tab）
  return <MemberOverview />;
}
