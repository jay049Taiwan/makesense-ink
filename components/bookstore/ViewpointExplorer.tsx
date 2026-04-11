"use client";

import { useState } from "react";
import Link from "next/link";

const regions = ["宜蘭縣", "宜蘭市", "羅東鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "蘇澳鎮", "三星鄉", "冬山鄉", "五結鄉", "大同鄉", "南澳鄉"];

// 鄉鎮 SVG 路徑 + 標籤位置 + 觀點座標（相對於 viewBox 0 0 400 480）
const townships: {
  name: string; path: string; cx: number; cy: number;
  viewpoints: { id: string; name: string; count: number; x: number; y: number }[];
}[] = [
  { name: "大同鄉", path: "M30,30 L150,20 L180,80 L160,150 L130,200 L80,220 L40,180 L20,120 Z", cx: 90, cy: 120,
    viewpoints: [
      { id: "v28", name: "太平山的林業歲月", count: 7, x: 80, y: 80 },
      { id: "v29", name: "泰雅族的山林智慧", count: 5, x: 120, y: 150 },
    ]},
  { name: "南澳鄉", path: "M40,220 L80,220 L130,200 L160,250 L170,320 L150,400 L100,450 L50,430 L30,350 L20,280 Z", cx: 90, cy: 330,
    viewpoints: [
      { id: "v30", name: "南澳古道與泰雅文化", count: 4, x: 100, y: 300 },
      { id: "v31", name: "朝陽漁港的日出", count: 2, x: 130, y: 380 },
    ]},
  { name: "頭城鎮", path: "M180,20 L250,30 L280,60 L290,120 L260,140 L220,130 L200,100 L180,80 Z", cx: 235, cy: 80,
    viewpoints: [
      { id: "v11", name: "搶孤文化與信仰傳承", count: 7, x: 220, y: 50 },
      { id: "v12", name: "蘭陽博物館建築美學", count: 5, x: 260, y: 90 },
      { id: "v13", name: "龜山島的傳說與生態", count: 8, x: 280, y: 40 },
      { id: "v14", name: "老街的百年商號", count: 4, x: 230, y: 110 },
    ]},
  { name: "礁溪鄉", path: "M160,80 L200,100 L220,130 L230,170 L200,190 L170,180 L150,150 Z", cx: 190, cy: 145,
    viewpoints: [
      { id: "v15", name: "溫泉文化與觀光發展", count: 10, x: 195, y: 130 },
      { id: "v16", name: "五峰旗瀑布步道", count: 3, x: 170, y: 165 },
    ]},
  { name: "員山鄉", path: "M130,150 L170,140 L170,180 L200,190 L190,230 L160,250 L130,240 L110,210 Z", cx: 155, cy: 200,
    viewpoints: [
      { id: "v18", name: "歌仔戲的故鄉", count: 6, x: 150, y: 185 },
      { id: "v19", name: "雙連埤的生態寶庫", count: 3, x: 140, y: 230 },
    ]},
  { name: "壯圍鄉", path: "M260,140 L310,130 L330,170 L320,220 L280,230 L250,210 L240,180 Z", cx: 285, cy: 180,
    viewpoints: [
      { id: "v17", name: "沙丘與海岸地景", count: 4, x: 300, y: 175 },
    ]},
  { name: "宜蘭市", path: "M200,190 L240,180 L260,210 L260,240 L230,260 L200,250 L190,230 Z", cx: 225, cy: 220,
    viewpoints: [
      { id: "v5", name: "舊城散步：日治時期建築巡禮", count: 6, x: 215, y: 210 },
      { id: "v6", name: "宜蘭河畔的文學風景", count: 4, x: 240, y: 235 },
      { id: "v7", name: "昭應宮與在地信仰", count: 3, x: 210, y: 245 },
    ]},
  { name: "五結鄉", path: "M260,240 L310,230 L340,260 L340,300 L300,310 L270,290 L260,260 Z", cx: 300, cy: 270,
    viewpoints: [
      { id: "v26", name: "傳統藝術中心", count: 6, x: 310, y: 260 },
      { id: "v27", name: "利澤簡走尪民俗", count: 4, x: 290, y: 290 },
    ]},
  { name: "三星鄉", path: "M110,240 L160,250 L170,290 L150,330 L110,340 L80,310 L80,270 Z", cx: 120, cy: 290,
    viewpoints: [
      { id: "v22", name: "蔥農的四季生活", count: 9, x: 125, y: 275 },
      { id: "v23", name: "銀柳的故鄉", count: 3, x: 110, y: 315 },
    ]},
  { name: "羅東鎮", path: "M200,250 L240,250 L260,270 L250,300 L220,310 L200,290 Z", cx: 225, cy: 280,
    viewpoints: [
      { id: "v8", name: "林場文化與木業記憶", count: 9, x: 215, y: 270 },
      { id: "v9", name: "羅東夜市的前世今生", count: 11, x: 240, y: 285 },
      { id: "v10", name: "中山公園的四季", count: 3, x: 220, y: 300 },
    ]},
  { name: "冬山鄉", path: "M150,290 L200,290 L220,310 L220,360 L190,380 L150,370 L130,340 Z", cx: 175, cy: 340,
    viewpoints: [
      { id: "v24", name: "冬山河的親水空間", count: 8, x: 185, y: 325 },
      { id: "v25", name: "梅花湖環湖散策", count: 4, x: 160, y: 360 },
    ]},
  { name: "蘇澳鎮", path: "M220,310 L280,310 L340,340 L350,400 L300,430 L240,420 L200,390 L190,380 L220,360 Z", cx: 270, cy: 370,
    viewpoints: [
      { id: "v20", name: "冷泉與南方澳漁港", count: 7, x: 290, y: 360 },
      { id: "v21", name: "蘇花公路的歷史", count: 5, x: 250, y: 400 },
    ]},
];

// 宜蘭縣（全部觀點）
const allViewpoints = townships.flatMap(t => t.viewpoints);

export default function ViewpointExplorer() {
  const [selected, setSelected] = useState("宜蘭縣");
  const [activePoint, setActivePoint] = useState<string | null>(null);

  const currentViewpoints = selected === "宜蘭縣"
    ? allViewpoints
    : townships.find(t => t.name === selected)?.viewpoints || [];

  return (
    <section className="py-6 pb-16">
      <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "#1a1612" }}>觀點漫遊</h2>
      <p className="text-[0.9em] mb-6" style={{ color: "#999" }}>從地圖出發，探索宜蘭的每個角落</p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        {/* 左欄：區域按鈕 */}
        <div className="hidden sm:flex flex-col gap-1.5">
          {regions.map((r) => (
            <button key={r} onClick={() => { setSelected(r); setActivePoint(null); }}
              className="px-3 py-2.5 text-left text-[0.85em] rounded-lg transition-all"
              style={{ background: selected === r ? "#7a5c40" : "#f7f7f7", color: selected === r ? "#fff" : "#555", border: selected === r ? "none" : "1px solid #eee", fontWeight: selected === r ? 700 : 400, cursor: "pointer" }}>
              {r}
            </button>
          ))}
        </div>

        {/* 手機版 */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
          {regions.map((r) => (
            <button key={r} onClick={() => { setSelected(r); setActivePoint(null); }}
              className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full"
              style={{ background: selected === r ? "#7a5c40" : "#f2ede6", color: selected === r ? "#fff" : "#7a5c40", border: "none", cursor: "pointer" }}>
              {r}
            </button>
          ))}
        </div>

        {/* 右欄：宜蘭地圖 + 觀點小點 */}
        <div className="relative rounded-xl overflow-hidden" style={{ background: "#f9f7f4", border: "1px solid #e0d8cc" }}
          onClick={() => setActivePoint(null)}>

          <svg viewBox={(() => {
            if (selected === "宜蘭縣") return "0 0 400 480";
            // 放大到選中鄉鎮的範圍
            const t = townships.find(t => t.name === selected);
            if (!t) return "0 0 400 480";
            // 解析 path 取得邊界
            const nums = t.path.match(/[\d.]+/g)?.map(Number) || [];
            let minX = 400, minY = 480, maxX = 0, maxY = 0;
            for (let i = 0; i < nums.length; i += 2) {
              if (nums[i] < minX) minX = nums[i];
              if (nums[i] > maxX) maxX = nums[i];
              if (nums[i+1] < minY) minY = nums[i+1];
              if (nums[i+1] > maxY) maxY = nums[i+1];
            }
            const pad = 30;
            return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
          })()} className="w-full transition-all duration-500" style={{ maxHeight: 520 }}>
            {/* 海洋 */}
            <rect width="400" height="480" fill="#f0f6fa" rx="8" />
            <text x="370" y="200" fill="#b8d4e3" fontSize="12" textAnchor="middle" opacity="0.6" transform="rotate(90, 370, 200)">太 平 洋</text>

            {/* 龜山島（固定右上角）*/}
            <g>
              <ellipse cx="340" cy="35" rx="18" ry="10" fill="#d4c5b0" stroke="#c8b8a0" strokeWidth="0.8" />
              <ellipse cx="335" cy="32" rx="5" ry="7" fill="#c4b59a" />
              <text x="340" y="52" fill="#a08060" fontSize="8" textAnchor="middle" style={{ fontFamily: "'Noto Sans TC'" }}>龜山島</text>
            </g>

            {/* 鄉鎮區塊 */}
            {townships.map((t) => {
              const isCounty = selected === "宜蘭縣";
              const isHighlighted = selected === t.name;
              // 非宜蘭縣時，只顯示選中的鄉鎮
              if (!isCounty && !isHighlighted) return null;
              return (
                <g key={t.name} style={{ cursor: isCounty ? "default" : "pointer" }}>
                  <path
                    d={t.path}
                    fill={isHighlighted ? "#c4a882" : "#e8e0d4"}
                    stroke={isHighlighted ? "#7a5c40" : "#c8b8a0"}
                    strokeWidth={isHighlighted ? 2.5 : 1}
                    className="transition-all duration-200"
                  />
                  <text x={t.cx} y={t.cy} fill={isHighlighted ? "#5a3c20" : "#8b7355"} fontSize={isHighlighted ? 14 : 10}
                    fontWeight={isHighlighted ? 700 : 400} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                    {t.name}
                  </text>
                </g>
              );
            })}

            {/* 觀點小點 */}
            {currentViewpoints.map((vp) => (
              <g key={vp.id} onClick={(e) => { e.stopPropagation(); setActivePoint(activePoint === vp.id ? null : vp.id); }} style={{ cursor: "pointer" }}>
                <circle cx={vp.x} cy={vp.y} r={activePoint === vp.id ? 8 : 5}
                  fill={activePoint === vp.id ? "#e53e3e" : "#7a5c40"}
                  stroke="#fff" strokeWidth={2}
                  className="transition-all duration-200" />
                {activePoint !== vp.id && (
                  <circle cx={vp.x} cy={vp.y} r={8} fill="#7a5c40" opacity="0.15">
                    <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            ))}
          </svg>

          {/* 區域資訊 */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
            <span className="text-sm font-bold" style={{ color: "#7a5c40" }}>{selected}</span>
            <span className="text-xs ml-2" style={{ color: "#999" }}>{currentViewpoints.length} 個觀點</span>
          </div>

          {/* 彈出卡片 */}
          {activePoint && (() => {
            const vp = currentViewpoints.find(v => v.id === activePoint);
            if (!vp) return null;
            const leftPct = (vp.x / 400) * 100;
            const topPct = (vp.y / 480) * 100;
            return (
              <div className="absolute z-30 rounded-lg shadow-xl p-3" onClick={(e) => e.stopPropagation()}
                style={{
                  width: 200, background: "#fff", border: "1px solid #e8e0d4",
                  left: leftPct > 55 ? `${leftPct - 55}%` : `${leftPct + 5}%`,
                  top: topPct > 60 ? `${topPct - 25}%` : `${topPct + 5}%`,
                }}>
                <span className="inline-block text-[0.65em] px-1.5 py-0.5 rounded-[3px] mb-1" style={{ background: "#E3F2FD", color: "#1565C0" }}>觀點</span>
                <h4 className="text-sm font-semibold mb-1 line-clamp-2" style={{ color: "#1a1612" }}>{vp.name}</h4>
                <p className="text-xs mb-2" style={{ color: "#999" }}>{vp.count} 篇相關內容</p>
                <Link href={`/viewpoint-stroll?keyword=${encodeURIComponent(vp.name)}`}
                  className="block text-center text-xs py-1.5 rounded-md hover:opacity-90"
                  style={{ background: "#7a5c40", color: "#fff", textDecoration: "none" }}>
                  探索此觀點 →
                </Link>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
