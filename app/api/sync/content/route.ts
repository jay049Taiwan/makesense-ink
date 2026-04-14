import { NextRequest, NextResponse } from "next/server";
import { getPageContent } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const maxDuration = 300; // 5 min

/**
 * POST /api/sync/content — 批次抓取文章/觀點正文存入 Supabase
 *
 * Query params:
 *   ?table=articles  (articles 或 topics)
 *   ?limit=50        (每次處理幾筆，預設 50)
 *   ?force=true      (強制重抓已有 content 的)
 */
export async function POST(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") || "articles";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const force = req.nextUrl.searchParams.get("force") === "true";

  if (!["articles", "topics"].includes(table)) {
    return NextResponse.json({ error: "table must be articles or topics" }, { status: 400 });
  }

  try {
    // 找出需要抓 content 的記錄
    let query = supabase
      .from(table)
      .select("id, notion_id, title")
      .not("notion_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!force) {
      query = query.or("content.is.null,content.eq.");
    }

    if (table === "articles") {
      query = query.eq("status", "published");
    } else {
      query = query.eq("status", "active");
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, message: "No rows need content sync", processed: 0 });
    }

    let processed = 0, errors = 0;

    for (const row of rows) {
      try {
        // Notion pageId 需要加回橫線格式
        const pageId = row.notion_id.replace(
          /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
          "$1-$2-$3-$4-$5"
        );

        console.log(`[content-sync] ${table} "${row.title}" (${row.notion_id})`);
        const html = await getPageContent(pageId);

        if (html && html.trim().length > 0) {
          const { error: upErr } = await supabase
            .from(table)
            .update({ content: html })
            .eq("id", row.id);

          if (upErr) {
            console.error(`  update err:`, upErr.message);
            errors++;
          } else {
            processed++;
          }
        } else {
          console.log(`  empty content, skip`);
        }

        // 每筆間隔 500ms，避免 Notion 限流
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        console.error(`  err: ${row.notion_id}`, e.message);
        errors++;
        // Notion 504/429 時等久一點
        if (e.status === 504 || e.status === 429) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    return NextResponse.json({
      success: true,
      table,
      total: rows.length,
      processed,
      errors,
    });
  } catch (err: any) {
    console.error("Content sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
