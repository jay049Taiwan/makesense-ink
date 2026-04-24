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

// 山區鄉鎮（畫三角山峰裝飾）
const MOUNTAIN_TOWNS = new Set(["大同鄉", "南澳鄉", "員山鄉"]);

const WIDTH = 640;
const HEIGHT = 580;

// 羊皮紙/復古地圖配色
const PAPER_BG = "#f4ead5";
const INK_DARK = "#5a3c20";
const INK_MID = "#8b7355";
const LAND_BASE = "#e0cf9f";
const LAND_DIM = "#ecdfbd";
const LAND_ACTIVE = "#d4b370";
const MOUNTAIN_FILL = "#a08060";
const SEA_INK = "#6b8da8";
const PIN_RED = "#b83a2e";
const PIN_PAPER = "#fffbf0";

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

  const projection = useMemo(() => {
    if (!geo) return null;
    return geoIdentity().reflectY(true).fitExtent([[24, 24], [WIDTH - 24, HEIGHT - 24]], geo as any);
  }, [geo]);
  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // 觀點依 region 分配到鄉鎮中心
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
        // 同鄉鎮多觀點：水平錯開避免直立標籤重疊
        const spread = Math.min(70, vps.length * 24);
        const start = -spread / 2;
        vps.forEach((vp, i) => {
          const offsetX = vps.length === 1 ? 0 : start + (i * spread) / (vps.length - 1);
          points.push({
            vp,
            x: center[0] + offsetX,
            y: center[1] + (i % 2 === 0 ? 0 : 16),
            town,
          });
        });
      }
    });
    return points;
  }, [geo, projection, pathGen, viewpoints]);

  const selectedIsCounty = selected === "宜蘭縣";
  const visiblePoints = selectedIsCounty ? vpPoints : vpPoints.filter(p => p.town === selected);

  const countByTown = useMemo(() => {
    const m = new Map<string, number>();
    m.set("宜蘭縣", viewpoints.length);
    TOWNSHIP_ORDER.forEach(t => m.set(t, 0));
    vpPoints.forEach(p => m.set(p.town, (m.get(p.town) || 0) + 1));
    return m;
  }, [vpPoints, viewpoints]);

  const activeVpData = activeVp ? vpPoints.find(p => p.vp.id === activeVp) : null;

  // 用 rough.js 繪製手繪感鄉鎮多邊形
  useEffect(() => {
    if (!geo || !pathGen || !roughLayerRef.current || !svgRef.current) return;
    const rc = rough.svg(svgRef.current);
    const layer = roughLayerRef.current;
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    geo.features.forEach(f => {
      const name = f.properties.TOWNNAME;
      const active = selected === name;
      const dim = !selectedIsCounty && !active;
      const hover = hovered === name;
      const d = pathGen(f as any) || "";
      if (!d) return;

      // 用鄉鎮名當 seed，保持每次重繪抖動一致
      const seed = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);

      const node = rc.path(d, {
        stroke: active ? INK_DARK : INK_MID,
        strokeWidth: active ? 2.2 : 1.3,
        fill: active ? LAND_ACTIVE : dim ? LAND_DIM : hover ? "#d9c89e" : LAND_BASE,
        fillStyle: "hachure",
        hachureAngle: 42,
        hachureGap: active ? 4.5 : 6,
        roughness: 1.5,
        bowing: 1.8,
        preserveVertices: true,
        seed,
      });
      layer.appendChild(node);
    });
  }, [geo, pathGen, selected, selectedIsCounty, hovered]);

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612", fontFamily: "'Noto Serif TC', serif" }}>觀點漫遊</h2>
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
              {/* 羊皮紙紋理 */}
              <filter id="paperNoise">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
                <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.12 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
              {/* 四角陰影漸層（模擬舊紙張氧化） */}
              <radialGradient id="paperVignette" cx="50%" cy="50%" r="75%">
                <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(120,90,50,0.25)" />
              </radialGradient>
            </defs>

            {/* 紙張底 */}
            <rect width={WIDTH} height={HEIGHT} fill={PAPER_BG} />
            <rect width={WIDTH} height={HEIGHT} filter="url(#paperNoise)" opacity="0.55" />

            {/* 太平洋題字 */}
            <text x={WIDTH - 18} y={HEIGHT / 2} fill={SEA_INK} fontSize="16" textAnchor="middle" opacity="0.55"
              transform={`rotate(90, ${WIDTH - 18}, ${HEIGHT / 2})`}
              style={{ fontFamily: "'Noto Serif TC', serif", letterSpacing: 6, fontWeight: 600 }}>
              太 平 洋
            </text>

            {/* 海浪裝飾線（右側沿海） */}
            {[...Array(4)].map((_, i) => (
              <path key={`wave-${i}`}
                d={`M ${WIDTH - 50 - i * 8} ${80 + i * 120} q 6 -4 12 0 t 12 0 t 12 0`}
                stroke={SEA_INK} strokeWidth="0.8" fill="none" opacity="0.3" />
            ))}

            {/* 手繪鄉鎮多邊形（rough.js 產生） */}
            <g ref={roughLayerRef} />

            {/* 山峰裝飾（山區鄉鎮） */}
            {geo && pathGen && geo.features
              .filter(f => MOUNTAIN_TOWNS.has(f.properties.TOWNNAME))
              .map(f => {
                const name = f.properties.TOWNNAME;
                const active = selected === name;
                const dim = !selectedIsCounty && !active;
                if (dim) return null;
                const [cx, cy] = pathGen.centroid(f as any);
                const peaks = name === "大同鄉" || name === "南澳鄉" ? 3 : 1;
                return (
                  <g key={`mt-${name}`} pointerEvents="none" opacity={active ? 1 : 0.75}>
                    {[...Array(peaks)].map((_, i) => {
                      const dx = (i - (peaks - 1) / 2) * 22;
                      const baseY = cy + 22;
                      const topY = baseY - 16 - (i === Math.floor(peaks / 2) ? 6 : 0);
                      return (
                        <g key={i}>
                          <path
                            d={`M ${cx + dx - 12} ${baseY} L ${cx + dx} ${topY} L ${cx + dx + 12} ${baseY} Z`}
                            fill={MOUNTAIN_FILL} stroke={INK_DARK} strokeWidth="0.8" strokeLinejoin="round" />
                          {/* 山頂雪線 */}
                          <path
                            d={`M ${cx + dx - 4} ${topY + 5} L ${cx + dx} ${topY} L ${cx + dx + 4} ${topY + 5}`}
                            fill="none" stroke="#fff8e8" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

            {/* 鄉鎮名（毛筆體） */}
            {geo && pathGen && geo.features.map((f) => {
              const name = f.properties.TOWNNAME;
              const active = selected === name;
              const dim = !selectedIsCounty && !active;
              if (dim) return null;
              const [cx, cy] = pathGen.centroid(f as any);
              const isMountain = MOUNTAIN_TOWNS.has(name);
              return (
                <text key={`lbl-${name}`} x={cx} y={isMountain ? cy - 28 : cy - 10}
                  fill={active ? INK_DARK : "#5a4a30"}
                  fontSize={active ? 14 : 11}
                  fontWeight={active ? 700 : 600}
                  textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                  style={{ fontFamily: "'Noto Serif TC', serif", letterSpacing: 1 }}>
                  {name}
                </text>
              );
            })}

            {/* 龜山島（手繪小島） */}
            {projection && (() => {
              const p = projection([121.954, 24.839]);
              if (!p) return null;
              return (
                <g pointerEvents="none">
                  <ellipse cx={p[0]} cy={p[1]} rx={10} ry={5}
                    fill={LAND_BASE} stroke={INK_MID} strokeWidth="1" opacity="0.9" />
                  <path d={`M ${p[0] - 6} ${p[1]} q 3 -3 6 0 t 6 0`}
                    fill="none" stroke={INK_DARK} strokeWidth="0.8" opacity="0.7" />
                  <text x={p[0]} y={p[1] + 16} fill={INK_DARK} fontSize={10} textAnchor="middle"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}>龜山島</text>
                </g>
              );
            })()}

            {/* 互動點擊層（透明，覆蓋多邊形） */}
            {geo && pathGen && geo.features.map((f) => {
              const name = f.properties.TOWNNAME;
              const d = pathGen(f as any) || "";
              return (
                <path key={`click-${name}`} d={d}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); setSelected(name); setActiveVp(null); }}
                  onMouseEnter={() => setHovered(name)}
                  onMouseLeave={() => setHovered(null)} />
              );
            })}

            {/* 觀點標籤（金子常光式直立白框） */}
            {visiblePoints.map((pt) => {
              const isActive = activeVp === pt.vp.id;
              const fullName = pt.vp.name || "";
              const maxChars = 7;
              const displayName = fullName.length > maxChars ? fullName.slice(0, maxChars - 1) + "…" : fullName;
              const chars = [...displayName];
              const charSize = 11;
              const padding = 5;
              const pinW = 17;
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
                  {/* 指示桿 */}
                  <line x1={pt.x} y1={poleTop} x2={pt.x} y2={poleBottom}
                    stroke={INK_DARK} strokeWidth={isActive ? 1.5 : 1} />

                  {/* 白框 */}
                  <rect x={pt.x - pinW / 2} y={rectTop}
                    width={pinW} height={rectH}
                    fill={PIN_PAPER}
                    stroke={isActive ? PIN_RED : INK_DARK}
                    strokeWidth={isActive ? 2 : 1}
                    rx={1}
                    style={{ filter: "drop-shadow(1px 2px 2px rgba(80,60,30,0.25))" }} />

                  {/* 頂部紅色色塊（金子常光特徵） */}
                  <rect x={pt.x - pinW / 2} y={rectTop}
                    width={pinW} height={3.5}
                    fill={PIN_RED} rx={1} />

                  {/* 直立文字（逐字堆疊） */}
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

                  {/* 實際位置紅點 */}
                  <circle cx={pt.x} cy={pt.y} r={isActive ? 3 : 2.2}
                    fill={PIN_RED} stroke="#fff8e8" strokeWidth="0.8" />
                </g>
              );
            })}

            {/* 紙張邊緣陰影（最上層，不遮蔽互動） */}
            <rect width={WIDTH} height={HEIGHT} fill="url(#paperVignette)" pointerEvents="none" />
          </svg>

          {/* 左上角區域徽章 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded"
            style={{
              background: "rgba(255,251,242,0.92)",
              border: "1px solid #b89b6e",
              backdropFilter: "blur(2px)",
              fontFamily: "'Noto Serif TC', serif",
            }}>
            <span className="text-sm font-bold" style={{ color: INK_DARK }}>{selected}</span>
            <span className="text-xs ml-2" style={{ color: "#8a7a5a" }}>{countByTown.get(selected) ?? 0} 個觀點</span>
          </div>

          {/* 右下指北針 */}
          <div className="absolute bottom-3 right-3 w-12 h-12 flex items-center justify-center"
            style={{
              background: "rgba(255,251,242,0.85)",
              border: "1px solid #b89b6e",
              borderRadius: "50%",
            }}>
            <svg viewBox="0 0 40 40" width={36} height={36}>
              <polygon points="20,6 24,20 20,16 16,20" fill={PIN_RED} stroke={INK_DARK} strokeWidth="0.8" />
              <polygon points="20,34 24,20 20,24 16,20" fill={PAPER_BG} stroke={INK_DARK} strokeWidth="0.8" />
              <text x="20" y="5" fontSize="6" fill={INK_DARK} textAnchor="middle" fontWeight="700"
                style={{ fontFamily: "'Noto Serif TC', serif" }}>北</text>
            </svg>
          </div>

          {/* Loading */}
          {!geo && (
            <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "#8a7a5a" }}>
              捲軸展開中…
            </div>
          )}

          {/* 浮動彈出卡片 */}
          {activeVpData && (
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
