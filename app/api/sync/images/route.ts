import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";

export const maxDuration = 300;

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

/**
 * POST /api/sync/images — 批次遷移 Notion 圖片到 R2
 *
 * Query params:
 *   ?table=events   (events, articles, products)
 *   ?limit=20       (每次處理幾筆)
 */
export async function POST(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") || "events";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  if (!["events", "articles", "products"].includes(table)) {
    return NextResponse.json({ error: "table must be events, articles, or products" }, { status: 400 });
  }

  function isR2Url(url: string) {
    return R2_PUBLIC_URL ? url.startsWith(R2_PUBLIC_URL) : false;
  }

  try {
    let processed = 0, skipped = 0, errors = 0;

    if (table === "products") {
      const { data: rows } = await supabase
        .from("products")
        .select("id, notion_id, images")
        .not("images", "is", null)
        .not("images", "eq", "[]")
        .order("updated_at", { ascending: false })
        .limit(limit);

      for (const row of rows || []) {
        try {
          let imgs: string[] = [];
          try { imgs = JSON.parse(row.images); } catch { continue; }
          if (imgs.length === 0) continue;

          let changed = false;
          const newImgs = await Promise.all(imgs.map(async (url, i) => {
            if (isR2Url(url)) return url;
            if (!url.includes("notion-static") && !url.includes("prod-files-secure")) return url;
            const r2Url = await uploadToR2(url, "makesense/products", `${row.notion_id}_${i}`);
            if (r2Url && r2Url !== url) { changed = true; return r2Url; }
            return url;
          }));

          if (changed) {
            await supabase.from("products").update({ images: JSON.stringify(newImgs) }).eq("id", row.id);
            processed++;
          } else {
            skipped++;
          }
        } catch (e: any) { console.error("img err:", e.message); errors++; }
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
      const { data: rows } = await supabase
        .from(table)
        .select("id, notion_id, cover_url")
        .not("cover_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      for (const row of rows || []) {
        try {
          if (!row.cover_url) { skipped++; continue; }
          if (isR2Url(row.cover_url)) { skipped++; continue; }
          if (!row.cover_url.includes("notion-static") && !row.cover_url.includes("prod-files-secure")) { skipped++; continue; }

          const r2Url = await uploadToR2(row.cover_url, `makesense/${table}`, row.notion_id);
          if (r2Url && r2Url !== row.cover_url) {
            await supabase.from(table).update({ cover_url: r2Url }).eq("id", row.id);
            processed++;
          } else {
            skipped++;
          }
        } catch (e: any) { console.error("img err:", e.message); errors++; }
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return NextResponse.json({ success: true, table, processed, skipped, errors });
  } catch (err: any) {
    console.error("Image sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
