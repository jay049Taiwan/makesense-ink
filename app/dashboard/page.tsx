"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

// ═══════════════════════════════════════════
// 一般會員總覽
// ═══════════════════════════════════════════
function MemberOverview() {
  const { data: session } = useSession();
  const displayName = (session as any)?.displayName || session?.user?.name || "會員";
  const email = session?.user?.email || "—";

  // 模擬已購商品資料（之後接 API）
  const [purchases] = useState([
    { id: "1", name: "市集攤位費｜旅人書店", qty: 1, author: "—", publisher: "旅人書店", date: "2026/04/06", rating: 0, comment: "", category: "市集", topics: ["在地市集"] },
    { id: "2", name: "走讀收費", qty: 2, author: "—", publisher: "旅人書店", date: "2026/04/06", rating: 0, comment: "", category: "走讀", topics: ["文化走讀", "宜蘭故事"] },
    { id: "3", name: "加購宜蘭街散步圖", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/04/06", rating: 0, comment: "", category: "商品", topics: ["城鎮散步"] },
    { id: "4", name: "走讀收費", qty: 3, author: "—", publisher: "旅人書店", date: "2026/04/06", rating: 0, comment: "", category: "走讀", topics: ["文化走讀"] },
    { id: "5", name: "蘭東案內 04期", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/04/04", rating: 5, comment: "很棒！", category: "書籍", topics: ["蘭東案內", "地方誌"] },
    { id: "6", name: "宜蘭金牌旅遊王", qty: 1, author: "黃育智", publisher: "玉山社", date: "2026/04/01", rating: 4, comment: "內容豐富", category: "書籍", topics: ["旅遊文學", "宜蘭故事"] },
    { id: "7", name: "蘭東案內 05期", qty: 1, author: "旅人書店", publisher: "旅人書店", date: "2026/03/28", rating: 0, comment: "", category: "書籍", topics: ["蘭東案內", "地方誌"] },
    { id: "8", name: "散步宜蘭街貼紙", qty: 2, author: "—", publisher: "旅人書店", date: "2026/03/20", rating: 0, comment: "", category: "商品", topics: ["城鎮散步"] },
  ]);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const pendingCount = purchases.filter((p) => p.rating === 0 && !submitted[p.id]).length;

  const handleSubmitRating = (id: string) => {
    if (!ratings[id]) return;
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
      {/* ── 問候列 ── */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-2">
          {displayName} <span className="font-normal">您好</span>
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span className="flex items-center gap-1">📧 {email}<EditIcon /></span>
          <Divider />
          <span className="flex items-center gap-1">💬 LINE 未綁定<EditIcon /></span>
          <Divider />
          <span className="flex items-center gap-1">📱 —<EditIcon /></span>
          <Divider />
          <span>⭐ 積分 <strong style={{ color: "#ffcc00", fontSize: 16 }}>0</strong> / 0</span>
        </div>
      </div>

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
                  const links: Record<string, string> = { "講座": "/cultureclub", "空間體驗": "/space-booking", "付費文章": "/viewpoint-stroll" };
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

function EditIcon() {
  return (
    <Link href="/dashboard/profile" title="編輯">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }}>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
      </svg>
    </Link>
  );
}

function Divider() {
  return <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>;
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
  if (status === "loading") return null;
  return <MemberOverview />;
}
