"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { supabase } from "@/lib/supabase";

type Viewpoint = {
  id: string;
  notion_id: string | null;
  name: string;
  summary: string | null;
  region: string[] | null;
};

type TownFeature = {
  type: "Feature";
  properties: { TOWNNAME: string; TOWNID: string };
  geometry: any;
};

type GeoData = {
  type: "FeatureCollection";
  features: TownFeature[];
};

const TOWNSHIP_ORDER = [
  "宜蘭市", "羅東鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉",
  "蘇澳鎮", "三星鄉", "冬山鄉", "五結鄉", "大同鄉", "南澳鄉",
];

const WIDTH = 560;
const HEIGHT = 520;

export default function ViewpointExplorer() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [selected, setSelected] = useState<string>("宜蘭縣");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/geo/yilan.geo.json").then(r => r.json()).then(setGeo).catch(() => setGeo(null));
    (async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, notion_id, name, summary, region")
        .eq("tag_type", "viewpoint")
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      setViewpoints((data || []) as Viewpoint[]);
    })();
  }, []);

  // d3 projection：把 GeoJSON 投影到 viewBox 內
  const projection = useMemo(() => {
    if (!geo) return null;
    return geoMercator().fitExtent([[10, 10], [WIDTH - 10, HEIGHT - 10]], geo as any);
  }, [geo]);
  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // 依鄉鎮聚合觀點
  const byTown = useMemo(() => {
    const m = new Map<string, Viewpoint[]>();
    m.set("宜蘭縣", [...viewpoints]);
    TOWNSHIP_ORDER.forEach(t => m.set(t, []));
    viewpoints.forEach(vp => {
      const regions = Array.isArray(vp.region) ? vp.region : [];
      regions.forEach(r => {
        const bucket = m.get(r);
        if (bucket) bucket.push(vp);
      });
    });
    return m;
  }, [viewpoints]);

  const currentList = byTown.get(selected) || [];
  const selectedIsCounty = selected === "宜蘭縣";

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        {/* 左欄：全縣 + 12 鄉鎮 */}
        <div className="hidden sm:flex flex-col gap-1.5">
          {(["宜蘭縣", ...TOWNSHIP_ORDER] as const).map((name) => {
            const count = byTown.get(name)?.length ?? 0;
            const active = selected === name;
            return (
              <button key={name} onClick={() => setSelected(name)}
                className="px-3 py-2 text-left text-[0.85em] rounded-lg transition-all flex items-center justify-between"
                style={{
                  background: active ? "#7a5c40" : "#f7f7f7",
                  color: active ? "#fff" : "#555",
                  border: active ? "none" : "1px solid #eee",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                }}>
                <span>{name}</span>
                {count > 0 && <span className="text-[0.75em] opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* 手機版橫向滾動 */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
          {(["宜蘭縣", ...TOWNSHIP_ORDER] as const).map((name) => {
            const count = byTown.get(name)?.length ?? 0;
            return (
              <button key={name} onClick={() => setSelected(name)}
                className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full"
                style={{
                  background: selected === name ? "#7a5c40" : "#f2ede6",
                  color: selected === name ? "#fff" : "#7a5c40",
                  border: "none", cursor: "pointer",
                }}>
                {name}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* 右欄：地圖 + 觀點列表 */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#f9f7f4", border: "1px solid #e0d8cc" }}>
          <div className="relative">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: 540, background: "#f0f6fa" }}>
              {/* 太平洋文字 */}
              <text x={WIDTH - 30} y={HEIGHT / 2} fill="#b8d4e3" fontSize="14" textAnchor="middle" opacity="0.5"
                transform={`rotate(90, ${WIDTH - 30}, ${HEIGHT / 2})`}>太 平 洋</text>

              {/* 真實鄉鎮輪廓 */}
              {geo && pathGen && geo.features.map((f) => {
                const name = f.properties.TOWNNAME;
                const active = selected === name;
                const dim = !selectedIsCounty && !active;
                const isHover = hovered === name;
                const d = pathGen(f as any) || "";
                return (
                  <g key={name} style={{ cursor: "pointer" }}
                    onClick={() => setSelected(name)}
                    onMouseEnter={() => setHovered(name)}
                    onMouseLeave={() => setHovered(null)}>
                    <path d={d}
                      fill={active ? "#c4a882" : dim ? "#eee5d6" : isHover ? "#d4c4a8" : "#e8e0d4"}
                      stroke={active ? "#5a3c20" : "#c8b8a0"}
                      strokeWidth={active ? 2 : 0.8}
                      style={{ transition: "fill 0.15s" }} />
                  </g>
                );
              })}

              {/* 鄉鎮標籤（用 centroid）*/}
              {geo && pathGen && geo.features.map((f) => {
                const name = f.properties.TOWNNAME;
                const active = selected === name;
                const dim = !selectedIsCounty && !active;
                if (dim) return null;
                const [cx, cy] = pathGen.centroid(f as any);
                return (
                  <text key={`lbl-${name}`} x={cx} y={cy} fill={active ? "#5a3c20" : "#8b7355"}
                    fontSize={active ? 14 : 11} fontWeight={active ? 700 : 500}
                    textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                    {name}
                  </text>
                );
              })}
            </svg>

            {/* 左上角區域資訊 */}
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
              <span className="text-sm font-bold" style={{ color: "#7a5c40" }}>{selected}</span>
              <span className="text-xs ml-2" style={{ color: "#999" }}>{currentList.length} 個觀點</span>
            </div>

            {/* Loading */}
            {!geo && (
              <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#999" }}>
                載入地圖中…
              </div>
            )}
          </div>

          {/* 觀點列表（地圖下方）*/}
          <div className="p-4" style={{ background: "#fff", borderTop: "1px solid #e0d8cc" }}>
            {currentList.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "#999" }}>
                {selectedIsCounty ? "目前尚無觀點" : `${selected} 尚無觀點`}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentList.map(vp => (
                  <Link key={vp.id} href={`/viewpoint/${vp.notion_id || vp.id}`}
                    className="px-3 py-1.5 rounded-full text-xs hover:opacity-80"
                    style={{ background: "#f2ede6", color: "#7a5c40", textDecoration: "none" }}>
                    {vp.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
