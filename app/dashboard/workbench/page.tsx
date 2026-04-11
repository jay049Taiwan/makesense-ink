"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type StaffTab = "動態" | "交接" | "庫存" | "考勤" | "費用";

const tabIcons: Record<StaffTab, string> = {
  "動態": "📢",
  "交接": "📋",
  "庫存": "📦",
  "考勤": "⏰",
  "費用": "💰",
};

export default function WorkbenchPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const displayName = (session as any)?.displayName || session?.user?.name || "會員";
  const email = session?.user?.email || "—";
  const [activeTab, setActiveTab] = useState<StaffTab>("動態");

  const pageTabs = [
    { href: "/dashboard", label: "會員中心", exact: true },
    { href: "/dashboard/workbench", label: "工作台", exact: false },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 問候列 */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-2">{displayName} <span className="font-normal">您好</span></p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span>📧 {email}</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>💬 LINE 未綁定</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span>📱 —</span>
        </div>
      </div>

      {/* 分頁 tab */}
      <nav className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "2px solid #e8e8e8" }}>
        {pageTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors" style={{ color: isActive ? "#1a1a2e" : "#888", borderBottom: `2px solid ${isActive ? "#4ECDC4" : "transparent"}`, marginBottom: -2 }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* 工作台內容 */}
      <div className="mb-20">
        {activeTab === "動態" && <ActivityFeed />}
        {activeTab === "交接" && <HandoverTasks />}
        {activeTab === "庫存" && <InventoryPanel />}
        {activeTab === "考勤" && <AttendancePanel />}
        {activeTab === "費用" && <ExpensePanel />}
      </div>

      {/* 底部 Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "#fff", borderTop: "1px solid #e8e0d4" }}>
        <div className="flex justify-center">
          <div className="flex" style={{ maxWidth: 600, width: "100%" }}>
            {(Object.keys(tabIcons) as StaffTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex flex-col items-center py-2.5 transition-colors"
                style={{
                  color: activeTab === tab ? "#7a5c40" : "#999",
                  fontWeight: activeTab === tab ? 700 : 400,
                  borderTop: activeTab === tab ? "2px solid #7a5c40" : "2px solid transparent",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span className="text-lg">{tabIcons[tab]}</span>
                <span className="text-xs mt-0.5">{tab}</span>
                {activeTab === tab && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#7a5c40" }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 動態 — 庫存異動、系統通知
// ═══════════════════════════════════════════
function ActivityFeed() {
  const notifications = [
    { id: "1", type: "庫存", date: "2026-04-10", text: "商品「教練我想打球」已缺貨", color: "#e53e3e" },
    { id: "2", type: "庫存", date: "2026-04-10", text: "商品「大稻埕賣小藝」已缺貨", color: "#e53e3e" },
    { id: "3", type: "庫存", date: "2026-04-10", text: "商品「池袋西口公園」已缺貨", color: "#e53e3e" },
    { id: "4", type: "庫存", date: "2026-04-10", text: "商品「宜蘭金牌旅遊王」已缺貨", color: "#e53e3e" },
    { id: "5", type: "庫存", date: "2026-04-10", text: "商品「在世界的每一天：閱讀與書寫‧生命敘事文選②」已缺貨", color: "#e53e3e" },
    { id: "6", type: "庫存", date: "2026-04-10", text: "商品「旅行的意義」已缺貨", color: "#e53e3e" },
    { id: "7", type: "庫存", date: "2026-04-10", text: "商品「木作匙叉 35」已缺貨", color: "#e53e3e" },
    { id: "8", type: "庫存", date: "2026-04-10", text: "商品「手作繪圖木掛勾」已缺貨", color: "#e53e3e" },
  ];

  return (
    <div>
      {notifications.map((n) => (
        <div key={n.id} className="flex items-start gap-3 p-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex-shrink-0 mt-0.5">
            <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: n.color }}>{n.type}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: "#333" }}>{n.text}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-xs" style={{ color: "#aaa" }}>{n.date}</span>
            <span style={{ color: "#ccc", cursor: "pointer" }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 交接 — 待辦事項（from Notion DB03/DB04）
// ═══════════════════════════════════════════
function HandoverTasks() {
  // DB05 工作項目（模擬資料）
  const [tasks, setTasks] = useState([
    { id: "1", title: "走讀｜115文學館", person: "林四九", date: "2026/04/15", note: "路線確認、場地聯繫", done: false,
      subtasks: [
        { id: "s1", title: "路線腳本完成", done: false },
        { id: "s2", title: "保險申請", done: false },
        { id: "s3", title: "講義雜支", done: false },
      ]},
    { id: "2", title: "三星銀柳鄉提案提供", person: "林四九", date: "2026/04/12", note: "", done: false,
      subtasks: [
        { id: "s4", title: "提案文件準備", done: false },
        { id: "s5", title: "報價單確認", done: true },
      ]},
    { id: "3", title: "NOTION的ROLL對象會自己同步", person: "林四九", date: "2026/04/10", note: "同步設定已調整", done: false,
      subtasks: [
        { id: "s6", title: "確認同步邏輯", done: true },
        { id: "s7", title: "測試回報", done: false },
      ]},
    { id: "4", title: "保險費用", person: "林四九", date: "2026/04/08", note: "", done: false,
      subtasks: [
        { id: "s8", title: "保費單據整理", done: false },
      ]},
    { id: "5", title: "管考雜支｜115文學館", person: "林四九", date: "2026/03/28", note: "已結案", done: true,
      subtasks: [
        { id: "s9", title: "收據整理", done: true },
        { id: "s10", title: "請款作業", done: true },
      ]},
    { id: "6", title: "策展佈置費", person: "林四九", date: "2026/03/25", note: "已結案", done: true,
      subtasks: [
        { id: "s11", title: "佈置費報價", done: true },
        { id: "s12", title: "完工驗收", done: true },
      ]},
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id || null);
  const selected = tasks.find((t) => t.id === selectedId);

  const unfinished = tasks.filter((t) => !t.done);
  const finished = tasks.filter((t) => t.done);

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const updated = { ...t, subtasks: t.subtasks.map((s) => s.id === subtaskId ? { ...s, done: !s.done } : s) };
      // 全部子任務完成 → 標記 DB05 完成
      updated.done = updated.subtasks.every((s) => s.done);
      return updated;
    }));
  };

  return (
    <div className="grid sm:grid-cols-[320px_1fr] gap-0" style={{ minHeight: 500 }}>
      {/* ── 左欄：DB05 工作項目 ── */}
      <div style={{ borderRight: "1px solid #f0f0f0", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #e8e0d4" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#333" }}>交接事項</h3>
          <button className="text-xs" style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>🔄</button>
        </div>

        {/* 未完成 */}
        <div className="px-3 py-2">
          <p className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: "#7a5c40", color: "#fff", display: "inline-block" }}>
            未完成 {unfinished.length}
          </p>
        </div>
        {unfinished.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className="w-full text-left px-4 py-3 transition-colors"
            style={{
              borderBottom: "1px dashed #e8e0d4",
              background: selectedId === t.id ? "#f5f0e8" : "transparent",
              borderLeft: selectedId === t.id ? "3px solid #7a5c40" : "3px solid transparent",
              cursor: "pointer", border: "none", borderBottomStyle: "dashed", borderBottomWidth: 1, borderBottomColor: "#e8e0d4",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "#333" }}>{t.title}</p>
            <p className="text-xs mt-0.5" style={{ color: "#999" }}>
              {t.person} ・ {t.subtasks.filter(s => s.done).length}/{t.subtasks.length} 完成
            </p>
          </button>
        ))}

        {/* 已完成 */}
        {finished.length > 0 && (
          <>
            <div className="px-3 py-2 mt-2">
              <p className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: "#ccc", color: "#fff", display: "inline-block" }}>
                已完成 {finished.length}
              </p>
            </div>
            {finished.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-4 py-3"
                style={{
                  borderBottom: "1px dashed #e8e0d4",
                  background: selectedId === t.id ? "#f5f0e8" : "transparent",
                  cursor: "pointer", border: "none", borderBottomStyle: "dashed", borderBottomWidth: 1, borderBottomColor: "#e8e0d4",
                }}
              >
                <p className="text-sm" style={{ color: "#aaa", textDecoration: "line-through" }}>{t.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#ccc" }}>{t.person}</p>
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── 右欄 ── */}
      <div>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <span className="text-4xl mb-2">👈</span>
            <p className="text-sm" style={{ color: "#aaa" }}>點選左側交接項目</p>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* 右上：DB05 基本資訊 */}
            <div className="p-4" style={{ borderBottom: "1px solid #e8e0d4", background: selected.done ? "#f9f9f9" : "#fff" }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold" style={{ color: selected.done ? "#aaa" : "#333", textDecoration: selected.done ? "line-through" : "none" }}>
                  {selected.title}
                </h4>
                {selected.done && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#d4edda", color: "#155724" }}>已完成</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#888" }}>
                <span>📅 執行時間：{selected.date}</span>
                <span>👤 負責人：{selected.person}</span>
              </div>
              {selected.note && (
                <p className="text-xs mt-2 px-3 py-2 rounded" style={{ background: "#faf8f4", color: "#666" }}>
                  📝 {selected.note}
                </p>
              )}
            </div>

            {/* 右下：DB06 相關子任務（佔 2/3） */}
            <div className="flex-1 p-4" style={{ background: "#fafafa" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "#888" }}>
                相關進銷明細（DB06）— {selected.subtasks.filter(s => s.done).length}/{selected.subtasks.length} 已完成
              </p>
              <div className="space-y-2">
                {selected.subtasks.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "#fff", border: sub.done ? "1px solid #d4edda" : "1px solid #e8e0d4" }}
                  >
                    <input
                      type="checkbox"
                      checked={sub.done}
                      onChange={() => toggleSubtask(selected.id, sub.id)}
                      className="w-4 h-4 accent-green-600 flex-shrink-0"
                    />
                    <span className="text-sm" style={{
                      color: sub.done ? "#aaa" : "#333",
                      textDecoration: sub.done ? "line-through" : "none",
                    }}>
                      {sub.title}
                    </span>
                    {sub.done && <span className="ml-auto text-xs" style={{ color: "#4CAF50" }}>✓</span>}
                  </label>
                ))}
              </div>

              {selected.subtasks.every(s => s.done) && (
                <div className="mt-4 p-3 rounded-lg text-center text-sm" style={{ background: "#d4edda", color: "#155724" }}>
                  ✅ 所有項目已完成，此工作已結案
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 庫存 — 出貨/進貨/盤點
// ═══════════════════════════════════════════
function InventoryPanel() {
  const [mode, setMode] = useState<"商品出貨" | "商品進貨" | "商品盤點">("商品出貨");
  const [subMode, setSubMode] = useState<"一般出貨" | "通路出貨" | "下架退換">("一般出貨");

  return (
    <div className="grid sm:grid-cols-[280px_1fr] gap-0" style={{ minHeight: 500 }}>
      {/* 左側選單 */}
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        {/* 統計 */}
        <div className="space-y-2 mb-6">
          <StatRow label="今日營收" value="NT$ ---" />
          <StatRow label="今日筆數" value="--- 筆" />
          <StatRow label="待出貨" value="--- 件" />
          <StatRow label="低庫存" value="--- 項" />
        </div>

        {/* 庫存作業 */}
        <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>庫存作業</p>
        {(["商品出貨", "商品進貨", "商品盤點"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{
              background: mode === m ? "#fff" : "transparent",
              border: mode === m ? "2px solid #7a5c40" : "1px solid #e8e0d4",
              color: mode === m ? "#7a5c40" : "#666",
              fontWeight: mode === m ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}

        {/* 庫存細項 */}
        <p className="text-xs font-semibold mb-2 mt-4" style={{ color: "#888" }}>庫存細項</p>
        {(["一般出貨", "通路出貨", "下架退換"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSubMode(s)}
            className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{
              background: subMode === s ? "#fff" : "transparent",
              border: subMode === s ? "2px solid #7a5c40" : "1px solid #e8e0d4",
              color: subMode === s ? "#7a5c40" : "#666",
              fontWeight: subMode === s ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 右側操作區 */}
      <div className="p-6 flex flex-col items-center justify-center">
        {/* 搜尋/掃碼 */}
        <div className="w-full mb-8" style={{ maxWidth: 500 }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center h-11 px-4 rounded-lg" style={{ border: "1px solid #ddd" }}>
              <input type="text" placeholder="掃碼 或 輸入商品名稱..." className="flex-1 text-sm outline-none bg-transparent" />
              <span style={{ color: "#999" }}>🔍</span>
            </div>
            <button className="h-11 w-11 rounded-lg flex items-center justify-center" style={{ background: "#1a1a2e", border: "none", cursor: "pointer" }}>
              <span className="text-white text-lg">📷</span>
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: "#333" }}>{mode}</h2>
        <p className="text-sm" style={{ color: "#999" }}>掃描商品條碼開始{mode}</p>
        <p className="text-xs mt-1" style={{ color: "#ccc" }}>輸入商品名稱搜尋，或按 SCAN 掃碼</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 考勤 — 打卡/日誌/請假/加班/班表
// ═══════════════════════════════════════════
function AttendancePanel() {
  const [subTab, setSubTab] = useState<"打卡" | "日誌" | "請假" | "加班" | "班表">("打卡");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("zh-TW", { hour12: false });
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${"日一二三四五六"[now.getDay()]}`;

  const recentRecords = [
    { date: "03/23", time: "09:00", type: "打卡上班" },
    { date: "03/19", time: "18:05", type: "打卡下班" },
    { date: "03/19", time: "08:56", type: "打卡上班" },
    { date: "03/18", time: "18:10", type: "打卡下班" },
    { date: "03/18", time: "09:02", type: "打卡上班" },
    { date: "03/17", time: "17:55", type: "打卡下班" },
    { date: "03/17", time: "08:45", type: "打卡上班" },
    { date: "03/16", time: "18:30", type: "打卡下班" },
    { date: "03/16", time: "08:58", type: "打卡上班" },
  ];

  return (
    <div className="grid sm:grid-cols-[280px_1fr] gap-0" style={{ minHeight: 500 }}>
      {/* 左側 */}
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        {/* 時鐘 */}
        <div className="text-center mb-6 py-4 rounded-lg" style={{ border: "1px solid #e8e0d4" }}>
          <p className="text-4xl font-bold tracking-wider" style={{ color: "#333", fontFamily: "monospace" }}>{timeStr}</p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>{dateStr}</p>
          <p className="text-xs mt-1" style={{ color: "#ccc" }}>尚未打卡</p>
        </div>

        {/* 子 Tab */}
        {(["打卡", "日誌", "請假", "加班", "班表"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{
              background: subTab === t ? "#2d5016" : "transparent",
              color: subTab === t ? "#fff" : "#666",
              border: subTab === t ? "none" : "1px solid #e8e0d4",
              fontWeight: subTab === t ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 右側 */}
      <div className="p-6">
        {subTab === "打卡" && (
          <>
            {/* 打卡按鈕 */}
            <div className="flex justify-center mb-8">
              <button
                className="w-36 h-36 rounded-full text-white text-lg font-bold flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: "#2d5016", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(45,80,22,0.3)" }}
              >
                上班打卡
              </button>
            </div>

            {/* 近期紀錄 */}
            <h4 className="text-sm font-semibold mb-3" style={{ color: "#333" }}>近期打卡紀錄</h4>
            {recentRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-4 py-2" style={{ borderBottom: "1px solid #f5f5f5" }}>
                <span className="text-sm" style={{ color: "#666", width: 50 }}>{r.date}</span>
                <span className="text-sm" style={{ color: "#666", width: 50 }}>{r.time}</span>
                <span className="text-sm font-semibold" style={{ color: r.type.includes("上班") ? "#2d5016" : "#e53e3e" }}>{r.type}</span>
              </div>
            ))}
          </>
        )}
        {subTab !== "打卡" && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "#aaa" }}>{subTab}功能開發中</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 費用 — 報銷申請
// ═══════════════════════════════════════════
function ExpensePanel() {
  const [mode, setMode] = useState<"請款" | "請購">("請款");

  // 請款表單
  const [claimItems, setClaimItems] = useState([{ name: "", price: 0, qty: 1 }]);
  const [claimReceipt, setClaimReceipt] = useState<"有" | "無" | "">("");
  const [claimNote, setClaimNote] = useState("");

  // 請購表單
  const [purchaseItems, setPurchaseItems] = useState([{ name: "", price: 0, qty: 1, note: "", url: "" }]);

  const claimTotal = claimItems.reduce((s, i) => s + i.price * i.qty, 0);
  const purchaseTotal = purchaseItems.reduce((s, i) => s + i.price * i.qty, 0);

  const addClaimItem = () => setClaimItems([...claimItems, { name: "", price: 0, qty: 1 }]);
  const addPurchaseItem = () => setPurchaseItems([...purchaseItems, { name: "", price: 0, qty: 1, note: "", url: "" }]);

  const updateClaim = (i: number, field: string, value: any) => {
    setClaimItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const updatePurchase = (i: number, field: string, value: any) => {
    setPurchaseItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  return (
    <div className="grid sm:grid-cols-[240px_1fr] gap-0" style={{ minHeight: 500 }}>
      {/* 左欄：請款/請購切換 */}
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        <p className="text-xs font-semibold mb-3" style={{ color: "#888" }}>費用類型</p>
        {(["請款", "請購"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors"
            style={{
              background: mode === m ? "#7a5c40" : "transparent",
              color: mode === m ? "#fff" : "#666",
              border: mode === m ? "none" : "1px solid #e8e0d4",
              fontWeight: mode === m ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {m === "請款" ? "💸 請款（報銷）" : "🛒 請購（採買）"}
          </button>
        ))}

        <div className="mt-6 p-3 rounded-lg" style={{ background: "#faf8f4" }}>
          <p className="text-xs" style={{ color: "#888" }}>本次{mode}金額</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#7a5c40" }}>
            NT$ {(mode === "請款" ? claimTotal : purchaseTotal).toLocaleString()}
          </p>
        </div>
      </div>

      {/* 右欄：表單 */}
      <div className="p-6" style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
        {mode === "請款" ? (
          <>
            <h4 className="text-base font-bold mb-4" style={{ color: "#333" }}>💸 請款申請</h4>

            {/* 請款明細 */}
            {claimItems.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_80px_auto] gap-2 mb-3 items-end">
                <div>
                  {i === 0 && <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>請款項目</label>}
                  <input type="text" value={item.name} onChange={(e: any) => updateClaim(i, "name", e.target.value)} placeholder="例：走讀講師費" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                </div>
                <div>
                  {i === 0 && <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>單價</label>}
                  <input type="number" value={item.price || ""} onChange={(e: any) => updateClaim(i, "price", Number(e.target.value))} placeholder="0" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                </div>
                <div>
                  {i === 0 && <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>數量</label>}
                  <input type="number" value={item.qty} onChange={(e: any) => updateClaim(i, "qty", Number(e.target.value))} min={1} className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none" }} />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-bold" style={{ color: "#7a5c40", whiteSpace: "nowrap" }}>= {(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <button onClick={addClaimItem} className="text-xs mb-6" style={{ color: "#4ECDC4", background: "none", border: "none", cursor: "pointer" }}>+ 新增項目</button>

            {/* 總計 */}
            <div className="flex justify-end mb-6 px-2">
              <div className="text-right">
                <span className="text-xs" style={{ color: "#888" }}>合計金額</span>
                <p className="text-2xl font-bold" style={{ color: "#7a5c40" }}>NT$ {claimTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* 核銷憑證 */}
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>核銷憑證</label>
              <div className="flex gap-3">
                {(["有", "無"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#333" }}>
                    <input type="radio" name="receipt" checked={claimReceipt === v} onChange={() => setClaimReceipt(v)} className="accent-amber-700" />
                    {v === "有" ? "✅ 有憑證" : "❌ 無憑證"}
                  </label>
                ))}
              </div>
            </div>

            {/* 備註 */}
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>備註</label>
              <textarea value={claimNote} onChange={(e: any) => setClaimNote(e.target.value)} placeholder="請補充說明..." rows={3} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", resize: "vertical" }} />
            </div>

            {/* 上傳照片 */}
            <div className="mb-6">
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>上傳照片（收據/發票）</label>
              <div className="flex items-center justify-center h-24 rounded-lg cursor-pointer hover:opacity-80" style={{ border: "2px dashed #ddd", background: "#fafafa" }}>
                <span className="text-sm" style={{ color: "#aaa" }}>📷 點擊上傳或拖曳檔案</span>
              </div>
            </div>

            <button className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>
              送出請款申請
            </button>
          </>
        ) : (
          <>
            <h4 className="text-base font-bold mb-4" style={{ color: "#333" }}>🛒 請購申請</h4>

            {purchaseItems.map((item, i) => (
              <div key={i} className="p-4 rounded-lg mb-3" style={{ border: "1px solid #e8e0d4", background: "#fafafa" }}>
                <div className="grid grid-cols-[1fr_100px_80px] gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>品名</label>
                    <input type="text" value={item.name} onChange={(e: any) => updatePurchase(i, "name", e.target.value)} placeholder="例：A4影印紙" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>單價</label>
                    <input type="number" value={item.price || ""} onChange={(e: any) => updatePurchase(i, "price", Number(e.target.value))} placeholder="0" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>數量</label>
                    <input type="number" value={item.qty} onChange={(e: any) => updatePurchase(i, "qty", Number(e.target.value))} min={1} className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>備註</label>
                    <input type="text" value={item.note} onChange={(e: any) => updatePurchase(i, "note", e.target.value)} placeholder="選填" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>參考連結</label>
                    <input type="url" value={item.url} onChange={(e: any) => updatePurchase(i, "url", e.target.value)} placeholder="https://..." className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid #ddd", outline: "none", background: "#fff" }} />
                  </div>
                </div>
                {/* 上傳照片 */}
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "#888" }}>商品照片</label>
                  <div className="flex items-center justify-center h-16 rounded-lg cursor-pointer" style={{ border: "1px dashed #ddd", background: "#fff" }}>
                    <span className="text-xs" style={{ color: "#aaa" }}>📷 上傳照片</span>
                  </div>
                </div>
                <div className="text-right mt-2">
                  <span className="text-sm font-bold" style={{ color: "#7a5c40" }}>小計 NT$ {(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
            ))}

            <button onClick={addPurchaseItem} className="text-xs mb-4" style={{ color: "#4ECDC4", background: "none", border: "none", cursor: "pointer" }}>+ 新增品項</button>

            <div className="flex justify-end mb-6">
              <div className="text-right">
                <span className="text-xs" style={{ color: "#888" }}>合計金額</span>
                <p className="text-2xl font-bold" style={{ color: "#7a5c40" }}>NT$ {purchaseTotal.toLocaleString()}</p>
              </div>
            </div>

            <button className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>
              送出請購申請
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── 共用元件 ──
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-lg" style={{ border: "1px solid #e8e0d4" }}>
      <p className="text-[10px]" style={{ color: "#999" }}>{label}</p>
      <p className="text-base font-bold" style={{ color: "#333" }}>{value}</p>
    </div>
  );
}
