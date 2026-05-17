import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../_guard";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DS_DB06 = process.env.NOTION_DB06_TRANSACTION!;

export const runtime = "nodejs";
export const maxDuration = 30;

const getTitle = (p: any) => p?.title?.map((t: any) => t.plain_text).join("") || "";
const getRichText = (p: any) => p?.rich_text?.map((t: any) => t.plain_text).join("") || "";
const getSelect = (p: any) => p?.select?.name || "";
const getStatus = (p: any) => p?.status?.name || "";

/**
 * GET /api/staff/db06?db04Id=<notion_page_id>
 * 查詢 DB06 清單明細中，對應協作 = db04Id 的所有紀錄，回傳 AI 欄位資料。
 * 僅限 L2 工作人員（requireStaff）。
 */
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const db04Id = url.searchParams.get("db04Id");
  if (!db04Id) return NextResponse.json({ error: "缺少 db04Id" }, { status: 400 });

  try {
    const response: any = await (notion as any).dataSources.query({
      data_source_id: DS_DB06,
      filter: {
        property: "對應協作",
        relation: { contains: db04Id },
      },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 50,
    } as any);

    const items = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: getTitle(props["明細名稱"]),
        aiMode: getSelect(props["ai模式"]),
        aiStatus: getStatus(props["ai狀態"]),
        aiNote: getRichText(props["分析備註"]),
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[staff/db06] error:", err.message);
    return NextResponse.json({ error: "查詢 DB06 失敗：" + err.message }, { status: 500 });
  }
}
