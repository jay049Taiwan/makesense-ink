"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { geoIdentity, geoPath } from "d3-geo";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";

type Viewpoint = {
  id: string;
  notion_id: string | null;
  name: string;
  summary: string | null;
  cover_url: string | null;
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

const WIDTH = 640;
const HEIGHT = 560;

export default function ViewpointExplorer() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [selected, setSelected] = useState<string>("宜蘭縣");
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeVp, setActiveVp] = useState<string | null>(null);

  useEffect(() => {
    fetch("/geo/yilan.geo.json").then(r => r.json()).then(setGeo).catch(() => setGeo(null));
    (async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, notion_id, name, summary, cover_url, region")
        .eq("tag_type", "viewpoint")
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      setViewpoints((data || []) as Viewpoint[]);
    })();
  }, []);

  const projection = useMemo(() => {
    if (!geo) return null;
    return geoIdentity().reflectY(true).fitExtent([[20, 20], [WIDTH - 20, HEIGHT - 20]], geo as any);
  }, [geo]);
  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // 把觀點依 region 指派到鄉鎮，計算圖標位置（同鄉鎮多個觀點用環形偏移避免重疊）
  const vpPoints = useMemo(() => {
    if (!geo || !projection || !pathGen) return [];
    const centroidMap = new Map<string, [number, number]>();
    geo.features.forEach(f => {
      centroidMap.set(f.properties.TOWNNAME, pathGen.centroid(f as any));
    });
    // 分桶：townshipName → viewpoints[]
    const buckets = new Map<string, Viewpoint[]>();
    viewpoints.forEach(vp => {
      const regions = Array.isArray(vp.region) ? vp.region : [];
      const town = regions.find(r => centroidMap.has(r)) || "未分類";
      if (!buckets.has(town)) buckets.set(town, []);
      buckets.get(town)!.push(vp);
    });

    const points: { vp: Viewpoint; x: number; y: number; town: string }[] = [];
    buckets.forEach((vps, town) => {
      const center = centroidMap.get(town);
      if (!center) return; // 未分類 viewpoint 不放地圖
      if (vps.length === 1) {
        points.push({ vp: vps[0], x: center[0], y: center[1], town });
      } else {
        // 環形排列
        const radius = 18;
        vps.forEach((vp, i) => {
          const angle = (i / vps.length) * Math.PI * 2 - Math.PI / 2;
          points.push({
            vp,
            x: center[0] + Math.cos(angle) * radius,
            y: center[1] + Math.sin(angle) * radius,
            town,
          });
        });
      }
    });
    return points;
  }, [geo, projection, pathGen, viewpoints]);

  const selectedIsCounty = selected === "宜蘭縣";
  const visiblePoints = selectedIsCounty
    ? vpPoints
    : vpPoints.filter(p => p.town === selected);

  const countByTown = useMemo(() => {
    const m = new Map<string, number>();
    m.set("宜蘭縣", viewpoints.length);
    TOWNSHIP_ORDER.forEach(t => m.set(t, 0));
    vpPoints.forEach(p => m.set(p.town, (m.get(p.town) || 0) + 1));
    return m;
  }, [vpPoints, viewpoints]);

  const activeVpData = activeVp ? vpPoints.find(p => p.vp.id === activeVp) : null;

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        {/* 左欄：全縣 + 12 鄉鎮 */}
        <div className="hidden sm:flex flex-col gap-1.5">
          {(["宜蘭縣", ...TOWNSHIP_ORDER] as const).map((name) => {
            const count = countByTown.get(name) ?? 0;
            const active = selected === name;
            return (
              <button key={name} onClick={() => { setSelected(name); setActiveVp(null); }}
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

        {/* 手機版 */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
          {(["宜蘭縣", ...TOWNSHIP_ORDER] as const).map((name) => {
            const count = countByTown.get(name) ?? 0;
            return (
              <button key={name} onClick={() => { setSelected(name); setActiveVp(null); }}
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

        {/* 地圖區 */}
        <div className="relative rounded-xl overflow-hidden" style={{ background: "#f0f6fa", border: "1px solid #e0d8cc" }}
          onClick={() => setActiveVp(null)}>

          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: 580, display: "block" }}>
            {/* 太平洋 */}
            <text x={WIDTH - 20} y={HEIGHT / 2} fill="#b8d4e3" fontSize="14" textAnchor="middle" opacity="0.5"
              transform={`rotate(90, ${WIDTH - 20}, ${HEIGHT / 2})`}>太 平 洋</text>

            {/* 鄉鎮多邊形 */}
            {geo && pathGen && geo.features.map((f) => {
              const name = f.properties.TOWNNAME;
              const active = selected === name;
              const dim = !selectedIsCounty && !active;
              const isHover = hovered === name;
              const d = pathGen(f as any) || "";
              return (
                <path key={name} d={d}
                  fill={active ? "#c4a882" : dim ? "#f3ecdc" : isHover ? "#d4c4a8" : "#e8dcc4"}
                  stroke={active ? "#5a3c20" : "#8b7355"}
                  strokeWidth={active ? 2.5 : 1}
                  strokeLinejoin="round"
                  style={{ cursor: "pointer", transition: "fill 0.15s" }}
                  onClick={(e) => { e.stopPropagation(); setSelected(name); setActiveVp(null); }}
                  onMouseEnter={() => setHovered(name)}
                  onMouseLeave={() => setHovered(null)} />
              );
            })}

            {/* 鄉鎮名稱 */}
            {geo && pathGen && geo.features.map((f) => {
              const name = f.properties.TOWNNAME;
              const active = selected === name;
              const dim = !selectedIsCounty && !active;
              if (dim) return null;
              const [cx, cy] = pathGen.centroid(f as any);
              return (
                <text key={`lbl-${name}`} x={cx} y={cy - 18} fill={active ? "#5a3c20" : "#6b5a40"}
                  fontSize={active ? 13 : 10} fontWeight={active ? 700 : 500}
                  textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                  style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                  {name}
                </text>
              );
            })}

            {/* 龜山島 */}
            {projection && (() => {
              const p = projection([121.954, 24.839]);
              if (!p) return null;
              return <text x={p[0]} y={p[1] + 14} fill="#7a5c40" fontSize={9} textAnchor="middle"
                pointerEvents="none" opacity={0.75}>龜山島</text>;
            })()}

            {/* 觀點圖標 */}
            {visiblePoints.map((pt) => {
              const isActive = activeVp === pt.vp.id;
              return (
                <g key={pt.vp.id} style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); setActiveVp(isActive ? null : pt.vp.id); }}>
                  {/* 脈動光圈 */}
                  {!isActive && (
                    <circle cx={pt.x} cy={pt.y} r={6} fill="#e8935a" opacity="0.4">
                      <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={pt.x} cy={pt.y} r={isActive ? 9 : 6}
                    fill={isActive ? "#d4522a" : "#e8935a"}
                    stroke="#fff" strokeWidth={2} />
                </g>
              );
            })}
          </svg>

          {/* 左上角區域標籤 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
            <span className="text-sm font-bold" style={{ color: "#7a5c40" }}>{selected}</span>
            <span className="text-xs ml-2" style={{ color: "#999" }}>{countByTown.get(selected) ?? 0} 個觀點</span>
          </div>

          {/* Loading */}
          {!geo && (
            <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#999" }}>
              載入地圖中…
            </div>
          )}

          {/* 浮動彈出卡片 */}
          {activeVpData && (
            <div className="absolute z-30 rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 280,
                background: "#fff",
                border: "1px solid #e8e0d4",
                left: `${Math.min(75, Math.max(5, (activeVpData.x / WIDTH) * 100))}%`,
                top: `${Math.min(50, Math.max(5, (activeVpData.y / HEIGHT) * 100 + 3))}%`,
                transform: activeVpData.x / WIDTH > 0.6 ? "translateX(-90%)" : "translateX(0)",
              }}>
              {/* 照片 */}
              <div className="aspect-[16/10] overflow-hidden" style={{ background: "#f2ede6" }}>
                <SafeImage src={activeVpData.vp.cover_url} alt={activeVpData.vp.name} placeholderType="topic" />
              </div>
              <div className="p-3">
                <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: "#E3F2FD", color: "#1565C0" }}>觀點</span>
                <h4 className="text-sm font-semibold mb-1.5 leading-snug" style={{ color: "#1a1612" }}>
                  {activeVpData.vp.name}
                </h4>
                {activeVpData.vp.summary && (
                  <p className="text-[0.75em] leading-relaxed line-clamp-5 mb-3" style={{ color: "#666" }}>
                    {activeVpData.vp.summary.slice(0, 300)}
                    {activeVpData.vp.summary.length > 300 && "…"}
                  </p>
                )}
                <Link href={`/viewpoint/${activeVpData.vp.notion_id || activeVpData.vp.id}`}
                  className="block text-center text-xs py-2 rounded-md font-medium"
                  style={{ background: "#7a5c40", color: "#fff", textDecoration: "none" }}>
                  看更多 →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
