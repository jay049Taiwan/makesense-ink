import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const maxDuration = 300;

/**
 * POST /api/sync/images — 批次遷移 Notion 圖片到 Cloudinary
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

  try {
    let processed = 0, skipped = 0, errors = 0;

    if (table === "products") {
      // products.images 是 JSON 陣列
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

          // 只遷移 Notion 臨時 URL
          let changed = false;
          const newImgs = await Promise.all(imgs.map(async (url, i) => {
            if (url.includes("res.cloudinary.com")) return url;
            if (!url.includes("notion-static") && !url.includes("prod-files-secure")) return url;
            const cdnUrl = await uploadToCloudinary(url, "makesense/products", `${row.notion_id}_${i}`);
            if (cdnUrl && cdnUrl !== url) { changed = true; return cdnUrl; }
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
      // events/articles 用 cover_url
      const { data: rows } = await supabase
        .from(table)
        .select("id, notion_id, cover_url")
        .not("cover_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      for (const row of rows || []) {
        try {
          if (!row.cover_url) { skipped++; continue; }
          if (row.cover_url.includes("res.cloudinary.com")) { skipped++; continue; }
          if (!row.cover_url.includes("notion-static") && !row.cover_url.includes("prod-files-secure")) { skipped++; continue; }

          const cdnUrl = await uploadToCloudinary(row.cover_url, `makesense/${table}`, row.notion_id);
          if (cdnUrl && cdnUrl !== row.cover_url) {
            await supabase.from(table).update({ cover_url: cdnUrl }).eq("id", row.id);
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
