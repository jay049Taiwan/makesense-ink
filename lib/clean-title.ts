// 清掉 Noah 在 Notion 標題後面加的 🖤 等裝飾符
// 同時去掉前後空白
//
// 涵蓋常見「裝飾性」結尾 emoji：愛心系列、星星、火焰、花朵等
const TRAILING_DECO_RE = /[\s\u{1F90D}\u{1F90E}\u{1F49A}-\u{1F49D}\u{1FA75}-\u{1FA77}\u{2764}\u{1F5A4}\u{1F90F}\u{1F4AB}\u{2B50}\u{1F31F}\u{1F525}\u{1F33F}\u{1F338}\u{1F490}\u{2728}]+$/u;

export function cleanTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title.replace(TRAILING_DECO_RE, "").trim();
}
