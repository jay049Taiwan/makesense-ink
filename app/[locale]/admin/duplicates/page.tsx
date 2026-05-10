"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Member = {
  page_id: string;
  distance: number;
  pixels: number | null;
  filesize: number | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  site_name: string | null;
  folder_rel: string | null;
  r2_url: string | null;
  review_action: string | null;
  is_representative: boolean;
};

type Group = {
  representative_page_id: string;
  neighbor_count: number;
  members: Member[];
  recommended_keep: string;
};

type Overview = {
  total_photos: number;
  pending: number;
  kept: number;
  archived: number;
  skipped: number;
  sites: number;
  total_size: string;
  freeable_size: string;
};

export default function AdminDuplicatesPage() {
  const { data: session, status } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [keepId, setKeepId] = useState<string>("");
  const [archiveIds, setArchiveIds] = useState<Set<string>>(new Set());
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string>("");

  // 載入總覽
  async function loadOverview() {
    try {
      const r = await fetch("/api/admin/duplicates/overview");
      if (r.status === 401 || r.status === 403) {
        setError("未登入或非工作人員");
        return;
      }
      const data = await r.json();
      setOverview(data.overview);
    } catch (e: any) {
      setError(`載入總覽失敗: ${e.message}`);
    }
  }

  // 載入下一組
  async function loadNextGroup() {
    setLoading(true);
    setError(null);
    setKeepId("");
    setArchiveIds(new Set());
    setSkipIds(new Set());
    try {
      const params = new URLSearchParams({ threshold: "5" });
      if (siteFilter) params.set("site", siteFilter);
      const r = await fetch(`/api/admin/duplicates/next-group?${params}`);
      const data = await r.json();
      if (data.error) {
        setError(data.error);
      } else if (!data.group) {
        setGroup(null);
        setError(data.message ?? "沒有更多");
      } else {
        setGroup(data.group);
        setKeepId(data.group.recommended_keep);
      }
    } catch (e: any) {
      setError(`載入失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // 提交決策
  async function submitReview() {
    if (!group) return;
    setLoading(true);
    try {
      const archive_page_ids = group.members
        .filter((m) => archiveIds.has(m.page_id))
        .map((m) => m.page_id);
      const skip_page_ids = group.members
        .filter((m) => skipIds.has(m.page_id))
        .map((m) => m.page_id);

      const r = await fetch("/api/admin/duplicates/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keep_page_id: keepId || null,
          archive_page_ids,
          skip_page_ids,
        }),
      });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      // 成功 → 刷新總覽 + 載下一組
      await loadOverview();
      await loadNextGroup();
    } catch (e: any) {
      setError(`提交失敗: ${e.message}`);
      setLoading(false);
    }
  }

  function toggleSet(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setter(newSet);
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadOverview();
      loadNextGroup();
    }
  }, [status]);

  if (status === "loading") return <div style={{ padding: 32 }}>載入中…</div>;
  if (status === "unauthenticated")
    return <div style={{ padding: 32 }}>請先<a href="/login">登入</a></div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        相似照片清理
      </h1>

      {/* 總覽 */}
      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
            marginBottom: 24,
            padding: 16,
            background: "#f5f5f7",
            borderRadius: 8,
          }}
        >
          <Stat label="總張數" value={overview.total_photos} />
          <Stat label="待審" value={overview.pending} highlight />
          <Stat label="保留" value={overview.kept} />
          <Stat label="已 archive" value={overview.archived} />
          <Stat label="跳過" value={overview.skipped} />
          <Stat label="sites" value={overview.sites} />
          <Stat label="總大小" value={overview.total_size} />
          <Stat label="可釋放" value={overview.freeable_size} />
        </div>
      )}

      {/* Site filter + 下一組 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          placeholder="篩 site（可空）"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6, width: 240 }}
        />
        <button
          onClick={loadNextGroup}
          disabled={loading}
          style={{
            padding: "8px 16px", background: "#4ECDC4", color: "white",
            border: "none", borderRadius: 6, cursor: "pointer",
          }}
        >
          {loading ? "處理中…" : "下一組"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee", color: "#c00", marginBottom: 16, borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* 群組 */}
      {group && (
        <div>
          <div style={{ marginBottom: 12, color: "#666" }}>
            這群 <strong>{group.members.length}</strong> 張，鄰居數 {group.neighbor_count}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {group.members.map((m) => {
              const isKeep = keepId === m.page_id;
              const isArchive = archiveIds.has(m.page_id);
              const isSkip = skipIds.has(m.page_id);
              const isRecommended = group.recommended_keep === m.page_id;
              return (
                <div
                  key={m.page_id}
                  style={{
                    border: isKeep ? "3px solid #4ECDC4" : isArchive ? "3px solid #c00" : "1px solid #ddd",
                    borderRadius: 8,
                    padding: 8,
                    background: "white",
                  }}
                >
                  {m.r2_url && (
                    <a href={m.r2_url} target="_blank" rel="noreferrer">
                      <img
                        src={m.r2_url}
                        alt=""
                        style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 4 }}
                      />
                    </a>
                  )}
                  <div style={{ fontSize: 12, marginTop: 6, color: "#444" }}>
                    {isRecommended && <span style={{ color: "#4ECDC4", fontWeight: 700 }}>⭐ </span>}
                    距離 {m.distance} • {m.width}×{m.height}
                    {m.filesize ? ` • ${(m.filesize / 1024 / 1024).toFixed(1)}MB` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.site_name ?? "-"}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    <button
                      onClick={() => setKeepId(m.page_id)}
                      style={{
                        flex: 1, fontSize: 11, padding: "4px 6px",
                        background: isKeep ? "#4ECDC4" : "#eee",
                        color: isKeep ? "white" : "#333",
                        border: "none", borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      保留⭐
                    </button>
                    <button
                      onClick={() => toggleSet(archiveIds, m.page_id, setArchiveIds)}
                      style={{
                        flex: 1, fontSize: 11, padding: "4px 6px",
                        background: isArchive ? "#c00" : "#eee",
                        color: isArchive ? "white" : "#333",
                        border: "none", borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      archive
                    </button>
                    <button
                      onClick={() => toggleSet(skipIds, m.page_id, setSkipIds)}
                      style={{
                        flex: 1, fontSize: 11, padding: "4px 6px",
                        background: isSkip ? "#888" : "#eee",
                        color: isSkip ? "white" : "#333",
                        border: "none", borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      skip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={submitReview}
              disabled={loading || (!keepId && archiveIds.size === 0 && skipIds.size === 0)}
              style={{
                padding: "12px 24px", background: "#1a1a2e", color: "white",
                border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
              }}
            >
              送出決策 + 載下一組
            </button>
            <button
              onClick={loadNextGroup}
              disabled={loading}
              style={{
                padding: "12px 24px", background: "#eee", color: "#333",
                border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14,
              }}
            >
              不決策，跳下一組
            </button>
          </div>
        </div>
      )}

      {!group && !loading && !error && (
        <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
          沒有待審群。請等 backfill 跑出更多 phash 資料，或調寬 threshold。
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#c00" : "#1a1a2e" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    </div>
  );
}
