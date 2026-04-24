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

// 主要河流（幹流，比較粗的那幾條）— 用來分層顯示
const MAJOR_RIVERS = new Set([
  "蘭陽溪", "宜蘭河", "冬山河", "得子口溪", "羅東溪",
  "南澳北溪", "南澳南溪", "大溪川", "蘇澳溪", "安農溪",
]);


// 各鄉鎮在地地景特色（放大視角時顯示）
type FeatureKind = "rice" | "mountain" | "forest" | "sea" | "hotspring" | "harbor" | "town" | "lake" | "onion" | "cape";
const TOWN_FEATURES: Record<string, { kind: FeatureKind; coord: [number, number]; label?: string }[]> = {
  "頭城鎮": [
    { kind: "sea", coord: [121.85, 24.86], label: "烏石港" },
    { kind: "mountain", coord: [121.73, 24.92] },
    { kind: "mountain", coord: [121.76, 24.89] },
    { kind: "cape", coord: [121.92, 25.00], label: "三貂角" },
  ],
  "礁溪鄉": [
    { kind: "hotspring", coord: [121.77, 24.82], label: "礁溪溫泉" },
    { kind: "rice", coord: [121.76, 24.84] },
    { kind: "mountain", coord: [121.70, 24.84] },
  ],
  "宜蘭市": [
    { kind: "town", coord: [121.76, 24.76], label: "宜蘭城" },
    { kind: "rice", coord: [121.78, 24.74] },
    { kind: "rice", coord: [121.74, 24.75] },
  ],
  "壯圍鄉": [
    { kind: "rice", coord: [121.80, 24.77] },
    { kind: "rice", coord: [121.82, 24.74] },
    { kind: "sea", coord: [121.86, 24.75], label: "壯圍沙丘" },
  ],
  "員山鄉": [
    { kind: "rice", coord: [121.70, 24.75] },
    { kind: "mountain", coord: [121.60, 24.76] },
    { kind: "forest", coord: [121.64, 24.74] },
    { kind: "lake", coord: [121.65, 24.73], label: "雙連埤" },
  ],
  "大同鄉": [
    { kind: "mountain", coord: [121.50, 24.55] },
    { kind: "mountain", coord: [121.48, 24.65] },
    { kind: "mountain", coord: [121.55, 24.50] },
    { kind: "forest", coord: [121.53, 24.45], label: "太平山" },
    { kind: "forest", coord: [121.58, 24.60] },
    { kind: "forest", coord: [121.50, 24.70] },
  ],
  "南澳鄉": [
    { kind: "mountain", coord: [121.53, 24.40] },
    { kind: "mountain", coord: [121.60, 24.47] },
    { kind: "forest", coord: [121.65, 24.45] },
    { kind: "sea", coord: [121.78, 24.44], label: "南澳海岸" },
    { kind: "forest", coord: [121.55, 24.50] },
  ],
  "蘇澳鎮": [
    { kind: "harbor", coord: [121.86, 24.59], label: "蘇澳港" },
    { kind: "mountain", coord: [121.80, 24.56] },
    { kind: "sea", coord: [121.87, 24.60] },
    { kind: "cape", coord: [121.82, 24.51], label: "南方澳" },
  ],
  "冬山鄉": [
    { kind: "rice", coord: [121.78, 24.64] },
    { kind: "lake", coord: [121.74, 24.62], label: "梅花湖" },
    { kind: "rice", coord: [121.80, 24.63] },
    { kind: "forest", coord: [121.76, 24.60] },
  ],
  "五結鄉": [
    { kind: "rice", coord: [121.81, 24.70] },
    { kind: "rice", coord: [121.79, 24.69] },
    { kind: "sea", coord: [121.84, 24.70], label: "蘭陽溪口" },
  ],
  "羅東鎮": [
    { kind: "town", coord: [121.77, 24.68], label: "羅東街" },
    { kind: "forest", coord: [121.76, 24.67], label: "羅東林場" },
    { kind: "rice", coord: [121.78, 24.69] },
  ],
  "三星鄉": [
    { kind: "onion", coord: [121.67, 24.68], label: "三星蔥田" },
    { kind: "rice", coord: [121.65, 24.66] },
    { kind: "rice", coord: [121.70, 24.67] },
    { kind: "mountain", coord: [121.60, 24.65] },
  ],
};

// 地景圖示（手繪風）
function LandscapeIcon({ kind, x, y, label }: { kind: FeatureKind; x: number; y: number; label?: string }) {
  const s = 1;
  const render = () => {
    switch (kind) {
      case "mountain":
        return (
          <g>
            <path d={`M ${x - 14 * s} ${y + 8} L ${x} ${y - 14 * s} L ${x + 14 * s} ${y + 8} Z`}
              fill={"#a08060"} stroke={"#5a3c20"} strokeWidth={0.8} strokeLinejoin="round" />
            <path d={`M ${x - 4 * s} ${y - 8} L ${x} ${y - 14 * s} L ${x + 4 * s} ${y - 8}`}
              fill="none" stroke={"#fff8e8"} strokeWidth={1.2} strokeLinecap="round" />
          </g>
        );
      case "forest":
        return (
          <g>
            {[-8, 0, 8].map((dx, i) => (
              <g key={i}>
                <path d={`M ${x + dx - 6} ${y + 8} L ${x + dx} ${y - 8} L ${x + dx + 6} ${y + 8} Z`}
                  fill={"#5a8a5a"} stroke={"#3a5a3a"} strokeWidth={0.8} strokeLinejoin="round" opacity={0.85} />
                <line x1={x + dx} y1={y + 8} x2={x + dx} y2={y + 12} stroke={"#5a3c20"} strokeWidth={1.2} />
              </g>
            ))}
          </g>
        );
      case "rice":
        // 田字格：2×2 + 十字
        return (
          <g opacity={0.85}>
            <rect x={x - 10} y={y - 10} width={20} height={20} fill={"#e8d580"} stroke={"#8b7355"} strokeWidth={1} />
            <line x1={x - 10} y1={y} x2={x + 10} y2={y} stroke={"#8b7355"} strokeWidth={0.8} />
            <line x1={x} y1={y - 10} x2={x} y2={y + 10} stroke={"#8b7355"} strokeWidth={0.8} />
            {/* 幾撮稻穗小點 */}
            {[[-5, -5], [5, -5], [-5, 5], [5, 5]].map(([dx, dy], i) => (
              <circle key={i} cx={x + dx} cy={y + dy} r={1.2} fill={"#8a6a2a"} opacity={0.7} />
            ))}
          </g>
        );
      case "sea":
        return (
          <g opacity={0.7}>
            {[0, 6, 12].map((dy, i) => (
              <path key={i}
                d={`M ${x - 14} ${y + dy} q 3 -3 6 0 t 6 0 t 6 0 t 6 0`}
                fill="none" stroke={"#6b8da8"} strokeWidth={1} strokeLinecap="round" />
            ))}
          </g>
        );
      case "hotspring":
        return (
          <g>
            <circle cx={x} cy={y + 4} r={7} fill={"#f4d4c8"} stroke={"#b83a2e"} strokeWidth={1} />
            {/* 蒸氣 */}
            {[-5, 0, 5].map((dx, i) => (
              <path key={i}
                d={`M ${x + dx} ${y - 2} q 1.5 -3 0 -6 t 0 -6`}
                fill="none" stroke={"#b83a2e"} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
            ))}
          </g>
        );
      case "harbor":
        // 小船
        return (
          <g>
            <path d={`M ${x - 10} ${y + 3} L ${x + 10} ${y + 3} L ${x + 6} ${y + 8} L ${x - 6} ${y + 8} Z`}
              fill={"#8b7355"} stroke={"#5a3c20"} strokeWidth={0.8} />
            <line x1={x} y1={y + 3} x2={x} y2={y - 8} stroke={"#5a3c20"} strokeWidth={1} />
            <path d={`M ${x} ${y - 8} L ${x + 6} ${y - 3} L ${x} ${y - 1} Z`}
              fill={"#b83a2e"} stroke={"#5a3c20"} strokeWidth={0.6} />
          </g>
        );
      case "town":
        // 三座小屋
        return (
          <g>
            {[-10, 0, 10].map((dx, i) => (
              <g key={i}>
                <rect x={x + dx - 5} y={y + 0} width={10} height={8} fill={"#d9b88a"} stroke={"#5a3c20"} strokeWidth={0.8} />
                <path d={`M ${x + dx - 5} ${y} L ${x + dx} ${y - 6} L ${x + dx + 5} ${y} Z`}
                  fill={"#b83a2e"} stroke={"#5a3c20"} strokeWidth={0.8} strokeLinejoin="round" />
              </g>
            ))}
          </g>
        );
      case "lake":
        return (
          <g>
            <ellipse cx={x} cy={y} rx={12} ry={6} fill={"#a8c8dc"} stroke={"#4a7a95"} strokeWidth={1} opacity={0.85} />
            <path d={`M ${x - 6} ${y} q 2 -2 4 0 t 4 0`} fill="none" stroke={"#4a7a95"} strokeWidth={0.6} opacity={0.7} />
          </g>
        );
      case "onion":
        // 三星蔥：幾根綠色條
        return (
          <g>
            {[-6, -2, 2, 6].map((dx, i) => (
              <g key={i}>
                <line x1={x + dx} y1={y + 8} x2={x + dx} y2={y - 6} stroke={"#5aa85a"} strokeWidth={1.8} strokeLinecap="round" />
                <circle cx={x + dx} cy={y + 8} r={2} fill={"#fff8e8"} stroke={"#5a3c20"} strokeWidth={0.6} />
              </g>
            ))}
          </g>
        );
      case "cape":
        // 岬角：尖形
        return (
          <g opacity={0.8}>
            <path d={`M ${x - 10} ${y + 4} L ${x + 6} ${y - 6} L ${x + 10} ${y + 4} Z`}
              fill={"#a08060"} stroke={"#5a3c20"} strokeWidth={0.8} strokeLinejoin="round" />
          </g>
        );
      default:
        return null;
    }
  };
  return (
    <g pointerEvents="none">
      {render()}
      {label && (
        <text x={x} y={y + 22} fill="#5a3c20" fontSize={10} textAnchor="middle"
          style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 600 }}>
          {label}
        </text>
      )}
    </g>
  );
}

export default function ViewpointExplorer() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roughLayerRef = useRef<SVGGElement | null>(null);

  const [geo, setGeo] = useState<GeoData | null>(null);
  const [rivers, setRivers] = useState<any | null>(null);
  const [peaks, setPeaks] = useState<any | null>(null);
  const [water, setWater] = useState<any | null>(null);
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [selected, setSelected] = useState<string>("宜蘭縣");
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeVp, setActiveVp] = useState<string | null>(null);

  useEffect(() => {
    fetch("/geo/yilan.geo.json").then(r => r.json()).then(setGeo).catch(() => setGeo(null));
    fetch("/geo/yilan-rivers.geo.json").then(r => r.json()).then(setRivers).catch(() => setRivers(null));
    fetch("/geo/yilan-peaks.geo.json").then(r => r.json()).then(setPeaks).catch(() => setPeaks(null));
    fetch("/geo/yilan-water.geo.json").then(r => r.json()).then(setWater).catch(() => setWater(null));
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
        // 全縣視角用斜線填色保留手繪感；鄉鎮放大後改純色底，避免斜線干擾閱讀
        fill: active ? LAND_ACTIVE : hover ? "#d9c89e" : LAND_BASE,
        fillStyle: selectedIsCounty ? "hachure" : "solid",
        hachureAngle: 42,
        hachureGap: 6,
        roughness: 1.5,
        bowing: 1.8,
        preserveVertices: true,
        seed,
      });
      layer.appendChild(node);
    });
  }, [pathGen, visibleFeatures, selected, selectedIsCounty, hovered]);

  // 河流路徑（從 OSM 資料）
  const riverPaths = useMemo(() => {
    if (!pathGen || !rivers) return [];
    // 找每條有名河流最長的那段當標籤段
    const longestByName = new Map<string, number>();
    rivers.features.forEach((f: any) => {
      const n = f.properties?.name;
      if (!n) return;
      const len = f.geometry.coordinates.length;
      const cur = longestByName.get(n) ?? 0;
      if (len > cur) longestByName.set(n, len);
    });
    const labeled = new Set<string>();
    return rivers.features.map((f: any) => {
      const d = pathGen(f as any);
      const name = f.properties?.name || null;
      const isMajor = name && MAJOR_RIVERS.has(name);
      const coords = f.geometry.coordinates;
      const mid = coords[Math.floor(coords.length / 2)];
      const midProj = projection ? projection(mid) : null;
      let shouldLabel = false;
      if (name && isMajor && !labeled.has(name) && coords.length === longestByName.get(name)) {
        shouldLabel = true;
        labeled.add(name);
      }
      return { name, d, isMajor, mid: midProj, shouldLabel };
    }).filter((r: any) => r.d);
  }, [pathGen, projection, rivers]);

  // 湖泊路徑（從 OSM 資料）
  const waterPaths = useMemo(() => {
    if (!pathGen || !water) return [];
    return water.features.map((f: any) => {
      const d = pathGen(f as any);
      const name = f.properties?.name || null;
      const cen = pathGen.centroid(f as any);
      return { name, d, cx: cen[0], cy: cen[1] };
    }).filter((w: any) => w.d);
  }, [pathGen, water]);

  // 山峰點（從 OSM 資料）
  const peakPoints = useMemo(() => {
    if (!projection || !peaks) return [];
    return peaks.features.map((f: any) => {
      const p = projection(f.geometry.coordinates as [number, number]);
      if (!p) return null;
      return {
        name: f.properties.name,
        ele: f.properties.ele,
        x: p[0], y: p[1],
      };
    }).filter(Boolean) as { name: string; ele: number | null; x: number; y: number }[];
  }, [projection, peaks]);

  // 選中鄉鎮的輪廓路徑（用於裁切河流/山脈）
  const selectedTownshipD = useMemo(() => {
    if (selectedIsCounty || !pathGen || !geo) return null;
    const f = geo.features.find(f => f.properties.TOWNNAME === selected);
    return f ? pathGen(f as any) : null;
  }, [geo, pathGen, selected, selectedIsCounty]);

  // 鄉鎮地景特色（投影為 SVG 座標）
  const townFeaturePoints = useMemo(() => {
    if (!projection || selectedIsCounty) return [];
    const feats = TOWN_FEATURES[selected] || [];
    return feats.map(f => {
      const p = projection(f.coord);
      return p ? { ...f, x: p[0], y: p[1] } : null;
    }).filter(Boolean) as { kind: FeatureKind; coord: [number, number]; label?: string; x: number; y: number }[];
  }, [projection, selected, selectedIsCounty]);

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
              {/* 選中鄉鎮輪廓：用於裁切河流/山脈（放大視角下） */}
              {selectedTownshipD && (
                <clipPath id="townClip">
                  <path d={selectedTownshipD} />
                </clipPath>
              )}
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

            {/* 地景（河流 + 山峰 + 湖泊 + 在地特色）— 放大視角時裁切到該鄉鎮輪廓內 */}
            <g clipPath={selectedIsCounty ? undefined : "url(#townClip)"}>
              {/* 河流（OSM 真實資料） */}
              {riverPaths.map((r: any, idx: number) => {
                const major = r.isMajor;
                const showInCounty = selectedIsCounty;
                // 全縣視角只畫主要河；鄉鎮視角畫全部（clipPath 會裁到輪廓內）
                if (showInCounty && !major) return null;
                return (
                  <g key={`river-${idx}`} pointerEvents="none">
                    <path d={r.d} fill="none" stroke={RIVER_BLUE}
                      strokeWidth={major ? (selectedIsCounty ? 4 : 5) : 1.5}
                      strokeLinecap="round" strokeLinejoin="round"
                      opacity={major ? 0.4 : 0.35} />
                    <path d={r.d} fill="none" stroke={RIVER_BLUE}
                      strokeWidth={major ? (selectedIsCounty ? 2 : 2.8) : 0.8}
                      strokeLinecap="round" strokeLinejoin="round"
                      opacity={major ? 0.85 : 0.6} />
                    {selectedIsCounty && r.shouldLabel && r.mid && inView(r.mid[0], r.mid[1]) && (
                      <text x={r.mid[0]} y={r.mid[1] - 4}
                        fill="#3a5f75" fontSize="9" textAnchor="middle"
                        style={{ fontFamily: "'Noto Serif TC', serif", fontStyle: "italic" }}>
                        {r.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 湖泊 */}
              {waterPaths.map((w: any, idx: number) => (
                <g key={`water-${idx}`} pointerEvents="none">
                  <path d={w.d} fill="#a8c8dc" stroke="#4a7a95" strokeWidth="0.8" opacity={0.85} />
                  {!selectedIsCounty && w.name && inView(w.cx, w.cy) && (
                    <text x={w.cx} y={w.cy + 2}
                      fill="#3a5f75" fontSize="9" textAnchor="middle"
                      style={{ fontFamily: "'Noto Serif TC', serif" }}>
                      {w.name}
                    </text>
                  )}
                </g>
              ))}

              {/* 山峰（OSM 真實資料） */}
              {peakPoints.map((p, i) => {
                if (!inView(p.x, p.y)) return null;
                const ele = p.ele || 500;
                // 全縣視角：只顯示 >= 2500m 的高山
                // 鄉鎮視角：顯示 >= 800m
                const minEle = selectedIsCounty ? 2500 : 800;
                if (ele < minEle) return null;
                // 三角形大小依海拔
                const size = Math.max(6, Math.min(18, 4 + Math.sqrt(ele / 100)));
                const showSnow = ele >= 3000;
                const showLabel = selectedIsCounty ? ele >= 3000 : ele >= 1500;
                return (
                  <g key={`peak-${i}`} pointerEvents="none" opacity={0.92}>
                    <path
                      d={`M ${p.x - size} ${p.y + size * 0.6} L ${p.x} ${p.y - size} L ${p.x + size} ${p.y + size * 0.6} Z`}
                      fill={MOUNTAIN_FILL} stroke={INK_DARK} strokeWidth={0.7} strokeLinejoin="round" />
                    {showSnow && (
                      <path
                        d={`M ${p.x - size * 0.35} ${p.y - size * 0.45} L ${p.x} ${p.y - size} L ${p.x + size * 0.35} ${p.y - size * 0.45}`}
                        fill="none" stroke="#fff8e8" strokeWidth={1.2} strokeLinecap="round" opacity={0.9} />
                    )}
                    {showLabel && (
                      <text x={p.x} y={p.y + size * 0.6 + 10}
                        fill={INK_DARK} fontSize={selectedIsCounty ? 8 : 9}
                        textAnchor="middle"
                        style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 600 }}>
                        {p.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 在地特色地景（只在放大視角） */}
              {!selectedIsCounty && townFeaturePoints.map((f, i) => {
                if (!inView(f.x, f.y)) return null;
                return <LandscapeIcon key={`feat-${i}`} kind={f.kind} x={f.x} y={f.y} label={f.label} />;
              })}
            </g>

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
