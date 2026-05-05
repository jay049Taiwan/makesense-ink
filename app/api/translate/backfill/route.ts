import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { translateBatch } from "@/lib/translate";

export const maxDuration = 300; // Pro 5 min

/**
 * POST /api/translate/backfill
 *
 * Query params:
 *   ?tables=products,events,articles,topics — 只跑指定表（逗號分隔；預設全跑）
 *   ?limit=N — 每張表只跑 N 筆（預設無上限，受 maxDuration 限制）
 *   ?delayMs=300 — 每筆間隔（預設 300ms 避免 Anthropic 限流）
 *
 * 翻譯邏輯：
 * - hash 不變 → 跳過（避免重翻）
 * - hash 變或缺翻 → 觸發 Haiku
 *
 * 第一次跑要備好 ANTHROPIC_API_KEY 在 Vercel env。
 */
export async function POST(req: NextRequest) {
  const tablesParam = req.nextUrl.searchParams.get("tables");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const delayMs = Number(req.nextUrl.searchParams.get("delayMs")) || 300;
  const limit = limitParam ? Number(limitParam) : null;
  const onlyTables = tablesParam ? new Set(tablesParam.split(",").map((t) => t.trim())) : null;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set in env. Set it in Vercel before running backfill." },
      { status: 500 }
    );
  }

  const tables: { name: string; fields: string[]; statusCol?: string; statusVal?: string }[] = [
    { name: "products", fields: ["name", "description"], statusCol: "status", statusVal: "active" },
    { name: "events", fields: ["title", "description"], statusCol: "status", statusVal: "active" },
    { name: "articles", fields: ["title"], statusCol: "status", statusVal: "published" },
    { name: "topics", fields: ["name", "summary"], statusCol: "status", statusVal: "active" },
  ];

  const results: Record<string, { fetched: number; translated: number; errors: number; skipped: number }> = {};

  for (const t of tables) {
    if (onlyTables && !onlyTables.has(t.name)) continue;

    let q = supabaseAdmin.from(t.name).select(`id, ${t.fields.join(", ")}`);
    if (t.statusCol && t.statusVal) {
      q = q.eq(t.statusCol, t.statusVal);
    }
    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    if (error) {
      results[t.name] = { fetched: 0, translated: 0, errors: 1, skipped: 0 };
      continue;
    }

    const rows = (data || []).map((r: any) => {
      const fields: Record<string, string | null> = {};
      for (const f of t.fields) fields[f] = r[f] || null;
      return { id: r.id, fields };
    });

    const result = await translateBatch(t.name, rows, { delayMs });
    results[t.name] = {
      fetched: rows.length,
      translated: result.translated,
      errors: result.errors,
      skipped: 0, // skipped 數會在每筆 console log 看到（hash unchanged）
    };
  }

  return NextResponse.json({ success: true, results });
}
