import { NextRequest, NextResponse } from "next/server";
import { getPage, queryDatabase, DB } from "@/lib/notion";

export const dynamic = "force-dynamic";

function t(prop: any): string { return prop?.title?.[0]?.plain_text || prop?.title?.map((x: any) => x.plain_text).join("") || ""; }
function tx(prop: any): string { return prop?.rich_text?.map((x: any) => x.plain_text).join("") || ""; }
function st(prop: any): string { return prop?.status?.name || prop?.select?.name || ""; }
function rel(prop: any): string[] { return (prop?.relation || []).map((r: any) => r.id); }

/**
 * GET /api/buy/market/[notionId]
 * 市集總覽頁：DB04 活動資訊 + 所有「錄取」的攤商卡片清單
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ notionId: string }> }) {
  const { notionId } = await params;
  const cleanId = notionId.replace(/-/g, "");
  const dashedId = cleanId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");

  try {
    // 1. 活動資訊（DB04）
    const evPage: any = await getPage(cleanId);
    const ep = evPage?.properties || {};
    const dateProp = ep["執行時間"]?.date || ep["活動日期"]?.date;
    const eventTitle = t(ep["主題名稱"]) || t(ep["交接名稱"]) || "市集";
    const eventDate = dateProp?.start || null;
    const eventEndDate = dateProp?.end || null;
    const eventLocation = tx(ep["活動地點"]) || tx(ep["地點"]) || "";

    // 生命週期
    if (eventDate) {
      const end = new Date(eventEndDate || eventDate);
      end.setDate(end.getDate() + 1);
      if (Date.now() > end.getTime()) {
        return NextResponse.json({ available: false, reason: "expired", eventTitle }, { status: 404 });
      }
    }

    // 2. 攤商清單（DB05 錄取狀態=錄取 且 對應協作=此市集）
    const db05Rows = await queryDatabase(
      DB.DB05_REGISTRATION,
      {
        and: [
          { property: "表單類型", select: { equals: "報名登記" } },
          { property: "登記選項", select: { equals: "預約報名" } },
          { property: "錄取狀態", status: { equals: "錄取" } },
          { property: "對應協作", relation: { contains: dashedId } },
        ],
      },
      undefined,
      100
    );

    const vendors = db05Rows.map((row: any) => {
      const p = row?.properties || {};
      const summaryText = tx(p["明細內容"]);
      const brand: Record<string, string> = {};
      summaryText.split("\n").forEach((line: string) => {
        const m = line.match(/^([^：:]+)[：:]\s*(.*)$/);
        if (m) brand[m[1].trim()] = m[2].trim();
      });
      const files = p["上傳檔案"]?.files || [];
      const logoUrl = files.find((f: any) => f.name?.includes("Logo"))?.external?.url
        || files[0]?.external?.url || null;
      return {
        id: String(row.id).replace(/-/g, ""),
        brandName: brand["品牌名稱"] || t(p["表單名稱"]),
        type: brand["攤位類型"] || "",
        keywords: brand["品牌關鍵字"] || "",
        intro: brand["品牌簡介"]?.slice(0, 80) || "",
        logoUrl,
      };
    });

    return NextResponse.json({
      available: true,
      event: {
        id: cleanId,
        title: eventTitle,
        date: eventDate,
        endDate: eventEndDate,
        location: eventLocation,
      },
      vendors,
    });
  } catch (e: any) {
    console.error("[api/buy/market] error:", e.message);
    return NextResponse.json({ error: e.message || "讀取失敗" }, { status: 500 });
  }
}
