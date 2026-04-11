"use client";

/**
 * 宜蘭縣互動地圖 — 簡化版 SVG
 * 每個鄉鎮是一個可點擊的區域
 */

interface YilanMapProps {
  selected: string;
  onSelect: (region: string) => void;
}

// 宜蘭縣 12 鄉鎮 + 縣的簡化 SVG paths
// 座標系統：viewBox "0 0 400 500"
const townships: { name: string; path: string; labelX: number; labelY: number }[] = [
  {
    name: "大同鄉",
    path: "M30,30 L150,20 L180,80 L160,150 L130,200 L80,220 L40,180 L20,120 Z",
    labelX: 90, labelY: 120,
  },
  {
    name: "南澳鄉",
    path: "M40,220 L80,220 L130,200 L160,250 L170,320 L150,400 L100,450 L50,430 L30,350 L20,280 Z",
    labelX: 90, labelY: 330,
  },
  {
    name: "頭城鎮",
    path: "M180,20 L250,30 L280,60 L290,120 L260,140 L220,130 L200,100 L180,80 Z",
    labelX: 235, labelY: 80,
  },
  {
    name: "礁溪鄉",
    path: "M160,80 L200,100 L220,130 L230,170 L200,190 L170,180 L150,150 Z",
    labelX: 185, labelY: 150,
  },
  {
    name: "員山鄉",
    path: "M130,150 L170,140 L170,180 L200,190 L190,230 L160,250 L130,240 L110,210 Z",
    labelX: 155, labelY: 200,
  },
  {
    name: "壯圍鄉",
    path: "M260,140 L310,130 L330,170 L320,220 L280,230 L250,210 L240,180 Z",
    labelX: 285, labelY: 180,
  },
  {
    name: "宜蘭市",
    path: "M200,190 L240,180 L260,210 L260,240 L230,260 L200,250 L190,230 Z",
    labelX: 225, labelY: 225,
  },
  {
    name: "五結鄉",
    path: "M260,240 L310,230 L340,260 L340,300 L300,310 L270,290 L260,260 Z",
    labelX: 300, labelY: 270,
  },
  {
    name: "三星鄉",
    path: "M110,240 L160,250 L170,290 L150,330 L110,340 L80,310 L80,270 Z",
    labelX: 120, labelY: 290,
  },
  {
    name: "羅東鎮",
    path: "M200,250 L240,250 L260,270 L250,300 L220,310 L200,290 Z",
    labelX: 225, labelY: 280,
  },
  {
    name: "冬山鄉",
    path: "M150,290 L200,290 L220,310 L220,360 L190,380 L150,370 L130,340 Z",
    labelX: 175, labelY: 340,
  },
  {
    name: "蘇澳鎮",
    path: "M220,310 L280,310 L340,340 L350,400 L300,430 L240,420 L200,390 L190,380 L220,360 Z",
    labelX: 270, labelY: 370,
  },
];

export default function YilanMap({ selected, onSelect }: YilanMapProps) {
  return (
    <svg viewBox="0 0 400 480" className="w-full h-full" style={{ maxHeight: 500 }}>
      {/* 背景 */}
      <rect width="400" height="480" fill="#f9f7f4" rx="8" />

      {/* 海洋標示 */}
      <text x="360" y="200" fill="#cde" fontSize="11" textAnchor="middle" opacity="0.5" transform="rotate(90, 360, 200)">太 平 洋</text>

      {/* 鄉鎮區域 */}
      {townships.map((t) => {
        const isSelected = selected === t.name;
        const isCounty = selected === "宜蘭縣";
        return (
          <g key={t.name} onClick={() => onSelect(t.name)} style={{ cursor: "pointer" }}>
            <path
              d={t.path}
              fill={isSelected ? "#7a5c40" : isCounty ? "#e8e0d4" : "#f0ebe3"}
              stroke={isSelected ? "#5a3c20" : "#c8b8a0"}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isSelected ? 1 : isCounty ? 0.9 : 0.7}
              className="transition-all duration-200"
              onMouseEnter={(e) => { if (!isSelected) (e.target as SVGPathElement).setAttribute("fill", "#d4c5b0"); }}
              onMouseLeave={(e) => { if (!isSelected) (e.target as SVGPathElement).setAttribute("fill", isCounty ? "#e8e0d4" : "#f0ebe3"); }}
            />
            <text
              x={t.labelX}
              y={t.labelY}
              fill={isSelected ? "#fff" : "#7a5c40"}
              fontSize={isSelected ? 13 : 11}
              fontWeight={isSelected ? 700 : 400}
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
              style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* 宜蘭縣全選按鈕 */}
      <g onClick={() => onSelect("宜蘭縣")} style={{ cursor: "pointer" }}>
        <rect x="10" y="450" width="80" height="24" rx="12" fill={selected === "宜蘭縣" ? "#7a5c40" : "#e8e0d4"} />
        <text x="50" y="463" fill={selected === "宜蘭縣" ? "#fff" : "#7a5c40"} fontSize="11" fontWeight="600" textAnchor="middle" pointerEvents="none">
          全宜蘭縣
        </text>
      </g>
    </svg>
  );
}
