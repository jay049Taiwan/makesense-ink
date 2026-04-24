"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

// 宜蘭縣大致 bbox
const YILAN_BOUNDS: [[number, number], [number, number]] = [
  [121.30, 24.30], // SW
  [122.00, 25.00], // NE
];

// 計算 GeoJSON Feature 的 bbox（Polygon / MultiPolygon）
function bboxOfFeature(f: any): [[number, number], [number, number]] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c: any): void => {
    if (typeof c[0] === "number") {
      const [x, y] = c;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    } else {
      c.forEach(walk);
    }
  };
  walk(f.geometry.coordinates);
  return [[minX, minY], [maxX, maxY]];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function ViewpointExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [selected, setSelected] = useState<string>("宜蘭縣");
  const [activeVp, setActiveVp] = useState<Viewpoint | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 載資料
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

  // 計算各鄉鎮觀點數
  const countByTown = useMemo(() => {
    const m = new Map<string, number>();
    m.set("宜蘭縣", viewpoints.length);
    TOWNSHIP_ORDER.forEach(t => m.set(t, 0));
    viewpoints.forEach(vp => {
      (vp.region || []).forEach(r => {
        if (m.has(r)) m.set(r, m.get(r)! + 1);
      });
    });
    return m;
  }, [viewpoints]);

  // 觀點對應鄉鎮 centroid（用 GeoJSON 計算）
  const vpPositions = useMemo(() => {
    if (!geo) return new Map<string, [number, number]>();
    const centroids = new Map<string, [number, number]>();
    geo.features.forEach(f => {
      // 簡易 centroid：bbox 中心
      const [[minX, minY], [maxX, maxY]] = bboxOfFeature(f);
      centroids.set(f.properties.TOWNNAME, [(minX + maxX) / 2, (minY + maxY) / 2]);
    });

    const buckets = new Map<string, Viewpoint[]>();
    viewpoints.forEach(vp => {
      const town = (vp.region || []).find(r => centroids.has(r)) || "";
      if (!town) return;
      if (!buckets.has(town)) buckets.set(town, []);
      buckets.get(town)!.push(vp);
    });

    const result = new Map<string, [number, number]>();
    buckets.forEach((vps, town) => {
      const center = centroids.get(town);
      if (!center) return;
      vps.forEach((vp, i) => {
        if (vps.length === 1) {
          result.set(vp.id, center);
        } else {
          // 環形偏移（單位：度，約 0.005° ≈ 500m）
          const angle = (i / vps.length) * Math.PI * 2 - Math.PI / 2;
          const r = 0.008;
          result.set(vp.id, [center[0] + Math.cos(angle) * r, center[1] + Math.sin(angle) * r]);
        }
      });
    });
    return result;
  }, [geo, viewpoints]);

  // 初始化 Mapbox
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || !geo) return;
    if (mapRef.current) return; // already init

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      bounds: YILAN_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // 加鄉鎮多邊形 layer
      map.addSource("yilan-towns", { type: "geojson", data: geo as any });
      map.addLayer({
        id: "town-fill",
        type: "fill",
        source: "yilan-towns",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "TOWNNAME"], ["literal", selected]], "#c4a882",
            "#e8dcc4",
          ],
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "town-line",
        type: "line",
        source: "yilan-towns",
        paint: {
          "line-color": "#7a5c40",
          "line-width": [
            "case",
            ["==", ["get", "TOWNNAME"], ["literal", selected]], 3,
            1.2,
          ],
        },
      });
      map.addLayer({
        id: "town-label",
        type: "symbol",
        source: "yilan-towns",
        layout: {
          "text-field": ["get", "TOWNNAME"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 12,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#5a3c20",
          "text-halo-color": "#faf8f4",
          "text-halo-width": 1.5,
        },
      });

      // 點鄉鎮 → 觸發 select
      map.on("click", "town-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = (f.properties as any)?.TOWNNAME;
        if (name) setSelected(name);
      });
      map.on("mouseenter", "town-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "town-fill", () => { map.getCanvas().style.cursor = ""; });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geo]);

  // 選擇變化時 → fitBounds + 更新 highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !geo) return;

    if (selected === "宜蘭縣") {
      map.fitBounds(YILAN_BOUNDS, { padding: 40, duration: 1200 });
    } else {
      const f = geo.features.find(x => x.properties.TOWNNAME === selected);
      if (f) {
        map.fitBounds(bboxOfFeature(f), { padding: 60, duration: 1200 });
      }
    }

    // 更新 highlight 樣式
    if (map.getLayer("town-fill")) {
      map.setPaintProperty("town-fill", "fill-color", [
        "case",
        ["==", ["get", "TOWNNAME"], ["literal", selected]], "#c4a882",
        "#e8dcc4",
      ] as any);
      map.setPaintProperty("town-line", "line-width", [
        "case",
        ["==", ["get", "TOWNNAME"], ["literal", selected]], 3,
        1.2,
      ] as any);
    }
  }, [selected, mapReady, geo]);

  // 觀點 markers
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // 清掉舊的
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const visibleVps = selected === "宜蘭縣"
      ? viewpoints
      : viewpoints.filter(vp => (vp.region || []).includes(selected));

    visibleVps.forEach(vp => {
      const pos = vpPositions.get(vp.id);
      if (!pos) return;

      const el = document.createElement("div");
      el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#e8935a;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;";
      el.onclick = (e) => {
        e.stopPropagation();
        setActiveVp(vp);
      };

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(pos)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [viewpoints, vpPositions, mapReady, selected]);

  // Token 缺失 fallback
  if (!MAPBOX_TOKEN) {
    return (
      <section className="py-6 pb-16">
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
        <div className="rounded-xl p-8 text-center" style={{ background: "#faf8f4", border: "1px solid #e0d8cc" }}>
          <p className="text-sm" style={{ color: "#999" }}>地圖載入中…（請設定 NEXT_PUBLIC_MAPBOX_TOKEN）</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        {/* 左欄 */}
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

        {/* 地圖容器 */}
        <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid #e0d8cc" }}>
          <div ref={containerRef} style={{ width: "100%", height: 560 }} onClick={() => setActiveVp(null)} />

          {/* 區域資訊 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg z-10 pointer-events-none" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
            <span className="text-sm font-bold" style={{ color: "#7a5c40" }}>{selected}</span>
            <span className="text-xs ml-2" style={{ color: "#999" }}>{countByTown.get(selected) ?? 0} 個觀點</span>
          </div>

          {/* 浮動彈出卡片 */}
          {activeVp && (
            <div className="absolute z-30 rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 280,
                background: "#fff",
                border: "1px solid #e8e0d4",
                left: 16,
                bottom: 16,
              }}>
              <div className="aspect-[16/10] overflow-hidden" style={{ background: "#f2ede6" }}>
                <SafeImage src={activeVp.cover_url} alt={activeVp.name} placeholderType="topic" />
              </div>
              <div className="p-3">
                <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: "#E3F2FD", color: "#1565C0" }}>觀點</span>
                <h4 className="text-sm font-semibold mb-1.5 leading-snug" style={{ color: "#1a1612" }}>
                  {activeVp.name}
                </h4>
                {activeVp.summary && (
                  <p className="text-[0.75em] leading-relaxed line-clamp-5 mb-3" style={{ color: "#666" }}>
                    {activeVp.summary.slice(0, 300)}
                    {activeVp.summary.length > 300 && "…"}
                  </p>
                )}
                <Link href={`/viewpoint/${activeVp.notion_id || activeVp.id}`}
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
