// ════════════════════════════════════════════════════════
// 寒暑假日期表
// ════════════════════════════════════════════════════════
//
// 每年 12 月教育部公告隔年行事曆後，把新一年加進來就好。
// 格式：YYYY-MM-DD（含頭含尾，整段算寒/暑假）
//
// 沒有寫到的年份會 fallback 到下方 DEFAULT_RANGES。
//
// 參考來源：教育部國民及學前教育署「中小學行事曆」
//   https://www.k12ea.gov.tw
//
// ════════════════════════════════════════════════════════

interface YearBreaks {
  winter: { start: string; end: string }; // 寒假
  summer: { start: string; end: string }; // 暑假
}

export const SCHOOL_BREAKS: Record<number, YearBreaks> = {
  2026: {
    // 春節 2026/02/17 (二)
    winter: { start: "2026-01-21", end: "2026-02-15" },
    summer: { start: "2026-07-01", end: "2026-08-30" },
  },
  // 加新年份範例：
  // 2027: {
  //   winter: { start: "2027-01-21", end: "2027-02-14" },
  //   summer: { start: "2027-07-01", end: "2027-08-30" },
  // },
};

// 沒設定的年份用這個粗略範圍
const DEFAULT_RANGES: YearBreaks = {
  winter: { start: "01-20", end: "02-13" },
  summer: { start: "07-01", end: "08-31" },
};

// ────────────────────────────────────────────────────────

/**
 * 判斷某天是不是寒假/暑假
 * @param year  西元年（4 位數）
 * @param month 月份（0-indexed，跟 JS Date 一樣）
 * @param day   日（1-31）
 */
export function getSchoolBreak(year: number, month: number, day: number): "winter" | "summer" | null {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const cfg = SCHOOL_BREAKS[year];

  if (cfg) {
    if (dateStr >= cfg.winter.start && dateStr <= cfg.winter.end) return "winter";
    if (dateStr >= cfg.summer.start && dateStr <= cfg.summer.end) return "summer";
    return null;
  }

  // Fallback：沒設定的年份用粗略月日範圍
  const md = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (md >= DEFAULT_RANGES.winter.start && md <= DEFAULT_RANGES.winter.end) return "winter";
  if (md >= DEFAULT_RANGES.summer.start && md <= DEFAULT_RANGES.summer.end) return "summer";
  return null;
}
