import { NextRequest, NextResponse } from "next/server";
import notion from "@/lib/notion";

/**
 * GET /api/notion-image?pageId=xxx&field=cover|photo
 *
 * Notion 內部檔案 URL 1 小時過期，這個 proxy 即時從 Notion 取得新 URL 並 redirect。
 * 前端用法：<img src="/api/notion-image?pageId=xxx&field=cover" />
 *
 * Cache: 45 分鐘（Notion URL 有效 1 小時，保留 15 分鐘 buffer）
 */
export async function GET(req: NextRequest) {
  const pageId = req.nextUrl.searchParams.get("pageId");
  const field = req.nextUrl.searchParams.get("field") || "cover";

  if (!pageId) {
    return NextResponse.json({ error: "pageId required" }, { status: 400 });
  }

  try {
    const page: any = await notion.pages.retrieve({ page_id: pageId });

    let url: string | null = null;

    if (field === "cover") {
      // 頁面封面
      url = page.cover?.file?.url || page.cover?.external?.url || null;
    } else {
      // 從 properties 讀圖片欄位（上傳檔案）
      const fileProp = page.properties?.["上傳檔案"] || page.properties?.["產品照片"];
      const files = fileProp?.files;
      if (files && Array.isArray(files) && files.length > 0) {
        url = files[0]?.file?.url || files[0]?.external?.url || null;
      }
    }

    if (!url) {
      return NextResponse.json({ error: "No image found" }, { status: 404 });
    }

    // Redirect with cache
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=2700, s-maxage=2700", // 45 min
      },
    });
  } catch (err: any) {
    console.error("notion-image err:", err.message);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
