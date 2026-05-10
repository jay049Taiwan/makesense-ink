"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";

type Member = {
  id: string;
  page_id: string;
  face_idx: number;
  bbox: { x: number; y: number; w: number; h: number };
  cluster_distance: number | null;
  blur_score: number | null;
  photo: {
    r2_url: string;
    width: number;
    height: number;
    taken_at: string | null;
    site_name: string | null;
    folder_rel: string | null;
  } | null;
};

type Cluster = {
  id: string;
  label: string | null;
  db08_page_id: string | null;
  member_count: number;
  reviewed: boolean;
};

export default function ClusterDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = use(params);
  const { status } = useSession();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/people/cluster/${id}`);
      const data = await r.json();
      if (data.error) setError(data.error);
      else {
        setCluster(data.cluster);
        setMembers(data.members || []);
        setLabelDraft(data.cluster?.label ?? "");
      }
    } catch (e: any) {
      setError(`載入失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveLabel() {
    const r = await fetch(`/api/admin/people/cluster/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: labelDraft, reviewed: !!labelDraft }),
    });
    const data = await r.json();
    if (data.error) setError(data.error);
    else load();
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, id]);

  if (status === "loading") return <div style={{ padding: 32 }}>載入中…</div>;
  if (status === "unauthenticated")
    return <div style={{ padding: 32 }}>請先<a href="/login">登入</a></div>;
  if (!cluster && !loading) return <div style={{ padding: 32 }}>找不到群組</div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <a href="/admin/people" style={{ color: "#4ECDC4", textDecoration: "none" }}>
        ← 回所有群組
      </a>

      <div style={{ display: "flex", gap: 16, marginTop: 12, marginBottom: 24, alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          {cluster?.label || "(未命名群組)"}
        </h1>
        <span style={{ color: "#666" }}>{cluster?.member_count} 張</span>
      </div>

      {/* 命名 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="輸入名字…"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 6, fontSize: 14 }}
        />
        <button
          onClick={saveLabel}
          style={{
            padding: "8px 16px", background: "#1a1a2e", color: "white",
            border: "none", borderRadius: 6, cursor: "pointer",
          }}
        >
          存
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee", color: "#c00", marginBottom: 16, borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* 成員 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {members.map((m) => (
          <div key={m.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 6, background: "white" }}>
            {m.photo?.r2_url && (
              <a href={m.photo.r2_url} target="_blank" rel="noreferrer">
                <img
                  src={m.photo.r2_url}
                  alt=""
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 4 }}
                />
              </a>
            )}
            <div style={{ fontSize: 11, marginTop: 4, color: "#666" }}>
              dist {m.cluster_distance?.toFixed(2) ?? "-"} • blur {m.blur_score?.toFixed(0) ?? "-"}
            </div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.photo?.site_name ?? "-"} • {m.photo?.taken_at?.slice(0, 10) ?? "?"}
            </div>
          </div>
        ))}
      </div>

      {!loading && members.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
          這個群組沒有成員資料
        </div>
      )}
    </div>
  );
}
