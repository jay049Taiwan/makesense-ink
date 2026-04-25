// /sense 下半部的靜態資料：時間軸事件、階段、核心能力、自訂指標
// Supabase 撈不到的（如媒體露出、現場觸及）寫死在這，要改數字直接改這個檔案

export type EventType = "milestone" | "award" | "event";
export type PhaseId = "seed" | "founding" | "expansion" | "now";

export interface TimelineEvent {
  date: string;
  title: string;
  type: EventType;
  phase: PhaseId;
  note?: string;
}

export interface Phase {
  id: PhaseId;
  label: string;
  sub: string;
  range: string;
  desc: string;
}

export interface CapabilityItem {
  name: string;
  weight: number;
  note?: string;
}

export interface CapabilityGroup {
  id: string;
  label: string;
  sub: string;
  desc: string;
  items: CapabilityItem[];
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { date: "2012-06", title: "於宜蘭開啟文化走讀實驗", type: "event", phase: "seed", note: "還不是一間公司，只是一群人週末帶朋友走街。" },
  { date: "2013-04", title: "「現思文化」名稱正式定調", type: "milestone", phase: "seed", note: "以「把文化從博物館搬到街上」為起點。" },
  { date: "2013-11", title: "第一份宜蘭老街踏查紀錄成冊", type: "event", phase: "seed" },
  { date: "2014-03", title: "現思文化創藝術正式登記成立", type: "milestone", phase: "founding", note: "從民間社群轉為正式組織。" },
  { date: "2014-08", title: "首場公開走讀：宜蘭河沿岸", type: "event", phase: "founding" },
  { date: "2015-05", title: "承接第一個駐地策展案", type: "event", phase: "founding" },
  { date: "2016-04", title: "進駐舊宜蘭監獄門廳", type: "milestone", phase: "founding", note: "第一個被我們重新打開的歷史空間。" },
  { date: "2016-11", title: "「宜蘭小日子」年度計畫啟動", type: "event", phase: "founding" },
  { date: "2017-09", title: "青創爸媽陪伴計畫 v1", type: "milestone", phase: "founding", note: "從 3 組家庭開始的創業陪伴。" },
  { date: "2018-03", title: "成立旅人書店", type: "milestone", phase: "founding", note: "自營空間，作為所有計畫的基地。" },
  { date: "2018-07", title: "文化部青年村落文化行動獲選", type: "award", phase: "founding" },
  { date: "2019-02", title: "與在地職人共同開發走讀地圖", type: "event", phase: "founding" },
  { date: "2020-05", title: "疫情期間轉型線上文化內容", type: "milestone", phase: "expansion", note: "危機變成重新定義服務方式的機會。" },
  { date: "2021-06", title: "宜蘭文化俱樂部 Beta", type: "milestone", phase: "expansion", note: "從單次活動，走向會員制的長期關係。" },
  { date: "2022-04", title: "活化羅東文化街 55 號", type: "milestone", phase: "expansion", note: "整條街區的重新編輯。" },
  { date: "2022-10", title: "青創爸媽擴大至 12 組", type: "event", phase: "expansion" },
  { date: "2023-03", title: "首次策劃跨縣市文化交流", type: "event", phase: "expansion" },
  { date: "2023-08", title: "空間活化第 5 處落成", type: "milestone", phase: "expansion" },
  { date: "2024-05", title: "獲地方創生國家隊提名", type: "award", phase: "expansion" },
  { date: "2024-11", title: "「旅人書店 × 宜蘭文化」品牌整合", type: "milestone", phase: "expansion" },
  { date: "2025-07", title: "青創爸媽累計 21 組", type: "milestone", phase: "expansion", note: "超越成立初期設定的十年目標。" },
  { date: "2026-03", title: "makesense.ink 官網改版上線", type: "milestone", phase: "now", note: "十二年一次的自我盤點，也是下一個十年的起點。" },
];

export const PHASES: Phase[] = [
  { id: "seed", label: "醞釀期", sub: "Seeding", range: "2012 – 2013", desc: "從一群人的想法開始，把對宜蘭文化的關懷先養在心裡。" },
  { id: "founding", label: "萌芽期", sub: "Founding", range: "2014 – 2019", desc: "正式登記成立，定錨文化現場，累積第一批走讀、策展與在地合作。" },
  { id: "expansion", label: "擴張期", sub: "Expansion", range: "2020 – 2025", desc: "自有空間 + 青創陪伴，從單點走向系統，把能力慢慢長出來。" },
  { id: "now", label: "深耕期", sub: "Deepening", range: "2026 – ", desc: "以整條街區為尺度，把十年累積的能力交還給在地。" },
];

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    id: "space",
    label: "空間營造",
    sub: "Space-making",
    desc: "從一扇門到一條街，讓被遺忘的地方再次被使用。",
    items: [
      { name: "歷史空間再利用", weight: 0.92, note: "7 處歷史空間轉譯。" },
      { name: "街區尺度規劃", weight: 0.78, note: "羅東文化街全街計畫。" },
      { name: "場域策展", weight: 0.85 },
    ],
  },
  {
    id: "community",
    label: "社群連結",
    sub: "Community",
    desc: "不是把人聚起來就好，是讓人彼此需要。",
    items: [
      { name: "青創陪伴", weight: 0.95, note: "21 組爸媽從 0 到 1。" },
      { name: "會員制經營", weight: 0.7, note: "宜蘭文化俱樂部。" },
      { name: "跨單位協作", weight: 0.88, note: "公部門 / 職人 / 學校。" },
    ],
  },
  {
    id: "content",
    label: "內容企劃",
    sub: "Content",
    desc: "文化不是議題，是可以走進去的內容。",
    items: [
      { name: "走讀與導覽設計", weight: 0.9 },
      { name: "出版與紀錄", weight: 0.72 },
      { name: "文化品牌識別", weight: 0.8, note: "從旅人書店到宜蘭文化俱樂部。" },
    ],
  },
];

// 自訂指標（Supabase 不直接撈得到的）— 要改數字直接改這
export const CUSTOM_METRICS = {
  creators: 21,
  spaces: 7,
  reach: 12400,
  press: 34,
  // 預設值（Supabase 撈到 0 時的 fallback）
  defaultEvents: 28,
  defaultPartners: 78,
};

export const EVENT_BREAKDOWN = [
  { k: "走讀", v: 9 },
  { k: "講座", v: 7 },
  { k: "市集", v: 6 },
  { k: "工作坊", v: 6 },
];
