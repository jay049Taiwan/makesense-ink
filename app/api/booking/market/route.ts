import { NextRequest, NextResponse } from "next/server";
import { createPage, DB } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ["marketDate", "boothType", "brandName", "brandUrl", "brandIntro", "products", "contactName", "contactPhone", "contactEmail"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `缺少必填欄位: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create entry in Notion DB05
    const page = await createPage(DB.DB05_REGISTRATION, {
      "明細名稱": {
        title: [{ text: { content: `市集報名：${body.brandName} - ${body.marketDate}` } }],
      },
      "明細內容": {
        rich_text: [{ text: { content: JSON.stringify(body, null, 2).slice(0, 2000) } }],
      },
      "明細類型": {
        select: { name: "報名登記" },
      },
    });

    return NextResponse.json({
      success: true,
      pageId: page.id,
      message: "報名成功",
    });
  } catch (error) {
    console.error("Market booking error:", error);
    return NextResponse.json(
      { error: "報名失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
