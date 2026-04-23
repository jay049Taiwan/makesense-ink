import { NextRequest, NextResponse } from "next/server";
import { getPage, queryDatabase, DB } from "@/lib/notion";

export const dynamic = "force-dynamic";

function t(prop: any): string { return prop?.title?.[0]?.plain_text || prop?.title?.map((x: any) => x.plain_text).join("") || ""; }
function tx(prop: any): string { return prop?.rich_text?.map((x: any) => x.plain_text).join("") || ""; }
function st(prop: any): string { return prop?.status?.name || prop?.select?.name || ""; }
function rel(prop: any): string[] { return (prop?.relation || []).map((r: any) => r.id); }
function num(prop: any): number | null { return typeof prop?.number === "number" ? prop.number : null; }
function fileUrl(prop: any): string | null {
  const f = prop?.files?.[0];
  if (!f) return null;
  return f.external?.url || f.file?.url || null;
}

/**
 * GET /api/buy/vendor/[notionId]
 * 攤商個別預購頁資料：單筆 DB05 + 其 DB06 明細（商品/體驗/活動時間）
 * 回傳結構化資料給 /buy/vendor-{id} 頁面渲染
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ notionId: string }> }) {
  const { notionId } = await params;
  const cleanId = notionId.replace(/-/g, "");

  try {
    const page: any = await getPage(cleanId);
    const props = page?.properties || {};

    // 驗證是否為錄取的市集攤商
    const admissionStatus = st(props["錄取狀態"]);
    const registerOption = st(props["登記選項"]);
    const formType = st(props["表單類型"]);

    if (admissionStatus !== "錄取" || registerOption !== "預約報名" || formType !== "報名登記") {
      return NextResponse.json({ available: false, reason: "not_accepted" }, { status: 404 });
    }

    // 活動（DB04）資訊 → 判斷是否已過期
    const eventRels = rel(props["對應協作"]);
    let event: any = null;
    if (eventRels[0]) {
      try {
        const evPage: any = await getPage(eventRels[0]);
        const ep = evPage?.properties || {};
        const dateProp = ep["執行時間"]?.date || ep["活動日期"]?.date;
        event = {
          id: String(eventRels[0]).replace(/-/g, ""),
          title: t(ep["主題名稱"]) || t(ep["交接名稱"]) || "",
          date: dateProp?.start || null,
          endDate: dateProp?.end || null,
        };
      } catch {}
    }

    // 生命週期：活動結束後隔天下架
    if (event?.date) {
      const eventEnd = new Date(event.endDate || event.date);
      eventEnd.setDate(eventEnd.getDate() + 1);
      if (Date.now() > eventEnd.getTime()) {
        return NextResponse.json({ available: false, reason: "expired", eventTitle: event.title }, { status: 404 });
      }
    }

    // 解析 DB05 brand info（從 明細內容 text 解析 + 上傳檔案）
    const summaryText = tx(props["明細內容"]);
    const brand: Record<string, string> = {};
    summaryText.split("\n").forEach((line: string) => {
      const m = line.match(/^([^：:]+)[：:]\s*(.*)$/);
      if (m) brand[m[1].trim()] = m[2].trim();
    });

    // 品牌圖片：DB05 上傳檔案
    const files = props["上傳檔案"]?.files || [];
    const logoUrl = files.find((f: any) => f.name?.includes("Logo"))?.external?.url
      || files[0]?.external?.url || null;
    const imageUrl = files.find((f: any) => f.name?.includes("情境"))?.external?.url
      || files[1]?.external?.url || null;

    // 讀 DB06 明細（對應明細 relation）
    const detailRels = rel(props["對應明細"]);
    const details = await Promise.all(
      detailRels.map(async (id) => {
        try {
          const d: any = await getPage(id);
          const dp = d?.properties || {};
          return {
            id,
            name: t(dp["明細名稱"]),
            price: num(dp["登記單價"]),
            qty: num(dp["登記數量"]),
            content: tx(dp["明細內容"]),
            photoUrl: fileUrl(dp["上傳檔案"]),
          };
        } catch {
          return null;
        }
      })
    );

    const items = details.filter(Boolean) as any[];
    const products = items.filter((i) => i.name.startsWith("商品-")).map((i) => ({
      id: i.id,
      name: i.name.slice(3),
      price: i.price || 0,
      preorder_limit: i.qty,
      intro: i.content,
      photoUrl: i.photoUrl,
    }));
    const experiences = items.filter((i) => i.name.startsWith("體驗-")).map((i) => ({
      id: i.id,
      name: i.name.slice(3),
      price: i.price || 0,
      capacity: i.qty,
      content: i.content,
    }));
    const schedules = items.filter((i) => i.name.startsWith("活動-")).map((i) => ({
      id: i.id,
      theme: i.name.slice(3),
      price: i.price || 0,
      content: i.content,
    }));

    return NextResponse.json({
      available: true,
      vendor: {
        id: cleanId,
        title: t(props["表單名稱"]),
        brandName: brand["品牌名稱"] || "",
        type: brand["攤位類型"] || "",
        region: brand["所在地區"] || "",
        url: brand["粉專/官網"] || "",
        keywords: brand["品牌關鍵字"] || "",
        intro: brand["品牌簡介"] || "",
        logoUrl,
        imageUrl,
      },
      event,
      products,
      experiences,
      schedules,
    });
  } catch (e: any) {
    console.error("[api/buy/vendor] error:", e.message);
    return NextResponse.json({ error: e.message || "讀取失敗" }, { status: 500 });
  }
}
