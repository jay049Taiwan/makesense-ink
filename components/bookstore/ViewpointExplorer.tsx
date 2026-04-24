"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { geoIdentity, geoPath } from "d3-geo";
import rough from "roughjs";
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
const HEIGHT = 580;

// 色彩
const PAPER_BG = "#f4ead5";
const INK_DARK = "#5a3c20";
const INK_MID = "#8b7355";
const LAND_BASE = "#e0cf9f";
const LAND_ACTIVE = "#d4b370";
const MOUNTAIN_FILL = "#a08060";
const RIVER_BLUE = "#7ba3c4";
const SEA_INK = "#6b8da8";
const PIN_RED = "#b83a2e";
const PIN_PAPER = "#fffbf0";

// 主要河流（近似路徑，[lng, lat]）
const RIVERS: { name: string; coords: [number, number][] }[] = [
  {
    name: "蘭陽溪",
    coords: [
      [121.42, 24.42], [121.47, 24.48], [121.54, 24.54], [121.60, 24.60],
      [121.66, 24.63], [121.72, 24.66], [121.78, 24.68], [121.83, 24.70],
    ],
  },
  {
    name: "冬山河",
    coords: [[121.81, 24.60], [121.82, 24.64], [121.81, 24.68], [121.81, 24.71]],
  },
  {
    name: "宜蘭河",
    coords: [[121.68, 24.76], [121.73, 24.74], [121.78, 24.72], [121.82, 24.70]],
  },
  {
    name: "得子口溪",
    coords: [[121.78, 24.88], [121.81, 24.89], [121.85, 24.89]],
  },
  {
    name: "羅東溪",
    coords: [[121.65, 24.64], [121.70, 24.66], [121.76, 24.67]],
  },
];

// 中央山脈東側山峰點（由北往南），[lng, lat]
const MOUNTAIN_RANGE: [number, number][] = [
  [121.50, 24.86], [121.53, 24.80], [121.50, 24.74], [121.55, 24.68],
  [121.52, 24.62], [121.56, 24.56], [121.52, 24.50], [121.56, 24.44],
];

export default function ViewpointExplorer() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roughLayerRef = useRef<SVGGElement | null>(null);

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

  const selectedIsCounty = selected === "宜蘭縣";

  // 動態投影：全縣 fit 全圖；鄉鎮 fit 該鄉鎮
  const projection = useMemo(() => {
    if (!geo) return null;
    let target: any = geo;
    if (!selectedIsCounty) {
      const f = geo.features.find(f => f.properties.TOWNNAME === selected);
      if (f) target = { type: "FeatureCollection", features: [f] };
    }
    const pad = selectedIsCounty ? 28 : 50;
    return geoIdentity().reflectY(true).fitExtent([[pad, pad], [WIDTH - pad, HEIGHT - pad]], target);
  }, [geo, selected, selectedIsCounty]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // 觀點分配到鄉鎮中心
  const vpPoints = useMemo(() => {
    if (!geo || !projection || !pathGen) return [];
    const centroidMap = new Map<string, [number, number]>();
    geo.features.forEach(f => {
      centroidMap.set(f.properties.TOWNNAME, pathGen.centroid(f as any));
    });
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
      if (!center) return;
      if (vps.length === 1) {
        points.push({ vp: vps[0], x: center[0], y: center[1], town });
      } else {
        const spread = Math.min(80, vps.length * 26);
        vps.forEach((vp, i) => {
          const offsetX = vps.length === 1 ? 0 : -spread / 2 + (i * spread) / (vps.length - 1);
          points.push({
            vp,
            x: center[0] + offsetX,
            y: center[1] + (i % 2 === 0 ? 0 : 18),
            town,
          });
        });
      }
    });
    return points;
  }, [geo, projection, pathGen, viewpoints]);

  const visiblePoints = selectedIsCounty ? vpPoints : vpPoints.filter(p => p.town === selected);

  const countByTown = useMemo(() => {
    const m = new Map<string, number>();
    m.set("宜蘭縣", viewpoints.length);
    TOWNSHIP_ORDER.forEach(t => m.set(t, 0));
    vpPoints.forEach(p => m.set(p.town, (m.get(p.town) || 0) + 1));
    return m;
  }, [vpPoints, viewpoints]);

  const activeVpData = activeVp ? vpPoints.find(p => p.vp.id === activeVp) : null;

  // 過濾要顯示的鄉鎮（全縣=全部；鄉鎮=只顯示該鄉鎮）
  const visibleFeatures = useMemo(() => {
    if (!geo) return [];
    if (selectedIsCounty) return geo.features;
    return geo.features.filter(f => f.properties.TOWNNAME === selected);
  }, [geo, selected, selectedIsCounty]);

  // rough.js 繪製鄉鎮
  useEffect(() => {
    if (!pathGen || !roughLayerRef.current || !svgRef.current) return;
    const rc = rough.svg(svgRef.current);
    const layer = roughLayerRef.current;
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    visibleFeatures.forEach(f => {
      const name = f.properties.TOWNNAME;
      const active = selected === name;
      const hover = hovered === name;
      const d = pathGen(f as any) || "";
      if (!d) return;
      const seed = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
      const node = rc.path(d, {
        stroke: active ? INK_DARK : INK_MID,
        strokeWidth: active ? 2.2 : 1.3,
        fill: active ? LAND_ACTIVE : hover ? "#d9c89e" : LAND_BASE,
        fillStyle: "hachure",
        hachureAngle: 42,
        hachureGap: selectedIsCounty ? 6 : 9,
        roughness: 1.5,
        bowing: 1.8,
        preserveVertices: true,
        seed,
      });
      layer.appendChild(node);
    });
  }, [pathGen, visibleFeatures, selected, selectedIsCounty, hovered]);

  // 把 RIVERS 投影為 SVG 路徑
  const riverPaths = useMemo(() => {
    if (!projection) return [];
    return RIVERS.map(r => {
      const pts = r.coords.map(c => projection(c)).filter(Boolean) as [number, number][];
      if (pts.length < 2) return null;
      // 用 Catmull-Rom 轉貝茲曲線，讓河流平滑彎曲
      let d = `M ${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
      }
      return { name: r.name, d, head: pts[0], tail: pts[pts.length - 1] };
    }).filter(Boolean) as { name: string; d: string; head: [number, number]; tail: [number, number] }[];
  }, [projection]);

  // 投影山峰
  const mountainPoints = useMemo(() => {
    if (!projection) return [];
    return MOUNTAIN_RANGE.map(c => projection(c)).filter(Boolean) as [number, number][];
  }, [projection]);

  // 判定一點是否在目前 viewBox 內（簡單邊界濾除）
  const inView = (x: number, y: number) => x > -10 && x < WIDTH + 10 && y > -10 && y < HEIGHT + 10;

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612", fontFamily: "'Noto Serif TC', serif" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        {/* 左欄：鄉鎮 */}
        <div className="hidden sm:flex flex-col gap-1.5">
          {(["宜蘭縣", ...TOWNSHIP_ORDER] as const).map((name) => {
            const count = countByTown.get(name) ?? 0;
            const active = selected === name;
            return (
              <button key={name} onClick={() => { setSelected(name); setActiveVp(null); }}
                className="px-3 py-2 text-left text-[0.85em] rounded-lg transition-all flex items-center justify-between"
                style={{
                  background: active ? "#7a5c40" : "#f7f3ea",
                  color: active ? "#fff" : "#5a4a30",
                  border: active ? "none" : "1px solid #e5dcc8",
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
        <div className="relative rounded-xl overflow-hidden"
          style={{
            background: PAPER_BG,
            border: "2px solid #b89b6e",
            boxShadow: "inset 0 0 70px rgba(139,115,85,0.18)",
          }}
          onClick={() => setActiveVp(null)}>

          <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: 620, display: "block" }}>
            <defs>
              <filter id="paperNoise">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
                <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.12 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
              <radialGradient id="paperVignette" cx="50%" cy="50%" r="75%">
                <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(120,90,50,0.25)" />
              </radialGradient>
            </defs>

            {/* 紙張 */}
            <rect width={WIDTH} height={HEIGHT} fill={PAPER_BG} />
            <rect width={WIDTH} height={HEIGHT} filter="url(#paperNoise)" opacity="0.55" />

            {/* 太平洋 */}
            <text x={WIDTH - 18} y={HEIGHT / 2} fill={SEA_INK} fontSize="16" textAnchor="middle" opacity="0.55"
              transform={`rotate(90, ${WIDTH - 18}, ${HEIGHT / 2})`}
              style={{ fontFamily: "'Noto Serif TC', serif", letterSpacing: 6, fontWeight: 600 }}>
              太 平 洋
            </text>

            {/* 海浪裝飾 */}
            {[...Array(6)].map((_, i) => (
              <path key={`wave-${i}`}
                d={`M ${WIDTH - 60 - i * 6} ${60 + i * 90} q 6 -4 12 0 t 12 0 t 12 0`}
                stroke={SEA_INK} strokeWidth="0.8" fill="none" opacity="0.3" />
            ))}

            {/* 手繪鄉鎮 */}
            <g ref={roughLayerRef} />

            {/* 河流（多層：底寬淡色 + 上窄深色，營造手繪描邊感） */}
            {riverPaths.map((r, idx) => (
              <g key={`river-${idx}`} pointerEvents="none">
                <path d={r.d} fill="none" stroke={RIVER_BLUE} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
                <path d={r.d} fill="none" stroke={RIVER_BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d={r.d} fill="none" stroke="#4a7a95" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" strokeDasharray="2 3" />
                {/* 河名（只在全縣視角顯示） */}
                {selectedIsCounty && inView(r.tail[0], r.tail[1]) && (
                  <text
                    x={(r.head[0] + r.tail[0]) / 2}
                    y={(r.head[1] + r.tail[1]) / 2 - 3}
                    fill="#3a5f75" fontSize="9" textAnchor="middle"
                    style={{ fontFamily: "'Noto Serif TC', serif", fontStyle: "italic" }}>
                    {r.name}
                  </text>
                )}
              </g>
            ))}

            {/* 山脈（中央山脈東側，全縣 + 山區鄉鎮視角才畫） */}
            {(selectedIsCounty || ["大同鄉", "南澳鄉", "員山鄉", "三星鄉", "冬山鄉"].includes(selected)) &&
              mountainPoints.map(([mx, my], i) => {
                if (!inView(mx, my)) return null;
                // 每個點畫一組 3 個連續山峰
                const scale = selectedIsCounty ? 1 : 1.4;
                return (
                  <g key={`mt-${i}`} pointerEvents="none" opacity={selectedIsCounty ? 0.85 : 0.95}>
                    {[-1, 0, 1].map((k) => {
                      const dx = k * 14 * scale;
                      const baseY = my + 10 * scale;
                      const topY = baseY - (k === 0 ? 22 * scale : 16 * scale);
                      const peakX = mx + dx;
                      return (
                        <g key={k}>
                          <path
                            d={`M ${peakX - 10 * scale} ${baseY} L ${peakX} ${topY} L ${peakX + 10 * scale} ${baseY} Z`}
                            fill={MOUNTAIN_FILL} stroke={INK_DARK} strokeWidth={0.8} strokeLinejoin="round" />
                          {/* 雪線 */}
                          {k === 0 && (
                            <path
                              d={`M ${peakX - 3.5 * scale} ${topY + 5} L ${peakX} ${topY} L ${peakX + 3.5 * scale} ${topY + 5}`}
                              fill="none" stroke="#fff8e8" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

            {/* 鄉鎮名 */}
            {pathGen && visibleFeatures.map((f) => {
              const name = f.properties.TOWNNAME;
              const active = selected === name;
              const [cx, cy] = pathGen.centroid(f as any);
              return (
                <text key={`lbl-${name}`} x={cx} y={cy}
                  fill={active ? INK_DARK : "#5a4a30"}
                  fontSize={selectedIsCounty ? (active ? 14 : 11) : 26}
                  fontWeight={700}
                  textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                  style={{
                    fontFamily: "'Noto Serif TC', serif",
                    letterSpacing: 2,
                    opacity: selectedIsCounty ? 1 : 0.2,  // 鄉鎮視角時壓低，讓觀點標籤更突出
                  }}>
                  {name}
                </text>
              );
            })}

            {/* 龜山島（只在全縣 / 頭城 / 壯圍視角） */}
            {projection && (selectedIsCounty || ["頭城鎮", "壯圍鄉"].includes(selected)) && (() => {
              const p = projection([121.954, 24.839]);
              if (!p || !inView(p[0], p[1])) return null;
              return (
                <g pointerEvents="none">
                  <ellipse cx={p[0]} cy={p[1]} rx={10} ry={5}
                    fill={LAND_BASE} stroke={INK_MID} strokeWidth={1} opacity={0.9} />
                  <path d={`M ${p[0] - 6} ${p[1]} q 3 -3 6 0 t 6 0`}
                    fill="none" stroke={INK_DARK} strokeWidth={0.8} opacity={0.7} />
                  <text x={p[0]} y={p[1] + 16} fill={INK_DARK} fontSize={10} textAnchor="middle"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}>龜山島</text>
                </g>
              );
            })()}

            {/* 互動點擊層 */}
            {pathGen && visibleFeatures.map((f) => {
              const name = f.properties.TOWNNAME;
              const d = pathGen(f as any) || "";
              return (
                <path key={`click-${name}`} d={d}
                  fill="transparent"
                  style={{ cursor: selectedIsCounty ? "pointer" : "default" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedIsCounty) { setSelected(name); setActiveVp(null); }
                  }}
                  onMouseEnter={() => setHovered(name)}
                  onMouseLeave={() => setHovered(null)} />
              );
            })}

            {/* 鄉鎮視角時，圖框內任意位置點擊都回全縣 */}
            {!selectedIsCounty && (
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent"
                style={{ cursor: "zoom-out" }}
                onClick={(e) => { e.stopPropagation(); setSelected("宜蘭縣"); setActiveVp(null); }} />
            )}

            {/* 觀點直立白框標籤 */}
            {visiblePoints.map((pt) => {
              if (!inView(pt.x, pt.y)) return null;
              const isActive = activeVp === pt.vp.id;
              const fullName = pt.vp.name || "";
              const maxChars = selectedIsCounty ? 7 : 10;
              const displayName = fullName.length > maxChars ? fullName.slice(0, maxChars - 1) + "…" : fullName;
              const chars = [...displayName];
              const charSize = selectedIsCounty ? 11 : 14;
              const padding = 5;
              const pinW = selectedIsCounty ? 17 : 22;
              const poleH = 6;
              const rectH = chars.length * charSize + padding * 2;
              let rectTop = pt.y - poleH - rectH;
              let flipped = false;
              if (rectTop < 6) {
                rectTop = pt.y + poleH;
                flipped = true;
              }
              const poleTop = flipped ? pt.y + 1 : pt.y - poleH;
              const poleBottom = flipped ? rectTop : pt.y - 1;

              return (
                <g key={pt.vp.id} style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); setActiveVp(isActive ? null : pt.vp.id); }}>
                  <line x1={pt.x} y1={poleTop} x2={pt.x} y2={poleBottom}
                    stroke={INK_DARK} strokeWidth={isActive ? 1.5 : 1} />
                  <rect x={pt.x - pinW / 2} y={rectTop} width={pinW} height={rectH}
                    fill={PIN_PAPER}
                    stroke={isActive ? PIN_RED : INK_DARK}
                    strokeWidth={isActive ? 2 : 1}
                    rx={1}
                    style={{ filter: "drop-shadow(1px 2px 2px rgba(80,60,30,0.25))" }} />
                  <rect x={pt.x - pinW / 2} y={rectTop} width={pinW} height={3.5} fill={PIN_RED} rx={1} />
                  {chars.map((ch, i) => (
                    <text key={i}
                      x={pt.x}
                      y={rectTop + padding + 6 + charSize * i}
                      fontSize={charSize}
                      fill={INK_DARK}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                      style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: isActive ? 700 : 500 }}>
                      {ch}
                    </text>
                  ))}
                  <circle cx={pt.x} cy={pt.y} r={isActive ? 3 : 2.2}
                    fill={PIN_RED} stroke="#fff8e8" strokeWidth={0.8} />
                </g>
              );
            })}

            {/* 紙張邊緣陰影 */}
            <rect width={WIDTH} height={HEIGHT} fill="url(#paperVignette)" pointerEvents="none" />
          </svg>

          {/* 左上角區域徽章 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded flex items-center gap-2"
            style={{
              background: "rgba(255,251,242,0.92)",
              border: "1px solid #b89b6e",
              backdropFilter: "blur(2px)",
              fontFamily: "'Noto Serif TC', serif",
            }}>
            <span className="text-sm font-bold" style={{ color: INK_DARK }}>{selected}</span>
            <span className="text-xs" style={{ color: "#8a7a5a" }}>{countByTown.get(selected) ?? 0} 個觀點</span>
            {!selectedIsCounty && (
              <button onClick={(e) => { e.stopPropagation(); setSelected("宜蘭縣"); setActiveVp(null); }}
                className="ml-1 text-xs px-2 py-0.5 rounded"
                style={{ background: INK_DARK, color: PIN_PAPER, border: "none", cursor: "pointer" }}>
                ← 回全縣
              </button>
            )}
          </div>

          {/* 指北針 */}
          <div className="absolute bottom-3 right-3 w-12 h-12 flex items-center justify-center"
            style={{ background: "rgba(255,251,242,0.85)", border: "1px solid #b89b6e", borderRadius: "50%" }}>
            <svg viewBox="0 0 40 40" width={36} height={36}>
              <polygon points="20,6 24,20 20,16 16,20" fill={PIN_RED} stroke={INK_DARK} strokeWidth="0.8" />
              <polygon points="20,34 24,20 20,24 16,20" fill={PAPER_BG} stroke={INK_DARK} strokeWidth="0.8" />
              <text x="20" y="5" fontSize="6" fill={INK_DARK} textAnchor="middle" fontWeight="700"
                style={{ fontFamily: "'Noto Serif TC', serif" }}>北</text>
            </svg>
          </div>

          {!geo && (
            <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#8a7a5a" }}>
              捲軸展開中…
            </div>
          )}

          {/* 觀點卡 */}
          {activeVpData && inView(activeVpData.x, activeVpData.y) && (
            <div className="absolute z-30 rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 280,
                background: PIN_PAPER,
                border: "2px solid #b89b6e",
                left: `${Math.min(75, Math.max(5, (activeVpData.x / WIDTH) * 100))}%`,
                top: `${Math.min(50, Math.max(5, (activeVpData.y / HEIGHT) * 100 + 3))}%`,
                transform: activeVpData.x / WIDTH > 0.6 ? "translateX(-90%)" : "translateX(0)",
              }}>
              <div className="aspect-[16/10] overflow-hidden" style={{ background: "#f2ede6" }}>
                <SafeImage src={activeVpData.vp.cover_url} alt={activeVpData.vp.name} placeholderType="topic" />
              </div>
              <div className="p-3">
                <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: PIN_RED, color: "#fff" }}>觀點</span>
                <h4 className="text-sm font-semibold mb-1.5 leading-snug"
                  style={{ color: INK_DARK, fontFamily: "'Noto Serif TC', serif" }}>
                  {activeVpData.vp.name}
                </h4>
                {activeVpData.vp.summary && (
                  <p className="text-[0.75em] leading-relaxed line-clamp-5 mb-3" style={{ color: "#6b5a40" }}>
                    {activeVpData.vp.summary.slice(0, 300)}
                    {activeVpData.vp.summary.length > 300 && "…"}
                  </p>
                )}
                <Link href={`/viewpoint/${activeVpData.vp.notion_id || activeVpData.vp.id}`}
                  className="block text-center text-xs py-2 rounded-md font-medium"
                  style={{ background: INK_DARK, color: "#fffbf0", textDecoration: "none" }}>
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
