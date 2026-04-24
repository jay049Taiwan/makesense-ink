"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
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

// 免費公用地圖 tile 服務
const MAP_LAYERS: { id: string; name: string; url: string; attribution: string; minZoom: number; maxZoom: number }[] = [
  {
    id: "watercolor",
    name: "水彩畫風（Stamen Watercolor）",
    url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    attribution: "© Stadia Maps © Stamen Design © OpenStreetMap",
    minZoom: 2, maxZoom: 16,
  },
  {
    id: "toner-lite",
    name: "素描黑白（Stamen Toner Lite）",
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png",
    attribution: "© Stadia Maps © Stamen Design © OpenStreetMap",
    minZoom: 2, maxZoom: 18,
  },
  {
    id: "positron",
    name: "極簡淡彩（Carto Positron）",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap © Carto",
    minZoom: 2, maxZoom: 19,
  },
  {
    id: "voyager",
    name: "現代彩色（Carto Voyager）",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap © Carto",
    minZoom: 2, maxZoom: 19,
  },
  {
    id: "topo",
    name: "戶外地形（OpenTopoMap）",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap © OpenStreetMap SRTM",
    minZoom: 2, maxZoom: 17,
  },
  {
    id: "satellite",
    name: "衛星影像（Esri）",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    minZoom: 2, maxZoom: 19,
  },
  {
    id: "osm",
    name: "標準（OpenStreetMap）",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap 貢獻者",
    minZoom: 2, maxZoom: 19,
  },
];

// 宜蘭縣範圍
const YILAN_BOUNDS: [[number, number], [number, number]] = [
  [24.30, 121.42], // SW
  [24.98, 121.96], // NE
];

export default function ViewpointExplorer() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const townshipLayerRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);

  const [geo, setGeo] = useState<GeoData | null>(null);
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [selected, setSelected] = useState<string>("宜蘭縣");
  const [activeVp, setActiveVp] = useState<string | null>(null);
  const [layerId, setLayerId] = useState<string>("watercolor");
  const [mapReady, setMapReady] = useState(false);

  // 載入資料
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

  // 初始化 Leaflet 地圖（動態載入，避免 SSR 問題）
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapDivRef.current!, {
        center: [24.66, 121.72],
        zoom: 10,
        minZoom: 9,
        maxZoom: 15,
        maxBounds: [
          [24.10, 121.20],
          [25.15, 122.20],
        ],
        maxBoundsViscosity: 0.8,
        zoomControl: true,
        attributionControl: true,
      });

      map.fitBounds(YILAN_BOUNDS as any, { padding: [10, 10] });

      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 切換底圖 layer
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      const layer = MAP_LAYERS.find(l => l.id === layerId) || MAP_LAYERS[0];
      const tl = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        tileSize: 256,
        crossOrigin: true,
        subdomains: layer.url.includes("{s}") ? ["a", "b", "c", "d"] : undefined,
      } as any);
      tl.addTo(mapRef.current);
      tileLayerRef.current = tl;
    })();
  }, [mapReady, layerId]);

  // 繪鄉鎮邊界
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geo) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (townshipLayerRef.current) {
        mapRef.current.removeLayer(townshipLayerRef.current);
      }
      const group = L.layerGroup();
      geo.features.forEach(f => {
        const name = f.properties.TOWNNAME;
        const active = selected === name;
        const dim = selected !== "宜蘭縣" && !active;
        const poly = L.geoJSON(f as any, {
          style: {
            color: active ? "#5a3c20" : "#7a5c40",
            weight: active ? 3 : 1.2,
            fill: true,
            fillColor: active ? "#b83a2e" : "#7a5c40",
            fillOpacity: active ? 0.12 : dim ? 0.05 : 0.08,
          },
        });
        poly.on("click", (e: any) => {
          setSelected(name);
          setActiveVp(null);
          L.DomEvent.stopPropagation(e);
        });
        poly.on("mouseover", () => {
          poly.setStyle({ fillOpacity: 0.18 });
        });
        poly.on("mouseout", () => {
          poly.setStyle({ fillOpacity: active ? 0.12 : dim ? 0.05 : 0.08 });
        });
        poly.addTo(group);
      });
      group.addTo(mapRef.current);
      townshipLayerRef.current = group;
    })();
  }, [mapReady, geo, selected]);

  // 選中鄉鎮就 fitBounds
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geo) return;
    if (selected === "宜蘭縣") {
      mapRef.current.fitBounds(YILAN_BOUNDS as any, { padding: [10, 10] });
      return;
    }
    const f = geo.features.find(f => f.properties.TOWNNAME === selected);
    if (!f) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const layer = L.geoJSON(f as any);
      mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 13 });
    })();
  }, [mapReady, geo, selected]);

  // 觀點依 region 分配鄉鎮 + 計算數量
  const vpsByTown = useMemo(() => {
    const m = new Map<string, Viewpoint[]>();
    viewpoints.forEach(vp => {
      const regions = Array.isArray(vp.region) ? vp.region : [];
      const town = regions.find(r => TOWNSHIP_ORDER.includes(r)) || "未分類";
      if (!m.has(town)) m.set(town, []);
      m.get(town)!.push(vp);
    });
    return m;
  }, [viewpoints]);

  const countByTown = useMemo(() => {
    const m = new Map<string, number>();
    m.set("宜蘭縣", viewpoints.length);
    TOWNSHIP_ORDER.forEach(t => m.set(t, 0));
    vpsByTown.forEach((vps, town) => m.set(town, vps.length));
    return m;
  }, [viewpoints, vpsByTown]);

  // 繪觀點標籤（金子常光直立白框）
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geo) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (markerLayerRef.current) {
        mapRef.current.removeLayer(markerLayerRef.current);
      }
      const group = L.layerGroup();
      // 取每個鄉鎮 centroid（用 bbox 中心近似）
      const centroids = new Map<string, [number, number]>();
      geo.features.forEach(f => {
        const layer = L.geoJSON(f as any);
        const b = layer.getBounds();
        centroids.set(f.properties.TOWNNAME, [b.getCenter().lat, b.getCenter().lng]);
      });

      const visibleTowns = selected === "宜蘭縣" ? TOWNSHIP_ORDER : [selected];
      visibleTowns.forEach(town => {
        const vps = vpsByTown.get(town) || [];
        const center = centroids.get(town);
        if (!center || vps.length === 0) return;
        vps.forEach((vp, i) => {
          // 同鄉鎮多觀點水平錯開
          const offset = vps.length > 1 ? (i - (vps.length - 1) / 2) * 0.01 : 0;
          const lat = center[0] + (i % 2 === 0 ? 0 : 0.003);
          const lng = center[1] + offset;

          const fullName = vp.name || "";
          const maxChars = 7;
          const displayName = fullName.length > maxChars ? fullName.slice(0, maxChars - 1) + "…" : fullName;
          const chars = [...displayName].map(c => `<span>${c}</span>`).join("");
          const isActive = activeVp === vp.id;

          const html = `
            <div class="mk-pin${isActive ? " mk-pin-active" : ""}" data-vp="${vp.id}">
              <div class="mk-pin-frame">
                <div class="mk-pin-cap"></div>
                <div class="mk-pin-text">${chars}</div>
              </div>
              <div class="mk-pin-pole"></div>
              <div class="mk-pin-dot"></div>
            </div>
          `;

          const pinHeight = chars.length > 0 ? displayName.length * 12 + 20 : 30;
          const icon = L.divIcon({
            className: "mk-pin-wrap",
            html,
            iconSize: [18, pinHeight],
            iconAnchor: [9, pinHeight],
          });
          const marker = L.marker([lat, lng], { icon });
          marker.on("click", () => {
            setActiveVp(isActive ? null : vp.id);
          });
          marker.addTo(group);
        });
      });
      group.addTo(mapRef.current);
      markerLayerRef.current = group;
    })();
  }, [mapReady, geo, selected, vpsByTown, activeVp]);

  const activeVpData = activeVp ? viewpoints.find(v => v.id === activeVp) : null;

  return (
    <section className="py-6 pb-16">
      <style jsx global>{`
        .mk-pin-wrap { background: transparent !important; border: none !important; }
        .mk-pin { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .mk-pin-frame {
          background: #fffbf0;
          border: 1.5px solid #5a3c20;
          box-shadow: 1px 2px 3px rgba(80,60,30,0.35);
          padding: 0;
          min-width: 18px;
          overflow: hidden;
          border-radius: 1px;
        }
        .mk-pin-cap {
          height: 4px;
          background: #b83a2e;
        }
        .mk-pin-text {
          padding: 4px 2px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Noto Serif TC', serif;
          font-size: 12px;
          line-height: 1.1;
          color: #2a1a08;
          font-weight: 600;
        }
        .mk-pin-text span { display: block; }
        .mk-pin-pole {
          width: 1.5px;
          height: 6px;
          background: #5a3c20;
        }
        .mk-pin-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #b83a2e;
          border: 1.5px solid #fff8e8;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          margin-top: -4px;
        }
        .mk-pin-active .mk-pin-frame { border-color: #b83a2e; border-width: 2px; }
        .mk-pin-active .mk-pin-dot { transform: scale(1.3); }
        .leaflet-container { font-family: 'Noto Sans TC', sans-serif; }
      `}</style>

      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612", fontFamily: "'Noto Serif TC', serif" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落（右上可切換地圖風格）</p>

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
            border: "2px solid #b89b6e",
            boxShadow: "inset 0 0 40px rgba(139,115,85,0.18)",
          }}>
          {/* Leaflet 容器 */}
          <div ref={mapDivRef} style={{ height: 560, width: "100%", background: "#f4ead5" }} />

          {/* 左上角區域徽章 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded flex items-center gap-2 z-[400]"
            style={{
              background: "rgba(255,251,242,0.92)",
              border: "1px solid #b89b6e",
              backdropFilter: "blur(2px)",
              fontFamily: "'Noto Serif TC', serif",
            }}>
            <span className="text-sm font-bold" style={{ color: "#5a3c20" }}>{selected}</span>
            <span className="text-xs" style={{ color: "#8a7a5a" }}>{countByTown.get(selected) ?? 0} 個觀點</span>
            {selected !== "宜蘭縣" && (
              <button onClick={() => { setSelected("宜蘭縣"); setActiveVp(null); }}
                className="ml-1 text-xs px-2 py-0.5 rounded"
                style={{ background: "#5a3c20", color: "#fffbf0", border: "none", cursor: "pointer" }}>
                ← 回全縣
              </button>
            )}
          </div>

          {/* 底圖切換（右上） */}
          <div className="absolute top-3 right-3 z-[400]"
            style={{
              background: "rgba(255,251,242,0.92)",
              border: "1px solid #b89b6e",
              borderRadius: 6,
              padding: "4px 8px",
              fontFamily: "'Noto Serif TC', serif",
            }}>
            <select value={layerId} onChange={(e) => setLayerId(e.target.value)}
              style={{
                background: "transparent", border: "none", color: "#5a3c20",
                fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
                fontFamily: "'Noto Serif TC', serif",
              }}>
              {MAP_LAYERS.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* 觀點卡 */}
          {activeVpData && (
            <div className="absolute bottom-4 left-1/2 z-[500] rounded-xl shadow-xl overflow-hidden"
              style={{
                width: 300,
                background: "#fffbf0",
                border: "2px solid #b89b6e",
                transform: "translateX(-50%)",
              }}
              onClick={(e) => e.stopPropagation()}>
              <div className="aspect-[16/9] overflow-hidden" style={{ background: "#f2ede6" }}>
                <SafeImage src={activeVpData.cover_url} alt={activeVpData.name} placeholderType="topic" />
              </div>
              <div className="p-3 relative">
                <button onClick={() => setActiveVp(null)}
                  className="absolute top-1 right-2 text-sm"
                  style={{ color: "#8a7a5a", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] mb-1"
                  style={{ background: "#b83a2e", color: "#fff" }}>觀點</span>
                <h4 className="text-sm font-semibold mb-1.5 leading-snug"
                  style={{ color: "#5a3c20", fontFamily: "'Noto Serif TC', serif" }}>
                  {activeVpData.name}
                </h4>
                {activeVpData.summary && (
                  <p className="text-[0.75em] leading-relaxed line-clamp-4 mb-3" style={{ color: "#6b5a40" }}>
                    {activeVpData.summary.slice(0, 180)}
                    {activeVpData.summary.length > 180 && "…"}
                  </p>
                )}
                <Link href={`/viewpoint/${activeVpData.notion_id || activeVpData.id}`}
                  className="block text-center text-xs py-2 rounded-md font-medium"
                  style={{ background: "#5a3c20", color: "#fffbf0", textDecoration: "none" }}>
                  看更多 →
                </Link>
              </div>
            </div>
          )}

          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center text-sm pointer-events-none"
              style={{ color: "#8a7a5a", background: "#f4ead5" }}>
              捲軸展開中…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
