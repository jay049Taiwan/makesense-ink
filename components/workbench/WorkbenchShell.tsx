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
 * 七 Tab：動態 / 訂單 / 交接 / 庫存 / 紀錄 / 費用 / 績效
 */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { staffFetch } from "@/lib/staff-fetch";
import TasksPanel from "./TasksPanel";
import BarcodeScanner from "@/components/liff/BarcodeScanner";
import ProductCreateModal, { type ProductDraft } from "./ProductCreateModal";
import PagePreviewModal from "./PagePreviewModal";

type StaffTab = "動態" | "訂單" | "交接" | "庫存" | "紀錄" | "費用" | "績效";

const tabIcons: Record<StaffTab, string> = {
  "動態": "📢",
  "訂單": "🧾",
  "交接": "📋",
  "庫存": "📦",
  "紀錄": "📓",
  "費用": "💰",
  "績效": "📊",
};

interface WorkbenchShellProps {
  displayName?: string;
  email?: string;
}

export default function WorkbenchShell({ displayName = "員工", email = "—" }: WorkbenchShellProps) {
  const [activeTab, setActiveTab] = useState<StaffTab>("動態");

  return (
    <div className="px-3 sm:px-0" style={{ maxWidth: 1200, margin: "0 auto" }}>
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
        {activeTab === "訂單" && <OrdersPanel />}
        {activeTab === "交接" && <TasksPanel userEmail={email} />}
        {activeTab === "庫存" && <InventoryPanel />}
        {activeTab === "紀錄" && <AttendancePanel />}
        {activeTab === "費用" && <ExpensePanel />}
        {activeTab === "績效" && <MetricsPanel />}
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
// 動態 — 從 workbench_notifications 讀已掃出的事件
// 規則：
//   - 開 Tab 時即時呼叫 /api/staff/workbench/notifications 觸發後端掃描 + 取列表
//   - DB04: 「執行狀態 = 執行中」+ last_edited_time 變化
//   - DB07: 「發佈狀態 = 已發佈」, stock 0/non-0 transition
//   - 點選 → PagePreviewModal 顯示 Notion page 唯讀內容
// ═══════════════════════════════════════════
type NotifItem = {
  id: string;
  source_db: "DB04" | "DB07";
  notion_id: string;
  event_type: "db04_updated" | "stock_zero" | "stock_restocked";
  event_at: string;
  title: string | null;
  metadata: any;
};

const EVENT_LABELS: Record<NotifItem["event_type"], { text: string; color: string; icon: string }> = {
  db04_updated:    { text: "更新",   color: "#7a5c40", icon: "📋" },
  stock_zero:      { text: "缺貨",   color: "#e53e3e", icon: "⚠️" },
  stock_restocked: { text: "補貨",   color: "#2d5016", icon: "✅" },
};

// Module-level cache（跨 ActivityFeed mount/unmount 保留）
// 切換 tab 來回時不會閃「載入中」+ 重新 fetch 一次，
// user 看到的是上次的 items，背景 silent revalidate 後才更新。
let _cachedItems: NotifItem[] | null = null;
let _cachedWarnings: string[] = [];
let _cachedAt = 0;
const REVALIDATE_TTL_MS = 60_000; // 60 秒內 mount 不重打 API（n8n cron 5 分鐘跑一次，60s revalidate 夠新鮮）

function ActivityFeed() {
  const [items, setItems] = useState<NotifItem[]>(_cachedItems || []);
  const [loading, setLoading] = useState(_cachedItems === null);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>(_cachedWarnings);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // scan=true → 強制觸發後端掃描 DB04/DB07（慢，user 主動點）
  // scan=false → 只取 cached events（秒回，背景 silent revalidate）
  const load = async (scan = false) => {
    // 非強制掃描 + cache 還新鮮 → skip，連 fetch 都不打
    if (!scan && _cachedItems !== null && Date.now() - _cachedAt < REVALIDATE_TTL_MS) {
      return;
    }
    // 第一次（cache 空）才擋 UI 顯示「載入中」；revalidate 不擋
    if (_cachedItems === null) setLoading(true);
    setError("");
    try {
      const url = scan ? "/api/staff/workbench/notifications?scan=1" : "/api/staff/workbench/notifications";
      const res = await staffFetch(url);
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error(`回應非 JSON：${text.slice(0, 100)}`); }
      if (!res.ok || !json.ok) throw new Error(json.error || "載入失敗");
      const fresh = (json.items || []) as NotifItem[];
      const wa = (json.warnings || []) as string[];
      setItems(fresh);
      setWarnings(wa);
      _cachedItems = fresh;
      _cachedWarnings = wa;
      _cachedAt = Date.now();
    } catch (err: any) {
      setError(err?.message || "未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  return (
    <>
      {previewId && <PagePreviewModal notionId={previewId} onClose={() => setPreviewId(null)} />}

      {/* Header：標題 + 兩個更新按鈕 */}
      <div className="flex items-center justify-between px-4 py-3 gap-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <p className="text-sm font-bold" style={{ color: "#333" }}>動態 ({items.length})</p>
        <div className="flex gap-2">
          <button
            onClick={() => load(false)}
            disabled={loading}
            title="只重抓 cached events，不重掃描 Notion（n8n cron 每 5 分鐘自動掃）"
            className="text-xs px-2 py-1 rounded"
            style={{ color: "#666", background: "transparent", border: "1px solid #ddd", cursor: loading ? "wait" : "pointer" }}
          >
            {loading ? "…" : "🔄 重新整理"}
          </button>
          <button
            onClick={() => load(true)}
            disabled={loading}
            title="主動掃描 Notion DB04/DB07（較慢，通常用 n8n 自動掃，這個按鈕是手動補上）"
            className="text-xs px-2 py-1 rounded"
            style={{ color: "#7a5c40", background: "transparent", border: "1px solid #7a5c40", cursor: loading ? "wait" : "pointer" }}
          >
            {loading ? "掃描中…" : "強制掃描"}
          </button>
        </div>
      </div>

      {loading && items.length === 0 && (
        <p className="text-sm p-8 text-center" style={{ color: "#999" }}>載入中…</p>
      )}

      {error && (
        <p className="text-sm p-4" style={{ color: "#e53e3e" }}>⚠️ 載入失敗：{error}</p>
      )}

      {warnings.length > 0 && (
        <div className="px-4 py-3 mx-3 my-2 rounded text-xs" style={{ background: "#fff5f5", border: "1px solid #fcc", color: "#c33" }}>
          <p className="font-bold mb-1">⚠️ 部分掃描失敗（其他通知仍正常顯示）：</p>
          {warnings.map((w, i) => (
            <p key={i} className="break-all" style={{ marginTop: 4 }}>• {w}</p>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="text-sm p-8 text-center" style={{ color: "#999" }}>目前沒有動態通知</p>
      )}

      <div>
        {items.map((n) => {
          const label = EVENT_LABELS[n.event_type] || { text: "通知", color: "#888", icon: "•" };
          const timeStr = formatRelativeTime(n.event_at);
          return (
            <button
              key={n.id}
              onClick={() => setPreviewId(n.notion_id)}
              className="w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50"
              style={{ background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
            >
              <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white whitespace-nowrap" style={{ background: label.color }}>
                  {label.icon} {label.text}
                </span>
                <span className="text-[9px]" style={{ color: "#aaa" }}>{n.source_db}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#333" }}>{n.title || "（未命名）"}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#888" }}>{timeStr}</p>
              </div>
              <span className="text-xs self-center" style={{ color: "#aaa" }}>›</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// 相對時間：「剛剛」「3 分鐘前」「2 小時前」「3 天前」「2026-04-20」
function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return iso.slice(0, 10);
}

// ═══════════════════════════════════════════
// 庫存 — 串接 /api/staff/inventory（DB06→DB05）
// 重新設計（2026/04/28）：
//   - 整頁單欄 1200px、頂部三等分操作切換
//   - 掃完跳「數量」輸入框（預設 1，Enter 過）
//   - 同 SKU 自動累加並跳清單最前面 + 1.5s 高亮
//   - 雜支區改快捷按鈕（+稅 +運費 +包裝 +自訂）
//   - 每品項加「✎ 備註」按鈕
//   - 清單超 20 筆顯示過濾框
//   - 盤點隱藏金額/雜支/合計，顯示「品項數·總件數」
//   - 全部清空按鈕
//   - CSV 匯出（5 欄統一格式 + metadata header；雜支放明細最後）
// ═══════════════════════════════════════════
type InvItem = {
  uid: string;          // 唯一識別（React key、高亮、備註編輯用）
  name: string;
  quantity: number;
  price: number;
  cost_price: number;
  notion_id?: string;
  sku?: string;         // 商品 ID（ISBN/條碼），給 CSV 用
  note?: string;        // 每筆備註
  // 背景建檔流程用：
  tempId?: string;
  pending?: boolean;
  error?: string;
};
type MiscItem = { uid: string; name: string; amount: number };
type ScanSource = "scan" | "search";  // 數量框完成後決定要不要重開掃碼器
type QuantityPromptState = {
  product: { notion_id: string; name: string; price: number; sku?: string };
  existingQty: number;
  source: ScanSource;
} | null;

const OP_ICON: Record<"出貨" | "進貨" | "盤點", string> = {
  "出貨": "📦",
  "進貨": "📥",
  "盤點": "📋",
};

const genUid = () => `uid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function InventoryPanel() {
  const [operation, setOperation] = useState<"進貨" | "出貨" | "盤點">("出貨");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; notion_id: string; name: string; price: number; stock: number; sku: string }[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [pendingNewSku, setPendingNewSku] = useState<string | null>(null);
  const [askCreate, setAskCreate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // 新增 state
  const [filter, setFilter] = useState("");
  const [justAddedUid, setJustAddedUid] = useState<string | null>(null);
  const [quantityPrompt, setQuantityPrompt] = useState<QuantityPromptState>(null);
  const [editingNoteUid, setEditingNoteUid] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // 搜尋商品（debounce 300ms）
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, notion_id, name, price, stock, sku")
        .ilike("name", `%${search.trim()}%`)
        .limit(8);
      setSearchResults((data || []) as any);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 鍵盤快捷鍵：Shift+1/2/3 切換 出貨/進貨/盤點
  // 用 e.code 而非 e.key（避免不同鍵盤布局下 Shift+1 = "!" 的問題）
  // 在 input/textarea/contentEditable 裡時不觸發，避免使用者打字時誤切
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      if (e.code === "Digit1") { e.preventDefault(); setOperation("出貨"); }
      else if (e.code === "Digit2") { e.preventDefault(); setOperation("進貨"); }
      else if (e.code === "Digit3") { e.preventDefault(); setOperation("盤點"); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // 掃碼結果處理：sku/barcode 比對 products
  const handleScan = async (code: string) => {
    setShowScanner(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      const { data: bySku } = await supabase
        .from("products")
        .select("id, notion_id, name, price, stock, sku")
        .eq("sku", code)
        .limit(1)
        .maybeSingle();
      let product: any = bySku;
      if (!product) {
        const { data: byBarcode } = await supabase
          .from("products")
          .select("id, notion_id, name, price, stock, sku")
          .eq("barcode", code)
          .limit(1)
          .maybeSingle();
        product = byBarcode;
      }
      if (!product) {
        setPendingNewSku(code);
        setAskCreate(true);
        setResultMsg("");
        return;
      }
      askQuantity(
        { notion_id: product.notion_id, name: product.name, price: product.price, sku: product.sku || code },
        "scan"
      );
    } catch (err: any) {
      setResultMsg(`❌ 查詢失敗：${err?.message || "未知錯誤"}`);
    }
  };

  // 跳「本次幾個」輸入框
  const askQuantity = (
    product: { notion_id: string; name: string; price: number; sku?: string },
    source: ScanSource
  ) => {
    const existing = items.find(i => i.notion_id === product.notion_id);
    setQuantityPrompt({ product, existingQty: existing?.quantity || 0, source });
    setSearch("");
    setSearchResults([]);
  };

  // 確認數量 → 累加或新增 → 高亮 1.5s → 跳清單最前面 → 視來源重開掃碼器
  const confirmQuantity = (qty: number) => {
    if (!quantityPrompt || qty <= 0) return;
    const { product, source } = quantityPrompt;
    let targetUid = "";
    let isNewItem = false;
    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.notion_id === product.notion_id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        targetUid = existing.uid;
        const updated: InvItem = { ...existing, quantity: existing.quantity + qty };
        const rest = prev.filter((_, idx) => idx !== existingIdx);
        return [updated, ...rest];
      } else {
        const uid = genUid();
        targetUid = uid;
        isNewItem = true;
        const newItem: InvItem = {
          uid,
          name: product.name,
          quantity: qty,
          price: product.price || 0,
          cost_price: 0,
          notion_id: product.notion_id,
          sku: product.sku,
        };
        return [newItem, ...prev];
      }
    });
    setJustAddedUid(targetUid);
    setTimeout(() => setJustAddedUid(curr => (curr === targetUid ? null : curr)), 1500);
    setResultMsg(isNewItem ? `✅ 已加入：${product.name}` : `➕ ${product.name} +${qty}`);
    setQuantityPrompt(null);
    if (source === "scan") {
      setTimeout(() => setShowScanner(true), 100);
    }
  };

  // 建檔表單填齊：modal 立刻關 + 樂觀加入清單（pending）+ 背景跑上傳/建檔
  const handleCreateSubmit = async (draft: ProductDraft) => {
    setShowCreateModal(false);
    setPendingNewSku(null);

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newUid = genUid();
    setItems((prev) => [
      { uid: newUid, name: draft.name, quantity: 1, price: draft.price, cost_price: 0, sku: draft.sku, tempId, pending: true },
      ...prev,
    ]);
    setJustAddedUid(newUid);
    setTimeout(() => setJustAddedUid(curr => (curr === newUid ? null : curr)), 1500);
    setResultMsg(`⏳ ${draft.name} 建檔中…`);

    try {
      const fd = new FormData();
      fd.append("file", draft.photoFile);
      fd.append("folder", "makesense/products");
      const upRes = await fetch("/api/upload-image", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.url) throw new Error(upJson.error || "照片上傳失敗");

      const createRes = await staffFetch("/api/staff/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: draft.sku,
          name: draft.name,
          price: draft.price,
          photoUrl: upJson.url,
          authorId: draft.authorId,
          publisherId: draft.publisherId,
          authorName: draft.authorName,
          publisherName: draft.publisherName,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok || !createJson.ok) throw new Error(createJson.error || "建檔失敗");
      const product = createJson.product;
      if (!product?.notion_id) throw new Error("API 回傳缺少 notion_id");

      setItems(prev =>
        prev.map(it =>
          it.uid === newUid
            ? {
                ...it,
                notion_id: product.notion_id,
                name: product.name || draft.name,
                price: product.price ?? draft.price,
                sku: product.sku || draft.sku,
                pending: false,
                tempId: undefined,
              }
            : it
        )
      );
      setResultMsg(`✅ ${product.name || draft.name} 建檔完成`);
    } catch (err: any) {
      setItems(prev =>
        prev.map(it => (it.uid === newUid ? { ...it, pending: false, error: err?.message || "建檔失敗" } : it))
      );
      setResultMsg(`❌ 建檔失敗：${err?.message || "未知錯誤"}`);
    }
  };

  const updateItem = (uid: string, field: keyof InvItem, value: any) => {
    setItems(prev => prev.map(it => (it.uid === uid ? { ...it, [field]: value } : it)));
  };
  const removeItem = (uid: string) => setItems(prev => prev.filter(it => it.uid !== uid));

  const addMisc = (presetName: string = "") => {
    setMiscItems(prev => [...prev, { uid: genUid(), name: presetName, amount: 0 }]);
  };
  const updateMisc = (uid: string, field: keyof MiscItem, value: any) => {
    setMiscItems(prev => prev.map(m => (m.uid === uid ? { ...m, [field]: value } : m)));
  };
  const removeMisc = (uid: string) => setMiscItems(prev => prev.filter(m => m.uid !== uid));

  const openNoteEditor = (uid: string) => {
    const it = items.find(i => i.uid === uid);
    setEditingNoteValue(it?.note || "");
    setEditingNoteUid(uid);
  };
  const saveNote = () => {
    if (!editingNoteUid) return;
    updateItem(editingNoteUid, "note", editingNoteValue.trim());
    setEditingNoteUid(null);
    setEditingNoteValue("");
  };

  const clearAll = () => {
    setItems([]);
    setMiscItems([]);
    setConfirmClear(false);
    setResultMsg("");
  };

  const submit = async () => {
    if (items.length === 0) { setResultMsg("⚠️ 請至少加入一個品項"); return; }
    if (items.some(i => i.pending)) { setResultMsg("⏳ 還有商品在背景建檔，請等所有 ⏳ 圖示消失再送出"); return; }
    if (items.some(i => i.error)) { setResultMsg("❌ 有建檔失敗的品項，請先移除"); return; }
    setSubmitting(true); setResultMsg("");
    try {
      const res = await staffFetch("/api/staff/inventory", {
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
            note: i.note,
          })),
          misc_items: operation === "盤點" ? [] : miscItems.filter(m => m.amount > 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResultMsg("❌ " + (json.error || "送出失敗"));
      } else {
        setResultMsg("✅ " + json.message);
        setItems([]); setMiscItems([]);
      }
    } catch (e: any) {
      setResultMsg("❌ 網路錯誤：" + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // CSV 匯出（5 欄統一格式 + metadata header；雜支當「特殊品項」放最後）
  const exportCsv = () => {
    if (items.length === 0) {
      setResultMsg("⚠️ 沒有品項可匯出");
      return;
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const tsFile = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const escape = (v: string | number | undefined | null) => {
      const s = v === undefined || v === null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: string[] = [];
    rows.push(`時間,${escape(ts)}`);
    rows.push(`模式,${operation}`);
    rows.push(`品項數,${items.length}`);
    rows.push(`總件數,${totalQty}`);
    rows.push("");
    rows.push("商品ID,商品名稱,單價,數量,備註");
    for (const it of items) {
      const unitPrice = operation === "盤點" ? "" : (operation === "進貨" ? it.cost_price : it.price);
      rows.push(
        [escape(it.sku), escape(it.name), escape(unitPrice || ""), escape(it.quantity), escape(it.note || "")].join(",")
      );
    }
    if (operation !== "盤點") {
      for (const m of miscItems.filter(m => m.amount > 0)) {
        rows.push(
          [escape(""), escape(m.name || "雜支"), escape(m.amount), escape(1), escape("雜支")].join(",")
        );
      }
    }
    const csv = "\uFEFF" + rows.join("\n");  // UTF-8 BOM 給 Excel 認得中文
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${operation}_${tsFile}_${items.length}項.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setResultMsg(`📊 已匯出 ${operation}_${tsFile}.csv`);
  };

  // ── Computed ──
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const productSubtotal = items.reduce(
    (s, i) => s + (operation === "進貨" ? i.cost_price : i.price) * i.quantity,
    0
  );
  const miscTotal = miscItems.reduce((s, m) => s + m.amount, 0);
  const grandTotal = productSubtotal + miscTotal;
  const showFilter = items.length > 20;
  const filteredItems = filter.trim() ? items.filter(i => i.name.includes(filter.trim())) : items;

  // ───────── Render ─────────
  return (
    <>
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* 數量輸入框 */}
      {quantityPrompt && (
        <QuantityPromptOverlay
          product={quantityPrompt.product}
          existingQty={quantityPrompt.existingQty}
          onConfirm={confirmQuantity}
          onCancel={() => setQuantityPrompt(null)}
        />
      )}

      {/* 備註編輯 */}
      {editingNoteUid && (
        <NoteEditorOverlay
          value={editingNoteValue}
          onChange={setEditingNoteValue}
          onSave={saveNote}
          onCancel={() => { setEditingNoteUid(null); setEditingNoteValue(""); }}
        />
      )}

      {/* 全部清空確認 */}
      {confirmClear && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#fff" }}>
            <p className="text-base font-bold mb-2" style={{ color: "#333" }}>確認全部清空？</p>
            <p className="text-sm mb-4" style={{ color: "#666" }}>
              清單上 {items.length} 個品項{miscItems.length > 0 ? `、${miscItems.length} 筆雜支` : ""} 將被清掉，無法復原。
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-4 py-2 text-sm rounded-lg" style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: "pointer" }}>取消</button>
              <button onClick={clearAll} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: "#e53e3e", border: "none", cursor: "pointer" }}>清空</button>
            </div>
          </div>
        </div>
      )}

      {/* 查無此商品 → 是否建檔 */}
      {askCreate && pendingNewSku && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#fff" }}>
            <p className="text-base font-bold mb-2" style={{ color: "#333" }}>查無此商品</p>
            <p className="text-sm mb-4" style={{ color: "#666" }}>
              條碼 <code style={{ background: "#f8f7f4", padding: "2px 6px", borderRadius: 4 }}>{pendingNewSku}</code> 在系統中找不到，要建檔嗎？
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setAskCreate(false); setPendingNewSku(null); }} className="px-4 py-2 text-sm rounded-lg" style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: "pointer" }}>取消</button>
              <button onClick={() => { setAskCreate(false); setShowCreateModal(true); }} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>建檔</button>
            </div>
          </div>
        </div>
      )}

      {/* 建檔表單 modal */}
      {showCreateModal && pendingNewSku && (
        <ProductCreateModal
          initialSku={pendingNewSku}
          onSubmit={handleCreateSubmit}
          onClose={() => { setShowCreateModal(false); setPendingNewSku(null); }}
        />
      )}

      {/* === Main UI === */}
      <div className="px-1 sm:px-0">
        {/* 1. 三等分頂部按鈕（含 Shift+1/2/3 快捷鍵）*/}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["出貨", "進貨", "盤點"] as const).map((op, idx) => {
            const selected = operation === op;
            return (
              <button
                key={op}
                onClick={() => setOperation(op)}
                title={`${op}（Shift+${idx + 1}）`}
                className="py-3 rounded-lg text-sm transition-colors flex flex-col items-center gap-1"
                style={{
                  background: selected ? "#fff" : "transparent",
                  border: selected ? "2px solid #7a5c40" : "1px solid #e8e0d4",
                  color: selected ? "#7a5c40" : "#666",
                  fontWeight: selected ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                <span className="text-xl">{OP_ICON[op]}</span>
                <span>{op}</span>
              </button>
            );
          })}
        </div>

        {/* 2. 標題 */}
        <h2 className="text-xl font-bold mb-3" style={{ color: "#333" }}>
          {operation === "盤點" ? "商品盤點" : `商品${operation}`}
        </h2>

        {/* 3. 搜尋 + 掃碼 */}
        <div className="relative mb-4">
          <div className="flex items-center h-11 px-4 rounded-lg" style={{ border: "1px solid #ddd" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => {
                const target = e.target;
                setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
              }}
              placeholder="輸入商品名稱搜尋…"
              className="flex-1 min-w-0 text-sm outline-none bg-transparent"
            />
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
            <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: "#fff", border: "1px solid #ddd", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => askQuantity({ notion_id: p.notion_id, name: p.name, price: p.price, sku: p.sku }, "search")}
                  className="w-full text-left px-4 py-2 text-sm flex justify-between items-center hover:bg-gray-50"
                  style={{ background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                >
                  <span>{p.name}</span>
                  <span className="text-xs" style={{ color: "#999" }}>庫存 {p.stock} · NT$ {p.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. 品項清單 header + 全部清空 */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: "#555" }}>品項清單（{items.length}）</h3>
          {items.length > 0 && (
            <button onClick={() => setConfirmClear(true)} className="text-xs px-2 py-1 rounded" style={{ color: "#999", background: "transparent", border: "1px solid #ddd", cursor: "pointer" }}>全部清空</button>
          )}
        </div>

        {/* 5. 過濾框（>20 筆才顯示）*/}
        {showFilter && (
          <div className="mb-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`🔍 過濾清單（${items.length} 筆）…`}
              className="w-full px-3 py-2 text-sm outline-none rounded"
              style={{ border: "1px solid #ddd", background: "#fafafa" }}
            />
          </div>
        )}

        {/* 6. 品項清單 */}
        {items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#aaa" }}>掃條碼或搜尋商品開始加入</p>
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e8e0d4", color: "#888" }}>
                  <th className="text-left py-2 px-2 font-medium text-xs">商品</th>
                  <th className="text-center py-2 px-2 font-medium text-xs" style={{ width: 70 }}>數量</th>
                  {operation !== "盤點" && (
                    <>
                      <th className="text-center py-2 px-2 font-medium text-xs" style={{ width: 80 }}>{operation === "進貨" ? "進價" : "單價"}</th>
                      <th className="text-right py-2 px-2 font-medium text-xs" style={{ width: 80 }}>小計</th>
                    </>
                  )}
                  <th className="text-center py-2 px-2 font-medium text-xs" style={{ width: 36 }}>備註</th>
                  <th className="text-center py-2 px-2 font-medium text-xs" style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isHighlight = justAddedUid === item.uid;
                  const lineTotal = (operation === "進貨" ? item.cost_price : item.price) * item.quantity;
                  const rowBg = item.error ? "#fff5f5" : item.pending ? "#faf8f4" : isHighlight ? "#fff8e1" : "transparent";
                  const rowBorder = item.error ? "#e53e3e" : "#f0f0f0";
                  const colSpan = operation === "盤點" ? 4 : 6;
                  return (
                    <React.Fragment key={item.uid}>
                      <tr style={{ borderBottom: `1px solid ${rowBorder}`, background: rowBg, transition: "background 0.5s" }}>
                        <td className="py-2 px-2">
                          <span className="text-sm font-medium" style={{ color: item.pending ? "#888" : "#333" }}>
                            {isHighlight && "✨ "}
                            {item.pending && "⏳ "}
                            {item.error && "❌ "}
                            {item.name}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(item.uid, "quantity", Number(e.target.value))}
                            disabled={item.pending}
                            min={1}
                            className="w-16 px-2 py-1 rounded border text-sm outline-none text-center"
                            style={{ borderColor: "#ddd", background: item.pending ? "#f0f0f0" : "#fff" }}
                          />
                        </td>
                        {operation !== "盤點" && (
                          <>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                value={(operation === "進貨" ? item.cost_price : item.price) || ""}
                                onChange={(e) => updateItem(item.uid, operation === "進貨" ? "cost_price" : "price", Number(e.target.value))}
                                disabled={item.pending}
                                className="w-20 px-2 py-1 rounded border text-sm outline-none text-right"
                                style={{ borderColor: "#ddd", background: item.pending ? "#f0f0f0" : "#fff" }}
                              />
                            </td>
                            <td className="py-2 px-2 text-right text-sm" style={{ color: "#333", fontWeight: 600 }}>
                              {lineTotal > 0 ? `$${lineTotal.toLocaleString()}` : "—"}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => openNoteEditor(item.uid)}
                            disabled={item.pending}
                            className="text-xs px-2 py-1"
                            style={{ color: item.note ? "#7a5c40" : "#999", background: "none", border: "none", cursor: item.pending ? "not-allowed" : "pointer" }}
                          >
                            {item.note ? "📝" : "✎"}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => removeItem(item.uid)} className="text-xs px-2 py-1" style={{ color: "#e53e3e", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                        </td>
                      </tr>
                      {item.note && (
                        <tr style={{ background: rowBg, borderBottom: `1px solid ${rowBorder}` }}>
                          <td colSpan={colSpan} className="px-2 pb-2 text-xs" style={{ color: "#7a5c40" }}>📝 {item.note}</td>
                        </tr>
                      )}
                      {item.pending && (
                        <tr style={{ background: rowBg, borderBottom: `1px solid ${rowBorder}` }}>
                          <td colSpan={colSpan} className="px-2 pb-2 text-xs" style={{ color: "#7a5c40" }}>建檔中…完成後才能送出</td>
                        </tr>
                      )}
                      {item.error && (
                        <tr style={{ background: rowBg, borderBottom: `1px solid ${rowBorder}` }}>
                          <td colSpan={colSpan} className="px-2 pb-2 text-xs" style={{ color: "#e53e3e" }}>建檔失敗：{item.error}（請點 ✕ 移除）</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. 雜支區（盤點隱藏）*/}
        {operation !== "盤點" && (
          <div className="mb-4">
            <p className="text-sm font-bold mb-2" style={{ color: "#555" }}>雜支（運費／稅／包裝）</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: "+ 稅", preset: "稅" },
                { label: "+ 運費", preset: "運費" },
                { label: "+ 包裝", preset: "包裝" },
                { label: "+ 自訂", preset: "" },
              ].map(b => (
                <button
                  key={b.label}
                  onClick={() => addMisc(b.preset)}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ color: "#7a5c40", background: "none", border: "1px dashed #7a5c40", cursor: "pointer" }}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {miscItems.map(m => (
              <div key={m.uid} className="flex gap-2 items-center mb-2">
                <input
                  value={m.name}
                  onChange={(e) => updateMisc(m.uid, "name", e.target.value)}
                  placeholder="項目（如：運費）"
                  className="flex-1 px-3 py-2 rounded border text-sm outline-none"
                  style={{ borderColor: "#ddd" }}
                />
                <input
                  type="number"
                  value={m.amount || ""}
                  onChange={(e) => updateMisc(m.uid, "amount", Number(e.target.value))}
                  placeholder="金額"
                  className="w-28 px-3 py-2 rounded border text-sm outline-none"
                  style={{ borderColor: "#ddd" }}
                />
                <button onClick={() => removeMisc(m.uid)} className="text-xs px-2 py-1" style={{ color: "#e53e3e", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 8. Footer：合計／品項數 + CSV 匯出 + 送出 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-4" style={{ borderTop: "1px solid #f0f0f0" }}>
          <div className="text-sm font-bold" style={{ color: "#333" }}>
            {operation === "盤點"
              ? <>品項數：<span style={{ color: "#7a5c40" }}>{items.length}</span> 種 · 總件數：<span style={{ color: "#7a5c40" }}>{totalQty.toLocaleString()}</span> 件</>
              : <>合計：NT$ {grandTotal.toLocaleString()}</>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              disabled={items.length === 0}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ background: "transparent", border: "1px solid #7a5c40", color: "#7a5c40", cursor: items.length === 0 ? "not-allowed" : "pointer", opacity: items.length === 0 ? 0.4 : 1 }}
            >
              📊 匯出 CSV
            </button>
            {(() => {
              const pendingCount = items.filter(i => i.pending).length;
              const errorCount = items.filter(i => i.error).length;
              const blocked = pendingCount > 0 || errorCount > 0;
              const buttonLabel = submitting
                ? "送出中…"
                : pendingCount > 0
                  ? `⏳ 等 ${pendingCount} 件商品建檔中…`
                  : errorCount > 0
                    ? `⚠️ 有 ${errorCount} 件失敗請移除`
                    : `送出 ${operation === "盤點" ? "盤點" : "商品" + operation}`;
              return (
                <button
                  onClick={submit}
                  disabled={submitting || items.length === 0 || blocked}
                  className="px-5 py-2 text-sm rounded-lg text-white font-bold"
                  style={{ background: submitting || blocked ? "#aaa" : "#7a5c40", border: "none", cursor: submitting || blocked ? "not-allowed" : "pointer", opacity: items.length === 0 ? 0.5 : 1 }}
                >
                  {buttonLabel}
                </button>
              );
            })()}
          </div>
        </div>
        {resultMsg && (
          <p
            className="text-sm mt-3"
            style={{
              color:
                resultMsg.startsWith("✅") || resultMsg.startsWith("📊")
                  ? "#2d5016"
                  : resultMsg.startsWith("⚠️") || resultMsg.startsWith("⏳") || resultMsg.startsWith("➕")
                    ? "#7a5c40"
                    : "#e53e3e",
            }}
          >
            {resultMsg}
          </p>
        )}
      </div>
    </>
  );
}

// 數量輸入小框（掃碼／點選後跳出）
function QuantityPromptOverlay({
  product,
  existingQty,
  onConfirm,
  onCancel,
}: {
  product: { notion_id: string; name: string; price: number; sku?: string };
  existingQty: number;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const submitNow = () => {
    if (qty > 0) onConfirm(qty);
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold mb-1" style={{ color: "#333" }}>{product.name}</p>
        <p className="text-xs mb-4" style={{ color: "#888" }}>
          {existingQty > 0 ? `已掃過 ${existingQty} 個 · ` : ""}本次新增？
        </p>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded text-lg" style={{ border: "1px solid #ddd", background: "#f8f7f4", cursor: "pointer" }}>−</button>
          <input
            ref={inputRef}
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitNow(); } }}
            min={1}
            className="flex-1 h-10 px-3 text-center text-lg outline-none rounded"
            style={{ border: "1px solid #ddd" }}
            inputMode="numeric"
          />
          <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded text-lg" style={{ border: "1px solid #ddd", background: "#f8f7f4", cursor: "pointer" }}>＋</button>
        </div>
        <div className="flex gap-2 mb-4">
          {[5, 10, 20].map(n => (
            <button key={n} onClick={() => setQty(n)} className="flex-1 px-3 py-1.5 rounded text-sm" style={{ border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer" }}>×{n}</button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg" style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: "pointer" }}>取消</button>
          <button onClick={submitNow} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>✓ 加入 {qty} 個</button>
        </div>
      </div>
    </div>
  );
}

// 備註編輯小框
function NoteEditorOverlay({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold mb-3" style={{ color: "#333" }}>編輯備註</p>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="例：封面破損／客戶指定／試銷品…"
          className="w-full px-3 py-2 rounded text-sm outline-none mb-4 resize-none"
          style={{ border: "1px solid #ddd" }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg" style={{ background: "transparent", border: "1px solid #ddd", color: "#666", cursor: "pointer" }}>取消</button>
          <button onClick={onSave} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: "#7a5c40", border: "none", cursor: "pointer" }}>儲存</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 紀錄 — 打卡/日誌/請假/加班 UI
//   - 寫入：POST /api/staff/attendance（同時寫 Notion DB05 + Supabase staff_activities）
//   - 讀取：GET  /api/staff/attendance?sub_type=...（走 Supabase staff_activities）
// ═══════════════════════════════════════════
type AttendanceSubTab = "打卡" | "日誌" | "請假" | "加班";

interface AttendanceRecord {
  id: string;
  task_type: string;
  detail: any;
  activity_date: string | null;
  hours: number | null;
  notion_db05_id: string | null;
  created_at: string;
}

function AttendancePanel() {
  const [subTab, setSubTab] = useState<AttendanceSubTab>("打卡");
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
        {(["打卡", "日誌", "請假", "加班"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} className="w-full text-left px-4 py-3 rounded-lg mb-1 text-sm transition-colors"
            style={{ background: subTab === t ? "#2d5016" : "transparent", color: subTab === t ? "#fff" : "#666", border: subTab === t ? "none" : "1px solid #e8e0d4", fontWeight: subTab === t ? 600 : 400, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <div className="py-3 sm:p-6">
        {subTab === "打卡" && <PunchForm />}
        {subTab === "日誌" && <LogForm />}
        {subTab === "請假" && <LeaveForm />}
        {subTab === "加班" && <OvertimeForm />}
      </div>
    </div>
  );
}

// 共用：歷史紀錄列表
function RecentRecords({ subType, refreshKey }: { subType: AttendanceSubTab; refreshKey: number }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    staffFetch(`/api/staff/attendance?sub_type=${encodeURIComponent(subType)}&limit=20`)
      .then((r) => r.json())
      .then((j) => { if (!abort) setRecords(j.records || []); })
      .catch(() => { if (!abort) setRecords([]); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [subType, refreshKey]);

  if (loading) return <p className="text-xs text-center py-4" style={{ color: "#999" }}>載入中…</p>;
  if (records.length === 0) return <p className="text-xs text-center py-4" style={{ color: "#aaa" }}>尚無{subType}紀錄</p>;

  return (
    <div className="space-y-1.5">
      {records.map((r) => (
        <div key={r.id} className="text-xs px-3 py-2 rounded" style={{ background: "#faf8f4", border: "1px solid #f0ebe2" }}>
          <div className="flex justify-between items-start gap-2">
            <span style={{ color: "#666" }}>{summarizeRecord(r)}</span>
            <span style={{ color: "#aaa", whiteSpace: "nowrap" }}>{fmtAgo(r.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function summarizeRecord(r: AttendanceRecord): string {
  const d = r.detail || {};
  if (r.task_type === "打卡") return `${d.action || "上班"}打卡`;
  if (r.task_type === "日誌") return d.content ? String(d.content).slice(0, 40) : "—";
  if (r.task_type === "請假") return `${d.leave_type || "請假"} ${d.start_date || ""}~${d.end_date || ""}`;
  if (r.task_type === "加班") return `${d.date || r.activity_date || ""} ${r.hours || d.hours || 0}h`;
  return r.task_type;
}

function fmtAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)} 秒前`;
  if (diff < 3600) return `${Math.round(diff / 60)} 分前`;
  if (diff < 86400) return `${Math.round(diff / 3600)} 小時前`;
  return `${Math.round(diff / 86400)} 天前`;
}

// 打卡
function PunchForm() {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const punch = async (action: "上班" | "下班") => {
    if (submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await staffFetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_type: "打卡", payload: { action } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setMsg({ kind: "ok", text: `${action}打卡成功` });
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-6">
        <div className="flex gap-4 mb-4">
          <button onClick={() => punch("上班")} disabled={submitting} className="w-32 h-32 rounded-full text-white text-base font-bold transition-transform hover:scale-105 disabled:opacity-50"
            style={{ background: "#2d5016", border: "none", cursor: submitting ? "wait" : "pointer", boxShadow: "0 4px 20px rgba(45,80,22,0.3)" }}>上班打卡</button>
          <button onClick={() => punch("下班")} disabled={submitting} className="w-32 h-32 rounded-full text-white text-base font-bold transition-transform hover:scale-105 disabled:opacity-50"
            style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer", boxShadow: "0 4px 20px rgba(122,92,64,0.3)" }}>下班打卡</button>
        </div>
        {msg && (
          <p className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</p>
        )}
      </div>
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "#999" }}>最近打卡</h4>
        <RecentRecords subType="打卡" refreshKey={refreshKey} />
      </div>
    </div>
  );
}

// 日誌
function LogForm() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const submit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await staffFetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_type: "日誌", payload: { content: content.trim() } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setMsg({ kind: "ok", text: "日誌已送出" });
      setContent("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h3 className="text-base font-bold mb-3" style={{ color: "#333" }}>工作日誌</h3>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="今天做了什麼、進度、卡點…" rows={5}
        className="w-full px-3 py-2 rounded border text-sm outline-none mb-3" style={{ borderColor: "#ddd" }} />
      <div className="flex items-center justify-between mb-6">
        {msg ? <span className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</span> : <span />}
        <button onClick={submit} disabled={!content.trim() || submitting} className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "送出中…" : "送出日誌"}</button>
      </div>
      <h4 className="text-xs font-bold mb-2" style={{ color: "#999" }}>最近日誌</h4>
      <RecentRecords subType="日誌" refreshKey={refreshKey} />
    </div>
  );
}

// 請假
function LeaveForm() {
  const [leaveType, setLeaveType] = useState("特休");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const submit = async () => {
    if (!startDate || !endDate || submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await staffFetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub_type: "請假",
          payload: { leave_type: leaveType, start_date: startDate, end_date: endDate, reason },
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setMsg({ kind: "ok", text: "請假已送出" });
      setStartDate(""); setEndDate(""); setReason("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h3 className="text-base font-bold mb-3" style={{ color: "#333" }}>請假申請</h3>
      <label className="text-xs block mb-1" style={{ color: "#888" }}>假別</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {(["特休", "病假", "事假", "公假", "其他"] as const).map((v) => (
          <button key={v} onClick={() => setLeaveType(v)} className="px-3 py-1.5 rounded text-sm"
            style={{ background: leaveType === v ? "#7a5c40" : "transparent", color: leaveType === v ? "#fff" : "#666", border: "1px solid #ddd", cursor: "pointer" }}>{v}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs block mb-1" style={{ color: "#888" }}>起始日</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: "#888" }}>結束日</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
        </div>
      </div>
      <label className="text-xs block mb-1" style={{ color: "#888" }}>事由</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="（選填）"
        className="w-full px-3 py-2 rounded border text-sm outline-none mb-3" style={{ borderColor: "#ddd" }} />
      <div className="flex items-center justify-between mb-6">
        {msg ? <span className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</span> : <span />}
        <button onClick={submit} disabled={!startDate || !endDate || submitting} className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "送出中…" : "送出請假"}</button>
      </div>
      <h4 className="text-xs font-bold mb-2" style={{ color: "#999" }}>最近請假</h4>
      <RecentRecords subType="請假" refreshKey={refreshKey} />
    </div>
  );
}

// 加班
function OvertimeForm() {
  const [date, setDate] = useState("");
  const [hours, setHours] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setDate(iso);
  }, []);

  const submit = async () => {
    const h = Number(hours);
    if (!date || !h || h <= 0 || submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await staffFetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_type: "加班", payload: { date, hours: h, reason } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setMsg({ kind: "ok", text: "加班已送出" });
      setHours(""); setReason("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h3 className="text-base font-bold mb-3" style={{ color: "#333" }}>加班申請</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs block mb-1" style={{ color: "#888" }}>日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: "#888" }}>時數</label>
          <input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value === "" ? "" : Number(e.target.value))} placeholder="例 2.5"
            className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "#ddd" }} />
        </div>
      </div>
      <label className="text-xs block mb-1" style={{ color: "#888" }}>事由</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="（選填）"
        className="w-full px-3 py-2 rounded border text-sm outline-none mb-3" style={{ borderColor: "#ddd" }} />
      <div className="flex items-center justify-between mb-6">
        {msg ? <span className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</span> : <span />}
        <button onClick={submit} disabled={!date || !hours || submitting} className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "送出中…" : "送出加班"}</button>
      </div>
      <h4 className="text-xs font-bold mb-2" style={{ color: "#999" }}>最近加班</h4>
      <RecentRecords subType="加班" refreshKey={refreshKey} />
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
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const claimTotal = claimItems.reduce((s, i) => s + i.price * i.qty, 0);
  const purchaseTotal = purchaseItems.reduce((s, i) => s + i.price * i.qty, 0);

  const addClaimItem = () => setClaimItems([...claimItems, { name: "", price: 0, qty: 1 }]);
  const addPurchaseItem = () => setPurchaseItems([...purchaseItems, { name: "", price: 0, qty: 1, note: "", url: "" }]);
  const updateClaim = (i: number, field: string, value: any) => { setClaimItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item)); };
  const updatePurchase = (i: number, field: string, value: any) => { setPurchaseItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item)); };

  const submitExpense = async (kind: "請款" | "請購") => {
    if (submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const items = kind === "請款"
        ? claimItems.filter(i => i.name && i.price > 0 && i.qty > 0)
        : purchaseItems.filter(i => i.name && i.price > 0 && i.qty > 0);
      if (items.length === 0) throw new Error("至少需要一筆有效品項（含品名、金額、數量）");
      const body = kind === "請款"
        ? { sub_type: "請款", items, has_receipt: claimReceipt === "有", note: claimNote }
        : { sub_type: "請購", items };
      const res = await staffFetch("/api/staff/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setMsg({ kind: "ok", text: `${kind}已送出（NT$${j.total?.toLocaleString?.() || 0}）` });
      if (kind === "請款") { setClaimItems([{ name: "", price: 0, qty: 1 }]); setClaimReceipt(""); setClaimNote(""); }
      else { setPurchaseItems([{ name: "", price: 0, qty: 1, note: "", url: "" }]); }
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold" style={{ color: "#333" }}>合計：NT$ {claimTotal.toLocaleString()}</span>
              {msg && mode === "請款" && (
                <span className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</span>
              )}
              <button onClick={() => submitExpense("請款")} disabled={submitting || claimTotal <= 0} className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "送出中…" : "送出請款"}</button>
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold" style={{ color: "#333" }}>預估合計：NT$ {purchaseTotal.toLocaleString()}</span>
              {msg && mode === "請購" && (
                <span className="text-sm" style={{ color: msg.kind === "ok" ? "#2d5016" : "#c0392b" }}>{msg.text}</span>
              )}
              <button onClick={() => submitExpense("請購")} disabled={submitting || purchaseTotal <= 0} className="px-6 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#7a5c40", border: "none", cursor: submitting ? "wait" : "pointer" }}>{submitting ? "送出中…" : "送出請購"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 績效 — 個人績效儀表板（per Notion 點數設計指南）
//   個人創造營收：分潤的依據（products/events 我擔任 owner_staff 的銷售合計）
//   完成流程次數：自主空間的依據（staff_activities 累計）
//   點擊績效：個人影響力在外部世界的累積（products/events 的 page_views）
//   設計意義：讓每個工作人員看到「自己的工作帶來了什麼」，不是純打工心態
// ═══════════════════════════════════════════
interface StaffMetrics {
  total_revenue: number;
  total_views: number;
  product_count: number;
  event_count: number;
  activity_count: number;
  message?: string;
}

function MetricsPanel() {
  const [data, setData] = useState<StaffMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    staffFetch("/api/staff/metrics")
      .then((r) => r.json())
      .then((j) => { if (!abort) { if (j.error) setErr(j.error); else setData(j); } })
      .catch((e) => { if (!abort) setErr(e.message); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, []);

  if (loading) return <p className="text-sm text-center py-12" style={{ color: "#999" }}>載入中…</p>;
  if (err) return <div className="text-sm p-4 rounded" style={{ background: "#fdecea", color: "#c0392b" }}>{err}</div>;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="mb-6 p-4 rounded-lg" style={{ background: "#fdf6ec", border: "1px solid #e8d8b4" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#7a5c40" }}>個人績效儀表板</h3>
        <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
          這裡呈現你工作帶來的價值：個人營收是分潤依據、流程次數是自主空間依據、點擊績效是你的影響力累積。<br/>
          不是 KPI 考核，是讓你看到「為自己的事業打拼」具體長什麼樣子。
        </p>
        {data.message && (
          <p className="text-xs mt-2 p-2 rounded" style={{ background: "#fff8e6", color: "#7a5c40", border: "1px solid #f0d784" }}>
            ⚠️ {data.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard icon="💰" label="個人創造營收" value={`NT$${data.total_revenue.toLocaleString()}`} hint="分潤依據" color="#7a5c40" />
        <MetricCard icon="👁️" label="點擊績效" value={data.total_views.toLocaleString()} hint="累計 page views" color="#1a6dbf" />
        <MetricCard icon="✅" label="完成流程次數" value={data.activity_count.toLocaleString()} hint="staff_activities 累計" color="#2d5016" />
        <MetricCard icon="📦" label="負責商品數" value={data.product_count.toLocaleString()} hint="DB07 責任執行" color="#7a5c40" />
        <MetricCard icon="🎪" label="負責活動數" value={data.event_count.toLocaleString()} hint="DB04 責任執行" color="#2d5016" />
      </div>

      <p className="text-xs" style={{ color: "#888" }}>
        資料來源：staff_metrics_v VIEW（即時聚合）+ staff_activities 累計。<br/>
        owner 歸屬規則：DB04/DB07「責任執行」第一位 → owner_staff_notion_id（同步時自動寫入）。
      </p>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, color }: { icon: string; label: string; value: string; hint: string; color: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid #e8e0d4" }}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs" style={{ color: "#888" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: "#aaa" }}>{hint}</div>
    </div>
  );
}

// ── 訂單管理面板 ──────────────────────────────────────────────────────────
type OrderStatus = "all" | "pending" | "confirmed" | "cancelled";

interface StaffOrder {
  id: string;
  status: string;
  checkin_status: string | null;
  total: number;
  created_at: string;
  source: string | null;
  note: string | null;
  refund_info: any;
  members: { id: string; name: string; email: string; phone: string } | null;
  order_items: { id: string; item_type: string; quantity: number; price: number; meta: any }[];
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "待確認", color: "#c05621", bg: "#fff4eb" },
  confirmed: { label: "已確認", color: "#276749", bg: "#e6ffed" },
  cancelled: { label: "已取消", color: "#718096", bg: "#f7f7f7" },
};

function orderNumber(id: string) { return `MS-${id.slice(0, 8).toUpperCase()}`; }
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return iso; }
}

function OrdersPanel() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null); // 正在操作的訂單 ID

  const load = async (status: OrderStatus = statusFilter) => {
    setLoading(true);
    try {
      const url = status === "all"
        ? "/api/staff/orders?limit=60"
        : `/api/staff/orders?status=${status}&limit=60`;
      const res = await staffFetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (orderId: string, newStatus: "confirmed" | "cancelled") => {
    setActionId(orderId);
    try {
      const res = await staffFetch("/api/staff/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "操作失敗");
        return;
      }
      // 樂觀更新本地狀態
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      alert("操作失敗，請重試");
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const statusTabs: { key: OrderStatus; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "pending", label: `待確認${pendingCount > 0 && statusFilter !== "pending" ? ` (${pendingCount})` : ""}` },
    { key: "confirmed", label: "已確認" },
    { key: "cancelled", label: "已取消" },
  ];

  return (
    <div>
      {/* 狀態篩選 tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: statusFilter === t.key ? "#1a1a2e" : "#f5f0e8",
              color: statusFilter === t.key ? "#fff" : "#7a5c40",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => load()}
          className="ml-auto px-3 py-1.5 rounded-full text-xs transition-colors"
          style={{ background: "transparent", border: "1px solid #e8e0d4", color: "#888", cursor: "pointer" }}
        >
          重新整理
        </button>
      </div>

      {/* 訂單列表 */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: "#999" }}>載入中...</div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: "#999" }}>沒有符合條件的訂單</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const s = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "#666", bg: "#f0f0f0" };
            const isActing = actionId === order.id;
            const isPending = order.status === "pending";
            const isConfirmed = order.status === "confirmed";
            const member = order.members;

            return (
              <div
                key={order.id}
                className="rounded-xl overflow-hidden"
                style={{ border: isPending ? "1px solid #f6ad55" : "1px solid #e8e0d4", background: "#fff" }}
              >
                {/* 訂單標頭 */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  style={{ background: isPending ? "#fffaf0" : "#fafaf8", borderBottom: "1px solid #f0ede8" }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold" style={{ color: "#5c4a32" }}>
                      {orderNumber(order.id)}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    {order.source && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#f0f0f0", color: "#888" }}>
                        {order.source}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "#aaa" }}>{fmtDate(order.created_at)}</span>
                </div>

                {/* 顧客資訊 */}
                {member && (
                  <div className="px-4 py-2 text-xs" style={{ color: "#666", borderBottom: "1px solid #f5f5f5" }}>
                    👤 {member.name || "（未命名）"}
                    {member.email && <span className="ml-2">{member.email}</span>}
                    {member.phone && <span className="ml-2">📞 {member.phone}</span>}
                  </div>
                )}

                {/* 訂單明細 */}
                <div className="divide-y" style={{ borderColor: "#f5f5f5" }}>
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: "#3d2b1f" }}>
                          {item.meta?.name || `（${item.item_type}）`}
                        </p>
                        {item.meta?.subtitle && (
                          <p className="text-xs truncate" style={{ color: "#999" }}>{item.meta.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs whitespace-nowrap" style={{ color: "#888" }}>
                        × {item.quantity}
                      </span>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: "#7a5c40" }}>
                        NT$ {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 備註 */}
                {order.note && (
                  <div className="px-4 py-2 text-xs" style={{ background: "#fafaf8", color: "#888", borderTop: "1px solid #f5f5f5" }}>
                    💬 {order.note}
                  </div>
                )}

                {/* 總計 + 操作按鈕 */}
                <div
                  className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap"
                  style={{ background: "#fafaf8", borderTop: "1px solid #f0ede8" }}
                >
                  <span className="text-base font-bold" style={{ color: "#5c4a32" }}>
                    NT$ {Number(order.total).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, "confirmed")}
                          disabled={isActing}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ background: isActing ? "#aaa" : "#276749", border: "none", cursor: isActing ? "wait" : "pointer" }}
                        >
                          {isActing ? "處理中..." : "✓ 確認錄取"}
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, "cancelled")}
                          disabled={isActing}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "transparent", border: "1px solid #e53e3e", color: "#e53e3e", cursor: isActing ? "wait" : "pointer" }}
                        >
                          ✕ 不錄取
                        </button>
                      </>
                    )}
                    {isConfirmed && (
                      <button
                        onClick={() => {
                          if (confirm(`確定要取消訂單 ${orderNumber(order.id)}？`)) {
                            updateStatus(order.id, "cancelled");
                          }
                        }}
                        disabled={isActing}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "transparent", border: "1px solid #ccc", color: "#888", cursor: isActing ? "wait" : "pointer" }}
                      >
                        取消訂單
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
