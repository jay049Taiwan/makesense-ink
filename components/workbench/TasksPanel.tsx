"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { staffFetch } from "@/lib/staff-fetch";

// ── 型別 ───────────────────────────────────────────────
type Task = {
  id: string;
  db: "DB03" | "DB04" | "DB05";
  title: string;
  executionStatus?: string;
  reviewStatus?: string;
  assignees?: string[];
  startTime?: string;
  deadline?: string;
  executionTime?: string;
  topicName?: string;
  crossSummary?: string;
  handoverNote?: string;
  taskType?: string;
  parentRelations?: string[];
  childRelations?: string[];
  partnerRelations?: string[];
  partnerNames?: string[];
  distanceKm?: number | null;
  eventCategory?: string;
  children?: Task[];
};

type ApiResponse = {
  items?: Task[];
  counts?: { pending: number; done: number };
  message?: string;
  source?: string;
  synced_at?: string;
  error?: string;
};

// ── 設計 token ────────────────────────────────────────
const C = {
  primary: "#7a5c40",
  card: "#fff",
  bg: "#faf8f4",
  border: "#e8e0d4",
  text: "#333",
  textMuted: "#888",
  done: "#666",
  warn: "#c0392b",
};

// ── Helpers ───────────────────────────────────────────
// 把 Notion ISO datetime「2026-05-09T14:30:00.000+08:00」格式化成「2026-05-09 14:30」
// 純日期（無 T 段）就只回日期。空值回空字串。
function fmtDate(s?: string | null): string {
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  if (!m) return s;
  return m[2] ? `${m[1]} ${m[2]}` : m[1];
}

async function apiGet(url: string): Promise<any> {
  const res = await staffFetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`回應非 JSON：${text.slice(0, 100)}`); }
  if (!res.ok) throw new Error(json.error || "讀取失敗");
  return json;
}

async function apiPut(url: string, body: any): Promise<any> {
  const res = await staffFetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`回應非 JSON：${text.slice(0, 100)}`); }
  if (!res.ok) throw new Error(json.error || "更新失敗");
  return json;
}

const toggleStatus = (id: string, value: "已完成" | "執行中") =>
  apiPut(`/api/staff/tasks/${id}/status`, { field: "execution", value });
const saveDB04 = (id: string, fields: { topicName?: string; executionTime?: string; handoverNote?: string }) =>
  apiPut(`/api/staff/tasks/${id}/edit`, fields);

// ── 主元件 ────────────────────────────────────────────
export default function TasksPanel(_props: { userEmail?: string }) {
  const [items, setItems] = useState<Task[]>([]);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popupTask, setPopupTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async (opts: { refresh?: boolean; silent?: boolean } = {}) => {
    const { refresh = false, silent = false } = opts;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const data: ApiResponse = await apiGet(`/api/staff/tasks${refresh ? "?refresh=1" : ""}`);
      setItems(data.items || []);
      setServerNotice(typeof data.message === "string" && data.message ? data.message : null);
    } catch (err: any) {
      if (!silent) setError(err.message);
      console.error("[TasksPanel] load failed:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadTasks({ refresh: false });
      if (!active) return;
      loadTasks({ refresh: true, silent: true });
    })();
    return () => { active = false; };
  }, [loadTasks]);

  const pending = items.filter((t) => t.executionStatus !== "已完成");
  const done = items.filter((t) => t.executionStatus === "已完成");
  const selected = items.find((t) => t.id === selectedId) || null;

  // 樂觀更新某筆 DB04/DB05 狀態
  const patchTask = (id: string, patch: Partial<Task>) => {
    setItems((prev) => prev.map((t) => {
      if (t.id === id) return { ...t, ...patch };
      return {
        ...t,
        children: (t.children || []).map((c) => c.id === id ? { ...c, ...patch } : c),
      };
    }));
  };

  return (
    <div style={{ minHeight: 500 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold" style={{ color: C.text }}>交接事項</div>
        <button onClick={() => loadTasks({ refresh: true })} disabled={loading}
          title="強制從 Notion 重抓" className="text-xs"
          style={{ background: "none", border: "none", cursor: loading ? "wait" : "pointer", color: C.textMuted, padding: 4 }}>
          {loading ? "整理中…" : "↻ 重整"}
        </button>
      </div>

      {error && <div className="p-3 mb-3 rounded text-sm" style={{ background: "#fdecea", color: C.warn, border: `1px solid ${C.warn}` }}>{error}</div>}
      {!error && serverNotice && (
        <div className="p-3 mb-3 rounded text-xs" style={{ background: "#fff8e6", border: "1px solid #f0d784", color: "#7a5c40" }}>⚠️ {serverNotice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3">
        {/* ── 左欄 DB04 list ─────────────────────────────── */}
        <aside>
          <div className="px-3 py-2 rounded mb-2 text-sm font-bold flex justify-between" style={{ background: C.primary, color: "#fff" }}>
            <span>未完成</span><span>{pending.length}</span>
          </div>
          {!loading && pending.length === 0 && (
            <div className="text-xs text-center py-3" style={{ color: C.textMuted }}>沒有待處理的項目</div>
          )}
          {pending.map((t) => (
            <DB04Card key={t.id} task={t} active={t.id === selectedId} onPick={() => setSelectedId(t.id)} />
          ))}

          <div onClick={() => setShowDone(!showDone)} className="px-3 py-2 rounded mt-3 mb-2 text-sm font-bold flex justify-between cursor-pointer"
            style={{ background: showDone ? C.done : C.card, color: showDone ? "#fff" : C.textMuted, border: `1px solid ${showDone ? C.done : C.border}` }}>
            <span>已完成 {showDone ? "▾" : "▸"}</span><span>{done.length}</span>
          </div>
          {showDone && done.map((t) => (
            <DB04Card key={t.id} task={t} active={t.id === selectedId} onPick={() => setSelectedId(t.id)} />
          ))}
        </aside>

        {/* ── 右欄 ──────────────────────────────────────── */}
        <main>
          {!selected && (
            <div className="text-center py-16" style={{ color: C.textMuted }}>
              <p className="text-3xl mb-2">👈</p>
              <p className="text-xs">點選左側交接項目</p>
            </div>
          )}
          {selected && (
            // 右欄縱向切：上 1/3 是 DB04 detail、下 2/3 是 DB05 列表
            <div className="flex flex-col gap-3">
              <section style={{ flex: "0 0 33%" }}>
                <DB04Detail task={selected} onPatch={patchTask} />
              </section>
              <section style={{ flex: "1 1 67%" }}>
                <DB05List parent={selected} onPatch={patchTask} onPick={setPopupTask} />
              </section>
            </div>
          )}
        </main>
      </div>

      {popupTask && <DB05Popup task={popupTask} onClose={() => setPopupTask(null)} />}
    </div>
  );
}

// ── DB04 卡片（左欄） ─────────────────────────────────
function DB04Card({ task, active, onPick }: { task: Task; active: boolean; onPick: () => void }) {
  return (
    <div onClick={onPick} className="px-3 py-2 rounded mb-1.5 cursor-pointer text-sm transition-colors"
      style={{ background: active ? "#fdf6ec" : C.card, border: `1px solid ${active ? C.primary : C.border}`, color: C.text }}>
      <div className="font-medium" style={{ color: C.text }}>{task.title || "（無標題）"}</div>
      <div className="text-xs mt-1 space-y-0.5" style={{ color: C.textMuted }}>
        {task.executionTime && <div>執行：{fmtDate(task.executionTime)}</div>}
        {task.deadline && <div>截止：{fmtDate(task.deadline)}</div>}
        {task.assignees && task.assignees.length > 0 && (
          <div className="truncate">負責：{task.assignees.join("、")}</div>
        )}
        {task.partnerNames && task.partnerNames.length > 0 && (
          <div className="truncate" style={{ color: "#7a5c40" }}>🏪 {task.partnerNames.join("、")}</div>
        )}
        <div className="flex gap-2 flex-wrap text-[10px]">
          {task.eventCategory && <span className="px-1.5 py-0.5 rounded" style={{ background: "#fdf6ec", color: "#7a5c40" }}>{task.eventCategory}</span>}
          {typeof task.distanceKm === "number" && task.distanceKm > 0 && (
            <span className="px-1.5 py-0.5 rounded" style={{ background: "#e8f4ed", color: "#2d5016" }}>{task.distanceKm} km</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DB04 detail（右上 1/3） ────────────────────────────
function DB04Detail({ task, onPatch }: { task: Task; onPatch: (id: string, patch: Partial<Task>) => void }) {
  const [done, setDone] = useState(task.executionStatus === "已完成");
  const [note, setNote] = useState(task.handoverNote || "");
  const [savingDone, setSavingDone] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // task 換時同步本地 state
  useEffect(() => {
    setDone(task.executionStatus === "已完成");
    setNote(task.handoverNote || "");
  }, [task.id]);  // eslint-disable-line

  const onToggleDone = async (next: boolean) => {
    setDone(next);
    setSavingDone(true);
    try {
      await toggleStatus(task.id, next ? "已完成" : "執行中");
      onPatch(task.id, { executionStatus: next ? "已完成" : "執行中" });
      setMsg("已儲存");
      setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setDone(!next); setMsg("失敗：" + e.message);
    } finally { setSavingDone(false); }
  };

  const onSaveNote = async () => {
    setSavingNote(true);
    try {
      await saveDB04(task.id, { handoverNote: note });
      onPatch(task.id, { handoverNote: note });
      setMsg("已儲存"); setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setMsg("失敗：" + e.message);
    } finally { setSavingNote(false); }
  };

  const projectNames = (task.parentRelations || []).length;

  return (
    <div className="rounded p-3" style={{ background: "#fdfbf7", border: `1px solid ${C.border}` }}>
      <label className="flex items-start gap-2 mb-3 cursor-pointer">
        <input type="checkbox" checked={done} disabled={savingDone}
          onChange={(e) => onToggleDone(e.target.checked)}
          style={{ marginTop: 4 }} />
        <span className="text-sm font-bold" style={{ color: C.text }}>{task.title || "（無標題）"}</span>
      </label>

      <div className="text-xs mb-3 space-y-0.5" style={{ color: C.textMuted }}>
        {task.executionTime && <div>執行時間：{fmtDate(task.executionTime)}</div>}
        {task.deadline && <div>截止時間：{fmtDate(task.deadline)}</div>}
        {task.assignees && task.assignees.length > 0 && <div>責任執行：{task.assignees.join("、")}</div>}
        {task.partnerNames && task.partnerNames.length > 0 && (
          <div style={{ color: "#7a5c40", fontWeight: 500 }}>🏪 辦理單位：{task.partnerNames.join("、")}</div>
        )}
        {task.eventCategory && <div>活動細項：{task.eventCategory}</div>}
        {typeof task.distanceKm === "number" && task.distanceKm > 0 && (
          <div style={{ color: "#2d5016" }}>距離：{task.distanceKm} km（完成後將寫入參與者「距離行程」點數）</div>
        )}
        {projectNames > 0 && <div>對應項目：{projectNames} 筆</div>}
        {task.topicName && <div>主題：{task.topicName}</div>}
      </div>

      <PartnerMetricsInline partnerIds={task.partnerRelations || []} />

      <label className="text-xs block mb-1" style={{ color: C.textMuted }}>執行備註</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
        className="w-full px-2 py-1.5 rounded border text-xs outline-none mb-2"
        style={{ borderColor: C.border, background: "#fff" }} />
      <div className="flex items-center justify-between">
        {msg ? <span className="text-xs" style={{ color: msg.startsWith("失敗") ? C.warn : "#2d5016" }}>{msg}</span> : <span />}
        <button onClick={onSaveNote} disabled={savingNote || note === (task.handoverNote || "")}
          className="text-xs px-3 py-1 rounded text-white disabled:opacity-50"
          style={{ background: C.primary, border: "none", cursor: savingNote ? "wait" : "pointer" }}>
          {savingNote ? "儲存中…" : "儲存備註"}
        </button>
      </div>
    </div>
  );
}

// ── Partner metrics（DB04 detail 內嵌） ───────────────
type PartnerMetric = {
  notion_id: string;
  product_count: number;
  total_revenue: number;
  reach_count: number;
  conversion_count: number;
  event_count: number;
};

function PartnerMetricsInline({ partnerIds }: { partnerIds: string[] }) {
  const [data, setData] = useState<PartnerMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (partnerIds.length === 0) { setData([]); return; }
    let abort = false;
    setLoading(true);
    const idsParam = partnerIds.map((id) => id.replace(/-/g, "")).join(",");
    staffFetch(`/api/staff/partner-metrics?ids=${idsParam}`)
      .then((r) => r.json())
      .then((j) => { if (!abort) setData(Object.values(j.metrics || {})); })
      .catch(() => { if (!abort) setData([]); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [partnerIds.join(",")]);  // eslint-disable-line

  if (partnerIds.length === 0) return null;
  return (
    <div className="mb-3 p-2 rounded text-xs" style={{ background: "#fdf6ec", border: "1px solid #e8d8b4" }}>
      <div className="font-bold mb-1" style={{ color: "#7a5c40" }}>🏪 合作夥伴影響指標</div>
      {loading && <div style={{ color: C.textMuted }}>載入中…</div>}
      {!loading && data.length === 0 && <div style={{ color: C.textMuted }}>此合作夥伴尚未在 Supabase 同步</div>}
      {data.map((m) => (
        <div key={m.notion_id} className="flex flex-wrap gap-x-2 gap-y-0.5 py-0.5" style={{ color: "#666" }}>
          <span>觸及 {m.reach_count?.toLocaleString() || 0}</span>
          <span>·</span>
          <span>成交 {m.conversion_count?.toLocaleString() || 0}</span>
          <span>·</span>
          <span>營收 NT${(m.total_revenue || 0).toLocaleString()}</span>
          <span>·</span>
          <span>商品 {m.product_count || 0}</span>
        </div>
      ))}
      <div className="mt-1" style={{ color: "#aaa", fontSize: 10 }}>
        你完成這個 task 會直接影響上面這些數字 — 這是合作夥伴在 dashboard 看到的價值。
      </div>
    </div>
  );
}

// ── DB05 list（右下 2/3） ──────────────────────────────
function DB05List({ parent, onPatch, onPick }: { parent: Task; onPatch: (id: string, patch: Partial<Task>) => void; onPick: (t: Task) => void }) {
  const children = parent.children || [];
  return (
    <div>
      <div className="text-sm font-bold mb-2" style={{ color: C.text }}>明細（{children.length} 筆）</div>
      {children.length === 0 && <div className="text-xs text-center py-4" style={{ color: C.textMuted }}>此交接尚無相關 DB05 明細</div>}
      <div className="space-y-1.5">
        {children.map((c) => (
          <DB05Row key={c.id} task={c} onPatch={onPatch} onPick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}

function DB05Row({ task, onPatch, onPick }: { task: Task; onPatch: (id: string, patch: Partial<Task>) => void; onPick: () => void }) {
  const [done, setDone] = useState(task.executionStatus === "已完成");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDone(task.executionStatus === "已完成"); }, [task.id, task.executionStatus]);

  const onToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const next = e.target.checked;
    setDone(next); setBusy(true);
    try {
      await toggleStatus(task.id, next ? "已完成" : "執行中");
      onPatch(task.id, { executionStatus: next ? "已完成" : "執行中" });
    } catch (err: any) {
      setDone(!next); alert("儲存失敗：" + err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded px-3 py-2 cursor-pointer hover:shadow-sm transition-shadow"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
      onClick={onPick}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={done} disabled={busy} onChange={onToggle} onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 4 }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ color: C.text, textDecoration: done ? "line-through" : "none" }}>{task.title || "（無標題）"}</div>
          <div className="text-xs flex flex-wrap gap-x-3 mt-0.5" style={{ color: C.textMuted }}>
            {task.executionTime && <span>執行：{fmtDate(task.executionTime)}</span>}
            {task.deadline && <span>截止：{fmtDate(task.deadline)}</span>}
            {task.assignees && task.assignees.length > 0 && <span>負責：{task.assignees.join("、")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DB05 popup（內容 + 上傳） ──────────────────────────
type Block = {
  id: string;
  type: string;
  text: string;
  url: string | null;
  fileType: string | null;
  caption: string;
};

function DB05Popup({ task, onClose }: { task: Task; onClose: () => void }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const aiPollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const data = await apiGet(`/api/staff/page/${task.id}/content`);
      setBlocks(data.blocks || []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [task.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (aiPollRef.current) window.clearInterval(aiPollRef.current); }, []);

  const onAiHelp = async () => {
    if (aiBusy) return;
    if (!confirm("請 Notion AI Agent 幫你生成此頁文案？\n（會把「AI 狀態」設為「請求協助」，AI 完成後會直接寫進此頁。）")) return;
    setAiBusy(true);
    setAiMsg("已通知 AI Agent，等待生成…（最多 3 分鐘）");
    try {
      const res = await staffFetch(`/api/staff/page/${task.id}/ai-trigger`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        const hint = j.hint ? `\n→ ${j.hint}` : "";
        throw new Error((j.error || "觸發失敗") + hint);
      }
      // 開始輪詢頁面 blocks，等到 blocks 增加就視為 AI 完成
      const beforeCount = blocks.length;
      const startedAt = Date.now();
      const TIMEOUT_MS = 3 * 60 * 1000;
      const POLL_MS = 5000;
      aiPollRef.current = window.setInterval(async () => {
        try {
          const data = await apiGet(`/api/staff/page/${task.id}/content`);
          const fresh = data.blocks || [];
          if (fresh.length > beforeCount) {
            // AI 寫入新 blocks 了
            setBlocks(fresh);
            setAiBusy(false);
            setAiMsg(`AI 已生成 ${fresh.length - beforeCount} 個新區塊，請往上滑查看`);
            window.setTimeout(() => setAiMsg(null), 8000);
            if (aiPollRef.current) { window.clearInterval(aiPollRef.current); aiPollRef.current = null; }
            return;
          }
          if (Date.now() - startedAt > TIMEOUT_MS) {
            setAiBusy(false);
            setAiMsg("AI 還沒完成（已等 3 分鐘）。可關掉視窗稍後再開回來看。");
            if (aiPollRef.current) { window.clearInterval(aiPollRef.current); aiPollRef.current = null; }
          }
        } catch (e: any) {
          // polling 失敗一次不立即放棄，下次再試
          console.warn("[ai poll] failed:", e.message);
        }
      }, POLL_MS);
    } catch (e: any) {
      setAiBusy(false);
      setAiMsg(null);
      alert(e.message);
    }
  };

  const onAppend = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const res = await staffFetch(`/api/staff/page/${task.id}/content`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "送出失敗");
      setDraft("");
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await staffFetch(`/api/staff/page/${task.id}/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "上傳失敗");
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-lg shadow-xl flex flex-col"
        style={{ background: "#fff", maxWidth: 700, width: "100%", maxHeight: "90vh" }}>
        <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: C.border }}>
          <div className="text-sm font-bold" style={{ color: C.text }}>{task.title || "（無標題）"}</div>
          <button onClick={onClose} className="text-lg" style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}>×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <div className="text-xs text-center py-4" style={{ color: C.textMuted }}>載入中…</div>}
          {err && <div className="text-xs p-2 rounded" style={{ background: "#fdecea", color: C.warn }}>{err}</div>}
          {!loading && !err && blocks.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: C.textMuted }}>此頁尚無內容</div>
          )}
          {blocks.map((b) => <BlockView key={b.id} b={b} />)}
        </div>

        <footer className="border-t p-4 space-y-2" style={{ borderColor: C.border }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="新增內容…"
            className="w-full px-2 py-1.5 rounded border text-xs outline-none"
            style={{ borderColor: C.border }} />
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onAiHelp} disabled={aiBusy}
              className="text-xs px-3 py-1.5 rounded text-white disabled:opacity-50"
              style={{ background: "#1a6dbf", border: "none", cursor: aiBusy ? "wait" : "pointer" }}>
              {aiBusy ? "🤖 生成中…" : "🤖 AI協助"}
            </button>
            <button onClick={onAppend} disabled={!draft.trim() || busy}
              className="text-xs px-3 py-1.5 rounded text-white disabled:opacity-50"
              style={{ background: C.primary, border: "none", cursor: busy ? "wait" : "pointer" }}>
              {busy ? "送出中…" : "附加文字"}
            </button>
            <label className="text-xs px-3 py-1.5 rounded cursor-pointer"
              style={{ background: "#fff", border: `1px solid ${C.primary}`, color: C.primary, cursor: uploading ? "wait" : "pointer" }}>
              {uploading ? "上傳中…" : "📎 上傳檔案"}
              <input type="file" hidden disabled={uploading} onChange={onUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
            </label>
            <span className="text-xs" style={{ color: C.textMuted }}>支援 docx/PDF/圖片/影音，最大 50MB</span>
          </div>
          {aiMsg && (
            <div className="text-xs px-2 py-1 rounded" style={{ background: "#e8f0fa", color: "#1a6dbf", border: "1px solid #b9d4ec" }}>
              {aiMsg}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.fileType === "image" && b.url) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.url} alt={b.caption || ""} className="rounded max-w-full" style={{ border: `1px solid ${C.border}` }} />
        {b.caption && <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{b.caption}</div>}
      </div>
    );
  }
  if (b.fileType === "video" && b.url) {
    return (
      <div>
        <video src={b.url} controls className="rounded max-w-full" />
        {b.caption && <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{b.caption}</div>}
      </div>
    );
  }
  if (b.fileType === "audio" && b.url) {
    return (
      <div>
        <audio src={b.url} controls />
        {b.caption && <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{b.caption}</div>}
      </div>
    );
  }
  if (b.fileType === "file" && b.url) {
    return (
      <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs inline-block px-2 py-1 rounded"
        style={{ background: "#faf8f4", border: `1px solid ${C.border}`, color: C.primary }}>
        📎 {b.caption || b.url.split("/").pop() || "檔案"}
      </a>
    );
  }
  if (b.text) {
    return <div className="text-sm whitespace-pre-wrap" style={{ color: C.text }}>{b.text}</div>;
  }
  return null;
}
