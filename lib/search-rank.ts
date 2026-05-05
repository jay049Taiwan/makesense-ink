/**
 * 搜尋結果相關性排序
 *
 * 給定 query，對每筆結果算 score：
 *   - 標題完全相符：+100
 *   - 標題以 q 開頭：+50
 *   - 標題包含 q：+20
 *   - 摘要/描述包含 q：+5
 *
 * 排序：score DESC，相同分數比 fallbackDate DESC（新的優先）
 */
export function scoreItem(
  q: string,
  title: string | null | undefined,
  body: string | null | undefined
): number {
  if (!q) return 0;
  const Q = q.toLowerCase();
  const T = (title || "").toLowerCase();
  const B = (body || "").toLowerCase();
  let s = 0;
  if (T === Q) s += 100;
  else if (T.startsWith(Q)) s += 50;
  else if (T.includes(Q)) s += 20;
  if (B.includes(Q)) s += 5;
  return s;
}

export function rankByScore<T extends { _score?: number; _date?: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const sb = (b._score || 0) - (a._score || 0);
    if (sb !== 0) return sb;
    const da = a._date ? new Date(a._date).getTime() : 0;
    const db_ = b._date ? new Date(b._date).getTime() : 0;
    return db_ - da;
  });
}
