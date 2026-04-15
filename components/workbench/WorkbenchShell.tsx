"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type StaffTab = "動態" | "交接" | "庫存" | "考勤" | "費用";

const tabIcons: Record<StaffTab, string> = {
  "動態": "📢",
  "交接": "📋",
  "庫存": "📦",
  "考勤": "⏰",
  "費用": "💰",
};

interface WorkbenchShellProps {
  displayName?: string;
  email?: string;
}

export default function WorkbenchShell({ displayName = "員工", email = "—" }: WorkbenchShellProps) {
  const [activeTab, setActiveTab] = useState<StaffTab>("動態");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 問候列 */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a2e", color: "#fff" }}>
        <p className="text-xl font-bold mb-2">{displayName} <span className="font-normal">您好</span></p>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          <span>📧 {email}</span>
        </div>
      </div>

      {/* 工作台內容 */}
      <div className="mb-20 mt-4">
        {activeTab === "動態" && <ActivityFeed />}
        {activeTab === "交接" && <HandoverTasks />}
        {activeTab === "庫存" && <InventoryPanel />}
        {activeTab === "考勤" && <AttendancePanel />}
        {activeTab === "費用" && <ExpensePanel />}
      </div>

      {/* 底部 Tab Bar */}
      <div className="sticky bottom-0 z-40" style={{ background: "#fff", borderTop: "1px solid #e8e0d4" }}>
        <div className="flex justify-center">
          <div className="flex" style={{ maxWidth: 600, width: "100%" }}>
            {(Object.keys(tabIcons) as StaffTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex flex-col items-center py-2.5 transition-colors"
                style={{ color: activeTab === tab ? "#7a5c40" : "#999", background: "none", border: "none", cursor: "pointer" }}
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
// 動態 — 從 Supabase 讀取真實庫存異動
// ═══════════════════════════════════════════
function ActivityFeed() {
  const [notifications, setNotifications] = useState<{ id: string; type: string; text: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 查詢庫存為 0 的已上架商品
      const { data: outOfStock } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("status", "active")
        .lte("stock", 0)
        .order("updated_at", { ascending: false })
        .limit(20);

      // 查詢低庫存（1-3）的已上架商品
      const { data: lowStock } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("status", "active")
        .gt("stock", 0)
        .lte("stock", 3)
        .order("updated_at", { ascending: false })
        .limit(10);

      const items: { id: string; type: string; text: string; color: string }[] = [];
      for (const p of outOfStock || []) {
        items.push({ id: p.id, type: "缺貨", text: `商品「${p.name}」已缺貨`, color: "#e53e3e" });
      }
      for (const p of lowStock || []) {
        items.push({ id: p.id, type: "低庫存", text: `商品「${p.name}」庫存僅剩 ${p.stock}`, color: "#e8935a" });
      }

      setNotifications(items);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm p-4" style={{ color: "#999" }}>載入中…</p>;
  if (notifications.length === 0) return <p className="text-sm p-8 text-center" style={{ color: "#999" }}>目前沒有異動通知</p>;

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
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 交接 — 待同步 Notion DB03 資料到 Supabase，目前顯示空狀態
// ═══════════════════════════════════════════
function HandoverTasks() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <span className="text-4xl mb-4">📋</span>
      <p className="text-sm font-semibold mb-2" style={{ color: "#333" }}>交接事項</p>
      <p className="text-xs" style={{ color: "#999" }}>
        交接任務將從 Notion 同步到這裡。請在 Notion DB03（工作項目進度）設定交接事項。
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════
// 庫存 — 保留 UI 框架，統計從 Supabase 讀取
// ═══════════════════════════════════════════
function InventoryPanel() {
  const [mode, setMode] = useState<"商品出貨" | "商品進貨" | "商品盤點">("商品出貨");
  const [subMode, setSubMode] = useState<"一般出貨" | "通路出貨" | "下架退換">("一般出貨");
  const [stats, setStats] = useState({ lowStock: 0, outOfStock: 0 });

  useEffect(() => {
    (async () => {
      const { count: low } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active").gt("stock", 0).lte("stock", 3);
      const { count: out } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active").lte("stock", 0);
      setStats({ lowStock: low || 0, outOfStock: out || 0 });
    })();
  }, []);

  return (
    <div className="grid sm:grid-cols-[280px_1fr] gap-0" style={{ minHeight: 500 }}>
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        <div className="space-y-2 mb-6">
          <StatRow label="低庫存" value={`${stats.lowStock} 項`} />
          <StatRow label="缺貨" value={`${stats.outOfStock} 項`} />
        </div>
        <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>庫存作業</p>
        {(["商品出貨", "商品進貨", "商品盤點"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: mode === m ? "#fff" : "transparent", border: mode === m ? "2px solid #7a5c40" : "1px solid #e8e0d4", color: mode === m ? "#7a5c40" : "#666", fontWeight: mode === m ? 600 : 400, cursor: "pointer" }}>{m}</button>
        ))}
        <p className="text-xs font-semibold mb-2 mt-4" style={{ color: "#888" }}>庫存細項</p>
        {(["一般出貨", "通路出貨", "下架退換"] as const).map((s) => (
          <button key={s} onClick={() => setSubMode(s)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: subMode === s ? "#fff" : "transparent", border: subMode === s ? "2px solid #7a5c40" : "1px solid #e8e0d4", color: subMode === s ? "#7a5c40" : "#666", fontWeight: subMode === s ? 600 : 400, cursor: "pointer" }}>{s}</button>
        ))}
      </div>
      <div className="p-6 flex flex-col items-center justify-center">
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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 考勤 — 保留打卡 UI，移除假紀錄
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

  return (
    <div className="grid sm:grid-cols-[280px_1fr] gap-0" style={{ minHeight: 500 }}>
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        <div className="text-center mb-6 py-4 rounded-lg" style={{ border: "1px solid #e8e0d4" }}>
          <p className="text-4xl font-bold tracking-wider" style={{ color: "#333", fontFamily: "monospace" }}>{timeStr}</p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>{dateStr}</p>
        </div>
        {(["打卡", "日誌", "請假", "加班", "班表"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: subTab === t ? "#2d5016" : "transparent", color: subTab === t ? "#fff" : "#666", border: subTab === t ? "none" : "1px solid #e8e0d4", fontWeight: subTab === t ? 600 : 400, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <div className="p-6">
        {subTab === "打卡" && (
          <div className="flex flex-col items-center">
            <div className="flex justify-center mb-8">
              <button className="w-36 h-36 rounded-full text-white text-lg font-bold flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: "#2d5016", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(45,80,22,0.3)" }}>上班打卡</button>
            </div>
            <p className="text-xs" style={{ color: "#999" }}>打卡紀錄將從 Supabase 讀取</p>
          </div>
        )}
        {subTab !== "打卡" && (
          <div className="text-center py-16"><p className="text-sm" style={{ color: "#aaa" }}>{subTab}功能開發中</p></div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 費用 — 保留表單 UI（這是前端互動，不是假資料）
// ═══════════════════════════════════════════
function ExpensePanel() {
  const [mode, setMode] = useState<"請款" | "請購">("請款");
  const [claimItems, setClaimItems] = useState([{ name: "", price: 0, qty: 1 }]);
  const [claimReceipt, setClaimReceipt] = useState<"有" | "無" | "">("");
  const [claimNote, setClaimNote] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([{ name: "", price: 0, qty: 1, note: "", url: "" }]);

  const claimTotal = claimItems.reduce((s, i) => s + i.price * i.qty, 0);
  const purchaseTotal = purchaseItems.reduce((s, i) => s + i.price * i.qty, 0);

  const addClaimItem = () => setClaimItems([...claimItems, { name: "", price: 0, qty: 1 }]);
  const addPurchaseItem = () => setPurchaseItems([...purchaseItems, { name: "", price: 0, qty: 1, note: "", url: "" }]);
  const updateClaim = (i: number, field: string, value: any) => { setClaimItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item)); };
  const updatePurchase = (i: number, field: string, value: any) => { setPurchaseItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item)); };

  return (
    <div className="grid sm:grid-cols-[240px_1fr] gap-0" style={{ minHeight: 500 }}>
      <div className="p-4" style={{ borderRight: "1px solid #f0f0f0" }}>
        {(["請款", "請購"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: mode === m ? "#fff" : "transparent", border: mode === m ? "2px solid #7a5c40" : "1px solid #e8e0d4", color: mode === m ? "#7a5c40" : "#666", fontWeight: mode === m ? 600 : 400, cursor: "pointer" }}>{m}</button>
        ))}
      </div>
      <div className="p-6">
        {mode === "請款" && (
          <div style={{ maxWidth: 500 }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "#333" }}>請款申請</h3>
            {claimItems.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={item.name} onChange={(e) => updateClaim(i, "name", e.target.value)} placeholder="品項名稱" className="flex-1 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                <input type="number" value={item.price || ""} onChange={(e) => updateClaim(i, "price", Number(e.target.value))} placeholder="金額" className="w-24 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                <input type="number" value={item.qty} onChange={(e) => updateClaim(i, "qty", Number(e.target.value))} className="w-16 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} min={1} />
              </div>
            ))}
            <button onClick={addClaimItem} className="text-xs px-3 py-1.5 rounded mb-4" style={{ color: "#7a5c40", background: "none", border: "1px dashed #7a5c40", cursor: "pointer" }}>+ 新增品項</button>
            <div className="mb-4">
              <label className="text-xs block mb-1" style={{ color: "#888" }}>收據</label>
              <div className="flex gap-2">
                {(["有", "無"] as const).map((v) => (
                  <button key={v} onClick={() => setClaimReceipt(v)} className="px-4 py-1.5 rounded text-sm" style={{ background: claimReceipt === v ? "#7a5c40" : "transparent", color: claimReceipt === v ? "#fff" : "#666", border: "1px solid #ddd", cursor: "pointer" }}>{v}</button>
                ))}
              </div>
            </div>
            <textarea value={claimNote} onChange={(e) => setClaimNote(e.target.value)} placeholder="備註" rows={2} className="w-full px-3 py-2 rounded border text-sm outline-none mb-4" style={{ borderColor: "#ddd" }} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "#333" }}>合計：NT$ {claimTotal.toLocaleString()}</span>
              <button className="px-6 py-2 rounded-lg text-sm font-bold text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>送出請款</button>
            </div>
          </div>
        )}
        {mode === "請購" && (
          <div style={{ maxWidth: 600 }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "#333" }}>請購申請</h3>
            {purchaseItems.map((item, i) => (
              <div key={i} className="mb-3 p-3 rounded-lg" style={{ border: "1px solid #e8e0d4" }}>
                <div className="flex gap-2 mb-2">
                  <input value={item.name} onChange={(e) => updatePurchase(i, "name", e.target.value)} placeholder="品項名稱" className="flex-1 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                  <input type="number" value={item.price || ""} onChange={(e) => updatePurchase(i, "price", Number(e.target.value))} placeholder="預估金額" className="w-28 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                  <input type="number" value={item.qty} onChange={(e) => updatePurchase(i, "qty", Number(e.target.value))} className="w-16 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} min={1} />
                </div>
                <input value={item.note} onChange={(e) => updatePurchase(i, "note", e.target.value)} placeholder="用途說明" className="w-full px-3 py-2 rounded border text-sm outline-none mb-2" style={{ borderColor: "#ddd" }} />
                <input value={item.url} onChange={(e) => updatePurchase(i, "url", e.target.value)} placeholder="參考連結" className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
              </div>
            ))}
            <button onClick={addPurchaseItem} className="text-xs px-3 py-1.5 rounded mb-4" style={{ color: "#7a5c40", background: "none", border: "1px dashed #7a5c40", cursor: "pointer" }}>+ 新增品項</button>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "#333" }}>預估合計：NT$ {purchaseTotal.toLocaleString()}</span>
              <button className="px-6 py-2 rounded-lg text-sm font-bold text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>送出請購</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "#f8f7f4" }}>
      <span className="text-xs" style={{ color: "#888" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: "#333" }}>{value}</span>
    </div>
  );
}
