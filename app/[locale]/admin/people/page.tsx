"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Sample = {
  id: string;
  page_id: string;
  bbox: { x: number; y: number; w: number; h: number };
  photo: { r2_url: string; width: number; height: number } | null;
};

type Cluster = {
  id: string;
  label: string | null;
  db08_page_id: string | null;
  sample_face_id: string | null;
  member_count: number;
  reviewed: boolean;
  sample: Sample | null;
};

export default function AdminPeoplePage() {
  const { status } = useSession();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unnamed, setUnnamed] = useState(true);
  const [editingLabel, setEditingLabel] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (unnamed) params.set("unnamed", "1");
      const r = await fetch(`/api/admin/people/clusters?${params}`);
      if (r.status === 401 || r.status === 403) {
        setError("未登入或非工作人員");
        return;
      }
      const data = await r.json();
      if (data.error) setError(data.error);
      else setClusters(data.clusters || []);
    } catch (e: any) {
      setError(`載入失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveLabel(cluster: Cluster) {
    const newLabel = editingLabel[cluster.id] ?? cluster.label ?? "";
    const r = await fetch(`/api/admin/people/cluster/${cluster.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel, reviewed: !!newLabel }),
    });
    const data = await r.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setEditingLabel((p) => {
      const n = { ...p };
      delete n[cluster.id];
      return n;
    });
    await load();
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, unnamed]);

  if (status === "loading") return <div style={{ padding: 32 }}>載入中…</div>;
  if (status === "unauthenticated")
    return <div style={{ padding: 32 }}>請先<a href="/login">登入</a></div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        人臉群組命名
      </h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={unnamed}
            onChange={(e) => setUnnamed(e.target.checked)}
          />
          只顯示未命名
        </label>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: "6px 14px", background: "#4ECDC4", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "讀取中…" : "重新整理"}
        </button>
        <span style={{ color: "#666", fontSize: 13 }}>
          共 {clusters.length} 個群組
        </span>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee", color: "#c00", marginBottom: 16, borderRadius: 6 }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {clusters.map((c) => {
          const sample = c.sample;
          const photo = sample?.photo;
          const bbox = sample?.bbox;
          const isEditing = editingLabel[c.id] !== undefined;
          return (
            <div
              key={c.id}
              style={{
                border: c.reviewed ? "2px solid #4ECDC4" : "1px solid #ddd",
                borderRadius: 8, padding: 10, background: "white",
              }}
            >
              {/* 代表臉 */}
              <div style={{ position: "relative", width: "100%", paddingTop: "100%", overflow: "hidden", borderRadius: 6, background: "#f5f5f7" }}>
                {photo?.r2_url && bbox && (
                  <FaceCrop
                    src={photo.r2_url}
                    bbox={bbox}
                    imgWidth={photo.width}
                    imgHeight={photo.height}
                  />
                )}
              </div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                {c.member_count} 張照片
              </div>

              <input
                type="text"
                placeholder="輸入名字…"
                value={editingLabel[c.id] ?? c.label ?? ""}
                onChange={(e) =>
                  setEditingLabel((p) => ({ ...p, [c.id]: e.target.value }))
                }
                style={{
                  width: "100%", marginTop: 8, padding: "6px 8px",
                  border: "1px solid #ccc", borderRadius: 4, fontSize: 13,
                }}
              />

              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  onClick={() => saveLabel(c)}
                  disabled={!isEditing && !c.label}
                  style={{
                    flex: 1, padding: "6px", fontSize: 12,
                    background: "#1a1a2e", color: "white",
                    border: "none", borderRadius: 4, cursor: "pointer",
                  }}
                >
                  存
                </button>
                <a
                  href={`/admin/people/${c.id}`}
                  style={{
                    flex: 1, padding: "6px", fontSize: 12, textAlign: "center",
                    background: "#eee", color: "#333",
                    border: "none", borderRadius: 4, cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  看全部
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && clusters.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
          沒有群組。請先跑 photo_face_extractor + photo_face_clusterer。
        </div>
      )}
    </div>
  );
}

// 把代表臉的 bbox 區塊放大顯示在正方框
function FaceCrop({
  src,
  bbox,
  imgWidth,
  imgHeight,
}: {
  src: string;
  bbox: { x: number; y: number; w: number; h: number };
  imgWidth: number;
  imgHeight: number;
}) {
  if (!imgWidth || !imgHeight) {
    return <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  // 把 bbox 範圍拉到容器大小
  const scale = Math.min(1 / (bbox.w / imgWidth), 1 / (bbox.h / imgHeight));
  const offsetX = -(bbox.x / imgWidth) * 100;
  const offsetY = -(bbox.y / imgHeight) * 100;

  return (
    <img
      src={src}
      alt=""
      style={{
        position: "absolute",
        width: `${scale * 100}%`,
        height: `${scale * 100}%`,
        left: `${offsetX * scale}%`,
        top: `${offsetY * scale}%`,
        objectFit: "cover",
      }}
    />
  );
}
