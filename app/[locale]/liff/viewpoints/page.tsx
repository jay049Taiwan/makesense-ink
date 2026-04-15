"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ViewpointItem {
  id: string;
  name: string;
  summary: string | null;
  slug: string;
  region: string[];
}

const TOWNSHIPS = [
  "宜蘭市", "羅東鎮", "頭城鎮", "礁溪鄉", "壯圍鄉",
  "員山鄉", "蘇澳鎮", "三星鄉", "冬山鄉", "五結鄉",
  "大同鄉", "南澳鄉",
];

export default function LiffViewpointsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [viewpoints, setViewpoints] = useState<ViewpointItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 請求定位
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("您的裝置不支援定位功能");
      return;
    }
    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Nominatim reverse geocoding — 用 zoom=12 取得鄉鎮級別
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=zh-TW&zoom=14`,
            { headers: { "User-Agent": "makesense-ink/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const display = data.display_name || "";

          // 優先用 Nominatim 的結構化地址欄位
          const townField = addr.town || addr.city_district || addr.suburb || addr.city || "";

          // 先嘗試精確匹配 address 結構化欄位
          let matched = TOWNSHIPS.find(t => townField.includes(t.replace(/[市鎮鄉]$/, "")));

          // 如果結構化欄位沒有，用 display_name 匹配
          // 但要排除「宜蘭縣」的干擾 — 先去掉「宜蘭縣」再匹配
          if (!matched) {
            const cleanAddr = display.replace(/宜蘭縣/g, "");
            // 先比長名稱（羅東鎮、頭城鎮），避免短的「宜蘭」先匹配
            const sorted = [...TOWNSHIPS].sort((a, b) => b.length - a.length);
            matched = sorted.find(t => {
              const core = t.replace(/[市鎮鄉]$/, "");
              return cleanAddr.includes(core);
            });
          }

          if (matched) {
            setSelected(matched);
          } else if (display.includes("宜蘭")) {
            // 在宜蘭但無法判斷鄉鎮，預設宜蘭市
            setSelected("宜蘭市");
          } else {
            setLocationError("您目前似乎不在宜蘭縣，請手動選擇鄉鎮");
          }
        } catch {
          setLocationError("定位查詢失敗，請手動選擇鄉鎮");
        }
        setLocating(false);
      },
      () => {
        setLocationError("無法取得定位，請手動選擇鄉鎮");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  // 載入觀點
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, notion_id, name, summary, region, status")
        .eq("status", "active")
        .contains("region", [selected.replace(/[市鎮鄉]$/, "")]);

      if (error) { console.error("Viewpoints err:", error); setLoading(false); return; }

      // 如果 contains 不精確，前端再過濾
      const items = (data || [])
        .filter(t => {
          const regions = Array.isArray(t.region) ? t.region : [];
          return regions.some((r: string) => r.includes(selected.replace(/[市鎮鄉]$/, "")));
        })
        .slice(0, 10)
        .map(t => ({
          id: t.notion_id || t.id,
          name: t.name,
          summary: t.summary,
          slug: t.notion_id || t.id,
          region: Array.isArray(t.region) ? t.region : [],
        }));

      setViewpoints(items);
      setLoading(false);
    })();
  }, [selected]);

  return (
    <div className="pb-4">
      {/* 標題 */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>觀點漫遊</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>探索宜蘭在地的文化觀點</p>
      </div>

      {/* 定位按鈕 */}
      {!selected && (
        <div className="px-4 mb-3">
          <button
            onClick={requestLocation}
            disabled={locating}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: "#4ECDC4", color: "#fff" }}
          >
            {locating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                定位中...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                使用目前位置
              </>
            )}
          </button>
          {locationError && (
            <p className="text-xs mt-2 text-center" style={{ color: "#e74c3c" }}>{locationError}</p>
          )}
        </div>
      )}

      {/* 鄉鎮選擇 */}
      <div className="px-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {TOWNSHIPS.map((t) => (
            <button
              key={t}
              onClick={() => setSelected(t)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={selected === t
                ? { background: "#7a5c40", color: "#fff" }
                : { background: "#fff", color: "#7a5c40", border: "1px solid #ece8e1" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 觀點列表 */}
      {selected && (
        <div className="px-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
            ))
          ) : viewpoints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "#999" }}>
                {selected} 目前還沒有觀點資料
              </p>
            </div>
          ) : (
            viewpoints.map((vp) => (
              <div key={vp.id}>
                <button
                  onClick={() => setExpandedId(expandedId === vp.id ? null : vp.id)}
                  className="w-full text-left rounded-xl p-4 transition-shadow"
                  style={{
                    background: "#fff",
                    border: expandedId === vp.id ? "2px solid #4ECDC4" : "1px solid #ece8e1",
                  }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: "#2d2a26" }}>{vp.name}</h3>
                  {vp.summary && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "#999" }}>{vp.summary}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {vp.region.slice(0, 3).map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#f0ebe4", color: "#7a5c40" }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </button>

                {/* 展開小視窗 */}
                {expandedId === vp.id && (
                  <div
                    className="mt-1 rounded-xl p-4"
                    style={{ background: "#fff", border: "2px solid #4ECDC4" }}
                  >
                    <p className="text-sm mb-3" style={{ color: "#2d2a26" }}>
                      {vp.summary || "探索這個觀點的更多內容"}
                    </p>
                    <a
                      href={`/viewpoint/${vp.slug}?liff_mode=true`}
                      className="inline-block px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: "#7a5c40", color: "#fff" }}
                    >
                      在官網查看更多
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
