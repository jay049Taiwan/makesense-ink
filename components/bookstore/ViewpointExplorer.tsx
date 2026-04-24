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
                      fill={active ? "#c4a882" : dim ? "#f3ecdc" : isHover ? "#d4c4a8" : "#e8dcc4"}
                      stroke={active ? "#5a3c20" : "#8b7355"}
                      strokeWidth={active ? 2.5 : 1.2}
                      strokeLinejoin="round"
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

              {/* 龜山島專屬標籤（屬頭城鎮 MultiPolygon 但地理獨立） */}
              {projection && (() => {
                const p = projection([121.954, 24.839]);
                if (!p) return null;
                const [x, y] = p;
                return (
                  <text x={x} y={y + 14} fill="#7a5c40" fontSize={9} textAnchor="middle"
                    pointerEvents="none" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
                    opacity={0.75}>龜山島</text>
                );
              })()}

              {/* 鄉鎮觀點數量徽章（縣級 view 時顯示）*/}
              {selectedIsCounty && geo && pathGen && geo.features.map((f) => {
                const name = f.properties.TOWNNAME;
                const count = byTown.get(name)?.length ?? 0;
                if (count === 0) return null;
                const [cx, cy] = pathGen.centroid(f as any);
                return (
                  <g key={`badge-${name}`} pointerEvents="none">
                    <circle cx={cx} cy={cy + 14} r={8} fill="#e8935a" stroke="#fff" strokeWidth={1.5} />
                    <text x={cx} y={cy + 14} fill="#fff" fontSize={10} fontWeight={700}
                      textAnchor="middle" dominantBaseline="central">{count}</text>
                  </g>
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

          {/* 觀點列表（地圖下方）— 卡片樣式 */}
          <div className="p-4" style={{ background: "#fff", borderTop: "1px solid #e0d8cc" }}>
            {currentList.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "#999" }}>
                {selectedIsCounty ? "目前尚無觀點" : `${selected} 尚無觀點`}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentList.map(vp => (
                  <Link key={vp.id} href={`/viewpoint/${vp.notion_id || vp.id}`}
                    className="block p-3 rounded-lg hover:shadow-md transition-shadow"
                    style={{ background: "#faf8f4", border: "1px solid #e8e0d4", textDecoration: "none" }}>
                    <div className="flex items-start gap-2">
                      <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] flex-shrink-0 mt-0.5"
                        style={{ background: "#E3F2FD", color: "#1565C0" }}>觀點</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold line-clamp-1" style={{ color: "#1a1612" }}>{vp.name}</h4>
                        {vp.summary && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#8b7355" }}>{vp.summary}</p>}
                        {Array.isArray(vp.region) && vp.region.length > 0 && (
                          <p className="text-[0.7em] mt-1" style={{ color: "#b89e7a" }}>📍 {vp.region.join("、")}</p>
                        )}
                      </div>
                    </div>
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
