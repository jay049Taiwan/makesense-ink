"use client";

import React, { useState, useEffect, useCallback } from "react";

// 色票（取代 staff-portal 的 CSS variables）
const C = {
  card: "#fff",
  border: "#e8e0d4",
  primary: "#7a5c40",
  text: "#333",
  textSub: "#555",
  textMuted: "#888",
  danger: "#e53e3e",
  selectedBg: "#F5F0E8",
  panelBg: "#FAFAF7",
  done: "#4caf50",
  doneTrack: "#ccc",
  notePrimary: "#2E6B8A",
};

const CASH_DENOMS = [
  { key: "1000", label: "仟元" },
  { key: "500", label: "五百" },
  { key: "100", label: "一百" },
  { key: "50", label: "五十" },
  { key: "10", label: "拾元" },
  { key: "5", label: "五元" },
  { key: "1", label: "壹元" },
];

type Task = any;

function useIsWide() {
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setWide(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return wide;
}

// ── API helpers ─────────────────────────────────────────────────────────
async function apiGet(url: string) {
  const r = await fetch(url, { credentials: "include" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "查詢失敗");
  return j;
}
async function apiPut(url: string, body: any) {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "更新失敗");
  return j;
}

const getMyTasks = (refresh = false) => apiGet(`/api/staff/tasks${refresh ? "?refresh=1" : ""}`);
const getTaskChildren = (id: string) => apiGet(`/api/staff/tasks/${id}/children`);
const updateTaskStatus = (id: string, field: string, value: string) =>
  apiPut(`/api/staff/tasks/${id}/status`, { field, value });
const editTask = (id: string, fields: any) => apiPut(`/api/staff/tasks/${id}/edit`, fields);
const editDetailNote = (id: string, note: string) => apiPut(`/api/staff/details/${id}/note`, { note });
const editDetailCash = (id: string, period: string, values: any) =>
  apiPut(`/api/staff/details/${id}/cash`, { period, values });

interface Props {
  userEmail?: string;
}

export default function TasksPanel({ userEmail = "" }: Props) {
  const isWide = useIsWide();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<Task[]>([]);
  const [orphanTasks, setOrphanTasks] = useState<Task[]>([]);
  const [orphanDetails, setOrphanDetails] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [detailModal, setDetailModal] = useState<Task | null>(null);
  const [updating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTopicName, setEditTopicName] = useState("");
  const [editExecTime, setEditExecTime] = useState("");
  const [editNote, setEditNote] = useState("");
  const [db04Dirty, setDb04Dirty] = useState(false);

  const [modalNote, setModalNote] = useState("");
  const [modalCash, setModalCash] = useState<Record<string, any>>({});
  const [modalCashPeriod, setModalCashPeriod] = useState<"open" | "close">("open");

  const lowerEmail = userEmail.toLowerCase();

  const fetchTasks = useCallback(async (refresh = false) => {
    setLoading(true); setError(null);
    try {
      const data = await getMyTasks(refresh);
      setTree(data.tree || []);
      setOrphanTasks(data.orphanTasks || []);
      setOrphanDetails(data.orphanDetails || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const selectTask = async (task: Task) => {
    setSelectedTask(task);
    if (task?.db === "DB04") {
      setEditTopicName(task.topicName || "");
      setEditExecTime(task.executionTime || "");
      setEditNote(task.handoverNote || "");
      setDb04Dirty(false);

      if (!task.children || task.children.length === 0) {
        setLoadingChildren(true);
        try {
          const data = await getTaskChildren(task.id);
          const children = data.children || [];
          setSelectedTask((prev) => prev?.id === task.id ? { ...prev, children } : prev);
          setTree((prev) => prev.map((p) => ({
            ...p,
            children: (p.children || []).map((t: Task) => t.id === task.id ? { ...t, children } : t),
          })));
          setOrphanTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, children } : t));
        } catch (err: any) {
          alert("載入明細失敗：" + err.message);
        } finally {
          setLoadingChildren(false);
        }
      }
    }
  };

  const allDb04 = [...tree.flatMap((p) => p.children || []), ...orphanTasks];
  const [showDone, setShowDone] = useState(false);

  const isFullyClosed = (item: Task) => item.executionStatus === "已完成" && item.reviewStatus === "檢核ok";
  const isDone = (item: Task) => item.executionStatus === "已完成";
  const visibleDb04 = allDb04.filter((t) => !isFullyClosed(t));
  const visibleOrphanDb05 = orphanDetails.filter((t) => !isFullyClosed(t));
  const pendingDb04 = visibleDb04.filter((t) => !isDone(t));
  const doneDb04 = visibleDb04.filter((t) => isDone(t));
  const pendingOrphanDb05 = visibleOrphanDb05.filter((t) => !isDone(t));
  const doneOrphanDb05 = visibleOrphanDb05.filter((t) => isDone(t));

  const saveDb04Edit = async () => {
    if (!selectedTask || selectedTask.db !== "DB04") return;
    setSaving(true);
    try {
      await editTask(selectedTask.id, {
        topicName: editTopicName,
        executionTime: editExecTime || null,
        handoverNote: editNote,
      });
      setDb04Dirty(false);
      await fetchTasks();
    } catch (err: any) {
      alert("儲存失敗：" + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDb05Status = (e: React.MouseEvent, detail: Task) => {
    e.stopPropagation();
    const newStatus = detail.executionStatus === "已完成" ? "執行中" : "已完成";
    setSelectedTask((prev) => {
      if (!prev || prev.db !== "DB04") return prev;
      return { ...prev, children: (prev.children || []).map((c: Task) => c.id === detail.id ? { ...c, executionStatus: newStatus } : c) };
    });
    updateTaskStatus(detail.id, "execution", newStatus).catch((err) => console.error("Sync failed:", err.message));
  };

  const isCashDetail = (d: Task) => d.checkOption === "點交現金" || d.title?.includes("零錢") || d.title?.includes("盤點");

  const openDetailModal = (detail: Task) => {
    setDetailModal(detail);
    setModalNote(detail.handoverReply || "");
    if (isCashDetail(detail)) {
      setModalCash({
        1000: detail.cash?.open1000 ?? "", 500: detail.cash?.open500 ?? "",
        100: detail.cash?.open100 ?? "", 50: detail.cash?.open50 ?? "",
        10: detail.cash?.open10 ?? "", 5: detail.cash?.open5 ?? "",
        1: detail.cash?.open1 ?? "",
      });
      setModalCashPeriod("open");
    }
  };

  const saveDetailNote = async () => {
    if (!detailModal) return;
    setSaving(true);
    try {
      await editDetailNote(detailModal.id, modalNote);
      setDetailModal(null);
      await fetchTasks();
    } catch (err: any) {
      alert("儲存失敗：" + err.message);
    } finally { setSaving(false); }
  };

  const saveDetailCash = async () => {
    if (!detailModal) return;
    setSaving(true);
    try {
      await editDetailCash(detailModal.id, modalCashPeriod, modalCash);
      setDetailModal(null);
      await fetchTasks();
    } catch (err: any) {
      alert("儲存失敗：" + err.message);
    } finally { setSaving(false); }
  };

  const formatDate = (d?: string) => d ? d.slice(0, 10).replace(/-/g, "/") : "";
  const formatDeadlineMmDd = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
  };
  const isOverdue = (d?: string) => {
    if (!d) return false;
    const today = new Date().toISOString().slice(0, 10);
    return d.slice(0, 10) < today;
  };
  const sortByDeadline = (items: Task[]) => {
    const today = new Date().toISOString().slice(0, 10);
    return [...items].sort((a, b) => {
      const aD = a.deadline?.slice(0, 10) || "";
      const bD = b.deadline?.slice(0, 10) || "";
      if (!aD && !bD) return 0;
      if (!aD) return 1;
      if (!bD) return -1;
      const aOver = aD < today, bOver = bD < today;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      return aD < bD ? -1 : aD > bD ? 1 : 0;
    });
  };

  // ── Task card ─────────────────────────────────────────────
  const renderTaskCard = (task: Task, isDoneStyle = false) => {
    const isSelected = selectedTask?.id === task.id;
    const isOrphanDb05 = task.db === "DB05";
    const overdue = !isDoneStyle && isOverdue(task.deadline);
    const deadlineMmDd = formatDeadlineMmDd(task.deadline);
    const assigneesStr = task.assignees?.length > 0 ? task.assignees.join("、") : "";
    const line2Parts = [task.crossSummary, task.topicName, assigneesStr].filter(Boolean);

    return (
      <div key={task.id} onClick={() => selectTask(task)} style={{
        padding: "8px 12px", marginBottom: 4, borderRadius: 8, cursor: "pointer",
        background: isSelected ? C.selectedBg : C.card,
        border: isOrphanDb05 ? `2px dashed ${isSelected ? "#E6A817" : "#D4C5A0"}` : `1px solid ${isSelected ? C.primary : C.border}`,
        opacity: isDoneStyle ? 0.6 : 1,
        borderLeft: overdue ? `3px solid ${C.danger}` : undefined,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: isDoneStyle ? "line-through" : "none", display: "flex", alignItems: "center", gap: 6 }}>
          {deadlineMmDd && (
            <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: overdue ? C.danger : C.textSub }}>{deadlineMmDd}</span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
        </div>
        {line2Parts.length > 0 && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {line2Parts.join("，")}
          </div>
        )}
      </div>
    );
  };

  // ── Left panel ─────────────────────────────────────────────
  const renderLeftPanel = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>交接事項</div>
        <button onClick={() => fetchTasks(true)} disabled={loading} title="重新整理"
          style={{ background: "none", border: "none", cursor: loading ? "wait" : "pointer", fontSize: 15, color: C.textMuted, padding: 4 }}>
          {loading ? "整理中" : "↻"}
        </button>
      </div>

      {loading && <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>載入中...</div>}
      {error && <div style={{ padding: 20, textAlign: "center", color: "#c62828", fontSize: 13 }}>{error}</div>}

      <div style={isWide ? { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } : {}}>
        <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 6, background: C.primary, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
          <span>未完成</span>
          <span>{pendingDb04.length + pendingOrphanDb05.length}</span>
        </div>

        {!loading && sortByDeadline([...pendingDb04, ...pendingOrphanDb05]).map((t) => renderTaskCard(t))}
        {!loading && pendingDb04.length === 0 && pendingOrphanDb05.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 10px", color: C.textMuted, fontSize: 12 }}>沒有待處理的項目</div>
        )}

        <div onClick={() => setShowDone(!showDone)} style={{
          padding: "8px 12px", borderRadius: 8, marginTop: 10, marginBottom: 6, cursor: "pointer",
          background: showDone ? "#666" : C.card,
          color: showDone ? "#fff" : C.textMuted,
          border: `1px solid ${showDone ? "#666" : C.border}`,
          fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between",
        }}>
          <span>已完成</span>
          <span>{doneDb04.length + doneOrphanDb05.length}</span>
        </div>

        {showDone && (
          <>
            {sortByDeadline([...doneDb04, ...doneOrphanDb05]).map((t) => renderTaskCard(t, true))}
            {doneDb04.length === 0 && doneOrphanDb05.length === 0 && (
              <div style={{ textAlign: "center", padding: "16px 10px", color: C.textMuted, fontSize: 12 }}>沒有已完成的項目</div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Right panel ─────────────────────────────────────────────
  const renderRightPanel = () => {
    if (!selectedTask) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400, color: C.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
          <div style={{ fontSize: 14 }}>點選左側交接項目</div>
        </div>
      );
    }

    if (selectedTask.db === "DB05") {
      const d = selectedTask;
      const canCheck = d.assigneeEmails?.some((e: string) => e.toLowerCase() === lowerEmail);
      const done = d.executionStatus === "已完成";
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            {canCheck && (
              <button onClick={(e) => toggleDb05Status(e, d)} style={{
                width: 32, height: 32, borderRadius: 8, border: `2px solid ${done ? C.done : C.doneTrack}`,
                background: done ? C.done : "transparent", color: "#fff", fontSize: 16,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{done ? "✓" : ""}</button>
            )}
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{d.title}</h3>
          </div>
          {d.content && <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{d.content}</p>}
          {d.type && <div style={{ fontSize: 12, color: C.textMuted }}>類型：{d.type}</div>}
          {d.assignees?.length > 0 && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>負責：{d.assignees.join("、")}</div>}
        </div>
      );
    }

    const task = selectedTask;
    const details = task.children || [];
    const pendingDetails = details.filter((d: Task) => d.executionStatus !== "已完成");
    const doneDetails = details.filter((d: Task) => d.executionStatus === "已完成");
    const allDetails = [...pendingDetails, ...doneDetails];

    const renderDb05Row = (detail: Task) => {
      const done = detail.executionStatus === "已完成";
      return (
        <div key={detail.id} onClick={() => openDetailModal(detail)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 4, borderRadius: 8, cursor: "pointer",
          background: C.card, border: `1px solid ${C.border}`, opacity: done ? 0.6 : 1,
        }}>
          <button onClick={(e) => toggleDb05Status(e, detail)} style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            border: `2px solid ${done ? C.done : C.doneTrack}`,
            background: done ? C.done : "transparent", color: "#fff", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{done ? "✓" : ""}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{detail.title}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {detail.quantity != null && <span style={{ fontWeight: 600 }}>×{detail.quantity}</span>}
              {detail.unitPrice != null && <span>NT${detail.unitPrice}</span>}
              {detail.subtotal != null && <span style={{ fontWeight: 600, color: C.textSub }}>= NT${detail.subtotal}</span>}
              {detail.assignees?.length > 0 && (
                <span style={{ padding: "1px 6px", borderRadius: 3, background: "#E3F2FD", color: "#1565C0", fontWeight: 600 }}>
                  {detail.assignees.join("、")}
                </span>
              )}
              {detail.attrSummary && <span style={{ padding: "1px 5px", borderRadius: 3, background: "#F0EDE8" }}>{detail.attrSummary}</span>}
              {detail.type && <span>・{detail.type}</span>}
            </div>
          </div>
          {isCashDetail(detail) && (
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#FFF3E0", color: "#E65100", flexShrink: 0 }}>零錢</span>
          )}
        </div>
      );
    };

    return (
      <div>
        {/* DB04 editable header */}
        <div style={{ background: C.panelBg, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button type="button" onClick={() => {
              const newStatus = task.executionStatus === "已完成" ? "執行中" : "已完成";
              const taskId = task.id;
              setSelectedTask((prev) => prev ? { ...prev, executionStatus: newStatus } : null);
              const updateItem = (items: Task[]) => items.map((t) => t.id === taskId ? { ...t, executionStatus: newStatus } : t);
              setOrphanTasks(updateItem);
              setTree((prev) => prev.map((p) => ({ ...p, children: updateItem(p.children || []) })));
              updateTaskStatus(taskId, "execution", newStatus).catch((err) => console.error("Sync failed:", err.message));
            }} style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: updating ? "wait" : "pointer",
              border: `2px solid ${task.executionStatus === "已完成" ? C.done : C.doneTrack}`,
              background: task.executionStatus === "已完成" ? C.done : "transparent",
              color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>{task.executionStatus === "已完成" ? "✓" : ""}</button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{task.title}</div>
              <div style={{ fontSize: 12, color: task.executionStatus === "已完成" ? C.done : C.textMuted }}>
                {task.executionStatus || "未開始"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>主題名稱</label>
            <input type="text" value={editTopicName}
              onChange={(e) => { setEditTopicName(e.target.value); setDb04Dirty(true); }}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>起算日期</label>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "#f5f5f0", fontSize: 13, color: C.textSub, minHeight: 20 }}>
                {formatDate(task.startTime) || "—"}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>執行日期</label>
              <input type="text" value={editExecTime ? editExecTime.replace(/-/g, "/") : ""}
                placeholder="yyyy/mm/dd"
                onChange={(e) => { const val = e.target.value.replace(/\//g, "-"); setEditExecTime(val); setDb04Dirty(true); }}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>截止日期</label>
              <div style={{ padding: "8px 10px", borderRadius: 6, background: "#f5f5f0", fontSize: 13, color: C.textSub, minHeight: 20 }}>
                {formatDate(task.deadline) || "—"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>交接備註</label>
            <textarea value={editNote}
              onChange={(e) => { setEditNote(e.target.value); setDb04Dirty(true); }}
              rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {db04Dirty && (
            <button onClick={saveDb04Edit} disabled={saving} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: C.primary, color: "#fff", fontSize: 13, fontWeight: 600, opacity: saving ? 0.5 : 1,
            }}>{saving ? "儲存中..." : "儲存變更"}</button>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
            {task.assignees?.length > 0 && <span>負責：{task.assignees.join("、")}</span>}
            {task.taskType && <span>類型：{task.taskType}</span>}
          </div>
        </div>

        {/* DB05 details */}
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          明細（{loadingChildren ? "載入中..." : `${pendingDetails.length} 筆待辦 / ${allDetails.length} 筆`}）
        </div>

        {loadingChildren && (
          <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>載入明細中...</div>
        )}

        {!loadingChildren && allDetails.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>沒有關聯明細</div>
        )}

        <div style={{ maxHeight: isWide ? "calc(100vh - 500px)" : "auto", overflowY: isWide ? "auto" : "visible" }}>
          {allDetails.map((detail: Task) => renderDb05Row(detail))}

          {(() => {
            const itemsWithPrice = allDetails.filter((d: Task) => d.subtotal != null || (d.quantity != null && d.unitPrice != null));
            if (itemsWithPrice.length === 0) return null;
            const totalQty = allDetails.reduce((s: number, d: Task) => s + (d.quantity || 0), 0);
            const totalAmt = allDetails.reduce((s: number, d: Task) => s + (d.subtotal ?? (d.quantity || 0) * (d.unitPrice || 0)), 0);
            return (
              <div style={{ padding: "10px 12px", marginTop: 8, borderRadius: 8, background: C.panelBg, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                <span>合計 {allDetails.length} 品 / {totalQty} 件</span>
                {totalAmt > 0 && <span>NT$ {totalAmt.toLocaleString()}</span>}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  // ── Detail modal ─────────────────────────────────────────────
  const renderDetailModal = () => {
    if (!detailModal) return null;
    const d = detailModal;
    const isCash = isCashDetail(d);
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={() => setDetailModal(null)}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "90%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{d.title}</h3>
            <button onClick={() => setDetailModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted }}>✕</button>
          </div>

          {d.content && <p style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{d.content}</p>}

          {isCash && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {(["open", "close"] as const).map((p) => (
                  <button key={p} onClick={() => {
                    setModalCashPeriod(p);
                    const prefix = p;
                    setModalCash({
                      1000: d.cash?.[`${prefix}1000`] ?? "", 500: d.cash?.[`${prefix}500`] ?? "",
                      100: d.cash?.[`${prefix}100`] ?? "", 50: d.cash?.[`${prefix}50`] ?? "",
                      10: d.cash?.[`${prefix}10`] ?? "", 5: d.cash?.[`${prefix}5`] ?? "",
                      1: d.cash?.[`${prefix}1`] ?? "",
                    });
                  }} style={{
                    flex: 1, padding: 8, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `2px solid ${modalCashPeriod === p ? C.primary : C.border}`,
                    background: modalCashPeriod === p ? C.primary : C.card,
                    color: modalCashPeriod === p ? "#fff" : C.text,
                  }}>{p === "open" ? "開店" : "打烊"}</button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "8px 10px", alignItems: "center" }}>
                {CASH_DENOMS.map(({ key, label }) => (
                  <React.Fragment key={key}>
                    <label style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{label}</label>
                    <input type="number" inputMode="numeric" min="0"
                      value={modalCash[key] ?? ""}
                      onChange={(e) => setModalCash((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="0"
                      style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 16, width: "100%", boxSizing: "border-box", textAlign: "center" }}
                    />
                  </React.Fragment>
                ))}
              </div>

              <button onClick={saveDetailCash} disabled={saving} style={{
                marginTop: 12, width: "100%", padding: 10, borderRadius: 8, border: "none",
                background: C.primary, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1,
              }}>{saving ? "儲存中..." : "儲存零錢盤點"}</button>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>備註回覆</label>
            <textarea value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              rows={4} placeholder="輸入備註或回覆..."
              style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
            <button onClick={saveDetailNote} disabled={saving} style={{
              marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none",
              background: C.notePrimary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1,
            }}>{saving ? "儲存中..." : "儲存備註"}</button>
          </div>
        </div>
      </div>
    );
  };

  if (isWide) {
    return (
      <>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: "0 0 30%", maxWidth: "30%", position: "sticky", top: 70 }}>
            {renderLeftPanel()}
          </div>
          <div style={{ flex: "0 0 calc(70% - 20px)", maxWidth: "calc(70% - 20px)" }}>
            {renderRightPanel()}
          </div>
        </div>
        {renderDetailModal()}
      </>
    );
  }

  return (
    <div>
      {renderLeftPanel()}
      {selectedTask && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setSelectedTask(null)}>
          <div style={{ width: "100%", maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: 20 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setSelectedTask(null)} style={{ background: "none", border: "none", fontSize: 22, color: C.textMuted, cursor: "pointer" }}>✕</button>
            </div>
            {renderRightPanel()}
          </div>
        </div>
      )}
      {renderDetailModal()}
    </div>
  );
}
