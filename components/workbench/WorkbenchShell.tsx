"use client";

/**
 * ⚠️ 共用組件 — 改這裡兩個工作台會同步變動
 *
 * 使用者：
 *   - 官網 /dashboard/workbench（NextAuth + 工作團隊角色）
 *   - Telegram /telegram/workbench（Telegram WebApp + member_type=staff）
 *
 * 鐵律：工作台 UI 修改一律改這個檔案，不要在 page.tsx 內複製/分叉組件。
 *       新增 Tab、改 Tab 順序、調整子面板都改這裡，兩端自動同步。
 *
 * 五 Tab：動態 / 交接 / 庫存 / 考勤 / 費用
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TasksPanel from "./TasksPanel";
import BarcodeScanner from "@/components/liff/BarcodeScanner";

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
    <div className="px-3 sm:px-0" style={{ maxWidth: 1100, margin: "0 auto" }}>
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
        {activeTab === "交接" && <TasksPanel userEmail={email} />}
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
// 庫存 — 串接 /api/staff/inventory（DB06→DB05）
// ═══════════════════════════════════════════
type InvItem = { name: string; quantity: number; price: number; cost_price: number; notion_id?: string };
type MiscItem = { name: string; amount: number };

function InventoryPanel() {
  const [operation, setOperation] = useState<"進貨" | "出貨" | "盤點">("出貨");
  const [stats, setStats] = useState({ lowStock: 0, outOfStock: 0 });
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; notion_id: string; name: string; price: number; stock: number }[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // 掃碼結果處理：用 barcode 或 sku 比對 products，找到就加入 items
  const handleScan = async (code: string) => {
    setShowScanner(false);
    const { data, error } = await supabase
      .from("products")
      .select("id, notion_id, name, price, stock, barcode, sku")
      .or(`barcode.eq.${code},sku.eq.${code}`)
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      setResultMsg(`⚠️ 查無條碼 ${code} 對應的商品`);
      return;
    }
    addProduct({ notion_id: data.notion_id, name: data.name, price: data.price });
    setResultMsg(`✅ 已加入：${data.name}`);
  };

  useEffect(() => {
    (async () => {
      const { count: low } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active").gt("stock", 0).lte("stock", 3);
      const { count: out } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active").lte("stock", 0);
      setStats({ lowStock: low || 0, outOfStock: out || 0 });
    })();
  }, []);

  // 搜尋商品（debounce 300ms）
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, stock")
        .ilike("name", `%${search.trim()}%`)
        .limit(8);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addProduct = (p: { notion_id: string; name: string; price: number }) => {
    if (items.find(i => i.notion_id === p.notion_id)) return;
    setItems([...items, { name: p.name, quantity: 1, price: p.price || 0, cost_price: 0, notion_id: p.notion_id }]);
    setSearch(""); setSearchResults([]);
  };
  const updateItem = (i: number, field: keyof InvItem, value: any) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const addMisc = () => setMiscItems([...miscItems, { name: "", amount: 0 }]);
  const updateMisc = (i: number, field: keyof MiscItem, value: any) => {
    setMiscItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };
  const removeMisc = (i: number) => setMiscItems(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (items.length === 0) { setResultMsg("⚠️ 請至少加入一個品項"); return; }
    setSubmitting(true); setResultMsg("");
    try {
      const res = await fetch("/api/staff/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          items: items.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: operation === "出貨" ? i.price : undefined,
            cost_price: operation === "進貨" ? i.cost_price : undefined,
            notion_id: i.notion_id,
          })),
          misc_items: miscItems.filter(m => m.amount > 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setResultMsg("❌ " + (json.error || "送出失敗")); }
      else {
        setResultMsg("✅ " + json.message);
        setItems([]); setMiscItems([]);
      }
    } catch (e: any) {
      setResultMsg("❌ 網路錯誤：" + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((s, i) => s + (operation === "進貨" ? i.cost_price : i.price) * i.quantity, 0)
              + miscItems.reduce((s, m) => s + m.amount, 0);

  return (
    <>
    {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-3 sm:gap-0" style={{ minHeight: 500 }}>
      <div className="py-3 sm:p-4 sm:border-r" style={{ borderColor: "#f0f0f0" }}>
        <div className="space-y-2 mb-6">
          <StatRow label="低庫存" value={`${stats.lowStock} 項`} />
          <StatRow label="缺貨" value={`${stats.outOfStock} 項`} />
        </div>
        <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>庫存作業</p>
        {(["出貨", "進貨", "盤點"] as const).map((m) => (
          <button key={m} onClick={() => setOperation(m)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: operation === m ? "#fff" : "transparent", border: operation === m ? "2px solid #7a5c40" : "1px solid #e8e0d4", color: operation === m ? "#7a5c40" : "#666", fontWeight: operation === m ? 600 : 400, cursor: "pointer" }}>商品{m}</button>
        ))}
      </div>
      <div className="py-3 sm:p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: "#333" }}>商品{operation}</h2>

        {/* 搜尋 */}
        <div className="relative mb-4" style={{ maxWidth: 500 }}>
          <div className="flex items-center h-11 px-4 rounded-lg" style={{ border: "1px solid #ddd" }}>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => {
                // iOS Telegram WebApp：鍵盤升起時搜尋欄會被蓋住，
                // 等鍵盤動畫完成後主動 scroll input 到可見中央
                const target = e.target;
                setTimeout(() => {
                  target.scrollIntoView({ block: "center", behavior: "smooth" });
                }, 350);
              }}
              placeholder="輸入商品名稱搜尋..."
              className="flex-1 min-w-0 text-sm outline-none bg-transparent" />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              aria-label="掃描條碼"
              className="ml-2 p-1 rounded transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
            >
              📷
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
              style={{ background: "#fff", border: "1px solid #ddd", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full text-left px-4 py-2 text-sm flex justify-between items-center hover:bg-gray-50"
                  style={{ background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                  <span>{p.name}</span>
                  <span className="text-xs" style={{ color: "#999" }}>庫存 {p.stock} · NT$ {p.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 品項清單 */}
        {items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#aaa" }}>請從上方搜尋並加入品項</p>
        ) : (
          <div className="mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center mb-2 p-2 rounded" style={{ border: "1px solid #e8e0d4" }}>
                <span className="flex-1 text-sm font-medium" style={{ color: "#333" }}>{item.name}</span>
                <input type="number" value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  placeholder="數量" min={1}
                  className="w-20 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                {operation !== "盤點" && (
                  <input type="number" value={(operation === "進貨" ? item.cost_price : item.price) || ""}
                    onChange={(e) => updateItem(i, operation === "進貨" ? "cost_price" : "price", Number(e.target.value))}
                    placeholder={operation === "進貨" ? "進價" : "售價"}
                    className="w-24 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                )}
                <button onClick={() => removeItem(i)} className="text-xs px-2 py-1" style={{ color: "#e53e3e", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 雜支（運費/稅）*/}
        {operation !== "盤點" && (
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "#888" }}>雜支（運費/稅，選填）</p>
            {miscItems.map((m, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <input value={m.name} onChange={(e) => updateMisc(i, "name", e.target.value)} placeholder="項目（如：運費）"
                  className="flex-1 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                <input type="number" value={m.amount || ""} onChange={(e) => updateMisc(i, "amount", Number(e.target.value))}
                  placeholder="金額" className="w-28 px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
                <button onClick={() => removeMisc(i)} className="text-xs px-2 py-1" style={{ color: "#e53e3e", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={addMisc} className="text-xs px-3 py-1.5 rounded" style={{ color: "#7a5c40", background: "none", border: "1px dashed #7a5c40", cursor: "pointer" }}>+ 新增雜支</button>
          </div>
        )}

        {/* 送出 */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid #f0f0f0" }}>
          <span className="text-sm font-bold" style={{ color: "#333" }}>
            {operation === "盤點" ? `品項數：${items.length}` : `合計：NT$ ${total.toLocaleString()}`}
          </span>
          <button onClick={submit} disabled={submitting || items.length === 0}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: submitting ? "#aaa" : "#7a5c40", border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: items.length === 0 ? 0.5 : 1 }}>
            {submitting ? "送出中…" : `送出${operation}`}
          </button>
        </div>
        {resultMsg && <p className="text-sm mt-3" style={{ color: resultMsg.startsWith("✅") ? "#2d5016" : "#e53e3e" }}>{resultMsg}</p>}
      </div>
    </div>
    </>
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
    <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-3 sm:gap-0" style={{ minHeight: 500 }}>
      <div className="py-3 sm:p-4 sm:border-r" style={{ borderColor: "#f0f0f0" }}>
        <div className="text-center mb-6 py-4 rounded-lg" style={{ border: "1px solid #e8e0d4" }}>
          <p className="text-4xl font-bold tracking-wider" style={{ color: "#333", fontFamily: "monospace" }}>{timeStr}</p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>{dateStr}</p>
        </div>
        {(["打卡", "日誌", "請假", "加班", "班表"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: subTab === t ? "#2d5016" : "transparent", color: subTab === t ? "#fff" : "#666", border: subTab === t ? "none" : "1px solid #e8e0d4", fontWeight: subTab === t ? 600 : 400, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <div className="py-3 sm:p-6">
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
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-3 sm:gap-0" style={{ minHeight: 500 }}>
      <div className="py-3 sm:p-4 sm:border-r" style={{ borderColor: "#f0f0f0" }}>
        {(["請款", "請購"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: mode === m ? "#fff" : "transparent", border: mode === m ? "2px solid #7a5c40" : "1px solid #e8e0d4", color: mode === m ? "#7a5c40" : "#666", fontWeight: mode === m ? 600 : 400, cursor: "pointer" }}>{m}</button>
        ))}
      </div>
      <div className="py-3 sm:p-6">
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
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: "#f8f7f4" }}>
      <span className="text-xs flex-shrink-0" style={{ color: "#888" }}>{label}</span>
      <span className="text-sm font-bold whitespace-nowrap" style={{ color: "#333" }}>{value}</span>
    </div>
  );
}
