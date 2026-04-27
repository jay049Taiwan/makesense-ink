"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TOWNSHIPS, type Township } from "@/lib/yilan-townships";

// Editorial Paper 配色（單一主題，移除其他三套）
const C = {
  paper: "#faf8f4",
  ink: "#2b2620",
  inkSoft: "#5a4f42",
  brown: "#7a5c40",
  tan: "#b89e7a",
  cream: "#ede4d1",
  orange: "#e8935a",
  rule: "#cdbfa3",
  seaWash: "#d8c8ad",
  seaWashOpacity: 0.18,
};

const SERIF = `"Songti TC", "Noto Serif CJK TC", "Noto Serif TC", "Source Han Serif TC", "PingFang TC", Georgia, "Times New Roman", serif`;
const MONO = `"SF Mono", "JetBrains Mono", Menlo, Consolas, "Courier New", monospace`;

export interface MapViewpoint {
  id: string;            // notion_id（用於導航）
  name: string;
  township: string;      // township slug
  xy: [number, number];
  teacher?: string | null;
  summary?: string | null;
}

interface Props {
  viewpoints: MapViewpoint[];
  fullSize?: number;
  zoomSize?: number;
  height?: number;
}

export default function YilanMap({ viewpoints, fullSize = 5, zoomSize = 13, height = 620 }: Props) {
  const router = useRouter();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverV, setHoverV] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of viewpoints) m[v.township] = (m[v.township] || 0) + 1;
    return m;
  }, [viewpoints]);

  // 計算 zoom viewBox：active 鄉鎮的 bbox + 18% padding，鎖 5:4
  const viewBox = useMemo(() => {
    const FULL = { x: 0, y: 0, w: 1000, h: 800 };
    if (!activeId) return FULL;
    const t = TOWNSHIPS.find((x) => x.id === activeId);
    if (!t) return FULL;
    const nums = (t.path.match(/-?\d+\.?\d*/g) || []).map(Number);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nums.length; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const w = maxX - minX, h = maxY - minY;
    const padX = w * 0.18, padY = h * 0.18;
    let vx = minX - padX, vy = minY - padY, vw = w + padX * 2, vh = h + padY * 2;
    const targetRatio = 1000 / 800;
    const r = vw / vh;
    if (r > targetRatio) {
      const newH = vw / targetRatio;
      vy -= (newH - vh) / 2;
      vh = newH;
    } else {
      const newW = vh * targetRatio;
      vx -= (newW - vw) / 2;
      vw = newW;
    }
    return { x: vx, y: vy, w: vw, h: vh };
  }, [activeId]);

  const zoomScale = 1000 / viewBox.w;

  return (
    <div style={{
      width: "100%", height,
      background: C.paper, fontFamily: SERIF, color: C.ink,
      border: `1px solid ${C.rule}`,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 4px 24px rgba(80,60,40,0.08), 0 24px 60px rgba(80,60,40,0.06)",
      position: "relative", overflow: "hidden",
    }}>
      {activeId && (
        <button
          onClick={() => setActiveId(null)}
          style={{
            position: "absolute", top: 16, left: 16, zIndex: 10,
            background: C.paper, border: `1px solid ${C.brown}`,
            padding: "8px 14px", fontFamily: MONO, fontSize: 11,
            letterSpacing: "0.2em", color: C.brown, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(80,60,40,0.12)",
          }}
        >
          ← 返回全圖
        </button>
      )}

      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%", height: "100%", display: "block",
          transition: "all .7s cubic-bezier(.5,.05,.2,1)",
        }}
      >
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
            <feColorMatrix values="0 0 0 0 0.48  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.05 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <linearGradient id="seaWash" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={C.paper} stopOpacity={0} />
            <stop offset="1" stopColor={C.seaWash} stopOpacity={C.seaWashOpacity} />
          </linearGradient>
        </defs>

        <rect x={780} y={40} width={200} height={700} fill="url(#seaWash)" />
        <rect x={0} y={0} width={1000} height={800} fill={C.paper} filter="url(#grain)" opacity={0.6} />

        {/* 編輯感的角落小記號 */}
        <g stroke={C.tan} strokeWidth={0.4} opacity={0.5}>
          <line x1={40} y1={40} x2={60} y2={40} />
          <line x1={40} y1={40} x2={40} y2={60} />
          <line x1={940} y1={40} x2={960} y2={40} />
          <line x1={960} y1={40} x2={960} y2={60} />
          <line x1={40} y1={740} x2={40} y2={760} />
          <line x1={40} y1={760} x2={60} y2={760} />
          <line x1={940} y1={740} x2={960} y2={760} />
          <line x1={960} y1={740} x2={960} y2={760} />
        </g>

        {/* 鄉鎮邊界 */}
        <g>
          {TOWNSHIPS.map((t) => {
            const dim = activeId && activeId !== t.id;
            const focused = activeId === t.id;
            const hover = hoverId === t.id && !activeId;
            let fill: string = C.paper;
            if (focused || hover) fill = C.cream;
            const stroke = focused || hover ? C.brown : C.tan;
            const strokeWidth = focused ? 1.6 : hover ? 1.4 : 0.9;
            return (
              <g
                key={t.id}
                opacity={dim ? 0.35 : 1}
                style={{ cursor: "pointer", transition: "opacity .35s ease" }}
                onMouseEnter={() => setHoverId(t.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setActiveId(activeId === t.id ? null : t.id)}
              >
                <path d={t.path} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  style={{ transition: "fill .35s ease, stroke .25s ease, stroke-width .25s ease" }}
                />
              </g>
            );
          })}
        </g>

        {/* 龜山島等 extras */}
        <g pointerEvents="none">
          {TOWNSHIPS.flatMap((t) => (t.extras || []).map((ex, i) => (
            <g key={t.id + "-ex-" + i}
              opacity={activeId && activeId !== t.id ? 0.3 : 1}
              style={{ transition: "opacity .35s ease" }}>
              <path d={ex.path} fill={C.cream} stroke={C.brown} strokeWidth={0.9} />
              {ex.label && ex.labelAt && (
                <text x={ex.labelAt[0]} y={ex.labelAt[1]} textAnchor="middle"
                  fontFamily={SERIF} fontSize={11} fill={C.inkSoft}
                  fontStyle="italic" letterSpacing="0.1em">
                  {ex.label}
                </text>
              )}
            </g>
          )))}
        </g>

        {/* 鄉鎮標籤 */}
        <g>
          {TOWNSHIPS.map((t) => {
            const dim = activeId && activeId !== t.id;
            const focused = activeId === t.id;
            return (
              <g key={t.id} pointerEvents="none" opacity={dim ? 0.25 : 1}
                style={{ transition: "opacity .35s ease" }}>
                <text x={t.labelAt[0]} y={t.labelAt[1]} textAnchor="middle"
                  fontFamily={SERIF}
                  fontSize={focused ? 19 : 15} fontWeight={500}
                  fill={focused ? C.brown : C.ink}
                  letterSpacing="0.06em"
                  style={{ transition: "font-size .25s ease, fill .25s ease" }}>
                  {t.name}
                </text>
                {!activeId && (
                  <text x={t.labelAt[0]} y={t.labelAt[1] + 16} textAnchor="middle"
                    fontFamily={MONO} fontSize={9.5}
                    fill={C.inkSoft} letterSpacing="0.18em">
                    {String(counts[t.id] || 0).padStart(2, "0")} · VIEWPOINTS
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 觀點 markers */}
        <g>
          {viewpoints.map((v) => {
            const visible = !activeId || v.township === activeId;
            if (!visible) return null;
            const focused = hoverV === v.id;
            const k = 1 / zoomScale;
            const r = activeId ? zoomSize : fullSize;
            const [x, y] = v.xy;
            return (
              <g key={v.id} style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/viewpoint/${v.id}`);
                }}
                onMouseEnter={() => setHoverV(v.id)}
                onMouseLeave={() => setHoverV(null)}
              >
                <circle cx={x} cy={y} r={(focused ? r * 1.5 : r) * k}
                  fill={C.paper} stroke={C.orange} strokeWidth={r * 0.23 * k} />
                <circle cx={x} cy={y} r={(focused ? r * 0.66 : r * 0.43) * k}
                  fill={C.orange} />
                {focused && (
                  <text x={x} y={y - r * 1.8 * k} textAnchor="middle"
                    fontFamily={SERIF} fontSize={12 * k}
                    fill={C.brown} fontWeight={500}
                    style={{ pointerEvents: "none" }}>
                    {v.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Compass + scale + place hints */}
        <g pointerEvents="none">
          <g transform="translate(110, 110)">
            <circle r={22} fill="none" stroke={C.tan} strokeWidth={0.8} />
            <line x1={0} y1={-22} x2={0} y2={22} stroke={C.tan} strokeWidth={0.6} />
            <line x1={-22} y1={0} x2={22} y2={0} stroke={C.tan} strokeWidth={0.6} />
            <polygon points="0,-26 -4,-10 0,-14 4,-10" fill={C.brown} />
            <text x={0} y={-32} textAnchor="middle" fontFamily={SERIF} fontSize={11}
              fill={C.brown} letterSpacing="0.2em">N</text>
          </g>
          <g transform="translate(80, 720)">
            <line x1={0} y1={0} x2={120} y2={0} stroke={C.brown} strokeWidth={1.2} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke={C.brown} strokeWidth={1.2} />
            <line x1={60} y1={-3} x2={60} y2={3} stroke={C.brown} strokeWidth={1} />
            <line x1={120} y1={-4} x2={120} y2={4} stroke={C.brown} strokeWidth={1.2} />
            <text x={0} y={20} fontFamily={MONO} fontSize={9} fill={C.inkSoft} letterSpacing="0.1em">0</text>
            <text x={60} y={20} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.inkSoft} letterSpacing="0.1em">5</text>
            <text x={120} y={20} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.inkSoft} letterSpacing="0.1em">10 KM</text>
          </g>
          <g opacity={0.55}>
            <text x={870} y={380} fontFamily={SERIF} fontStyle="italic"
              fontSize={14} fill={C.tan} letterSpacing="0.3em"
              transform="rotate(90 870 380)">太　平　洋</text>
          </g>
          <g opacity={0.55}>
            <text x={80} y={180} fontFamily={SERIF} fontStyle="italic"
              fontSize={12} fill={C.tan} letterSpacing="0.3em">雪　山　山　脈</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
