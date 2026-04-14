import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { translateBatch } from "@/lib/translate";

export const maxDuration = 300; // 5 min

/**
 * POST /api/sync/translate — 批次翻譯 Supabase 內容到英日韓
 *
 * Query params:
 *   ?table=products|events|articles|topics（必填）
 *   ?limit=50（每次翻譯幾筆，預設 50）
 *   ?force=true（強制重新翻譯已翻譯的）
 */
export async function POST(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const force = req.nextUrl.searchParams.get("force") === "true";

  if (!table || !["products", "events", "articles", "topics"].includes(table)) {
    return NextResponse.json({ error: "Missing or invalid table param. Use: products, events, articles, topics" }, { status: 400 });
  }

  // 取得需要翻譯的資料
  const fieldMap: Record<string, string[]> = {
    products: ["name", "description"],
    events: ["title", "description"],
    articles: ["title", "content"],
    topics: ["name", "summary", "content"],
  };
  const fields = fieldMap[table];

  // 查詢原始資料
  let query = supabase
    .from(table)
    .select(`id, ${fields.join(", ")}`)
    .eq("status", "active")
    .limit(limit);

  // 如果不是強制翻譯，只翻還沒翻譯的
  if (!force) {
    // 找出已翻譯的 row_ids（en locale）
    const { data: translated } = await supabase
      .from("translations")
      .select("row_id")
      .eq("table_name", table)
      .eq("locale", "en");

    const translatedIds = new Set((translated || []).map((t) => t.row_id));

    const { data: rows } = await query;
    const untranslated = (rows || []).filter((r) => !translatedIds.has(r.id));

    if (untranslated.length === 0) {
      return NextResponse.json({ success: true, message: "All rows already translated", translated: 0, errors: 0 });
    }

    const batchRows = untranslated.map((row) => ({
      id: row.id,
      fields: Object.fromEntries(fields.map((f) => [f, row[f]])),
    }));

    const result = await translateBatch(table, batchRows, { delayMs: 500 });
    return NextResponse.json({ success: true, ...result, total: untranslated.length });
  }

  // 強制翻譯
  const { data: rows } = await query;
  if (!rows || rows.length === 0) {
    return NextResponse.json({ success: true, message: "No rows found", translated: 0, errors: 0 });
  }

  const batchRows = rows.map((row) => ({
    id: row.id,
    fields: Object.fromEntries(fields.map((f) => [f, row[f]])),
  }));

  const result = await translateBatch(table, batchRows, { delayMs: 500 });
  return NextResponse.json({ success: true, ...result, total: rows.length });
}
