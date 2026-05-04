import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../../../_guard";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Notion DB05 上要有這個 status 欄位 + 包含 "請求協助" option
// Noah 的 Notion AI Agent 監看：AI 狀態 = 請求協助 → 生成文案 → 寫回 page
const AI_STATUS_PROP = "AI 狀態";
const AI_REQUEST_VALUE = "請求協助";

// POST /api/staff/page/[id]/ai-trigger
//   把 DB05 page 的「AI 狀態」改為「請求協助」，觸發 Notion AI Agent 接棒
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        [AI_STATUS_PROP]: { status: { name: AI_REQUEST_VALUE } },
      } as any,
    });
    return NextResponse.json({ success: true, status: AI_REQUEST_VALUE });
  } catch (err: any) {
    const msg = err?.message || "未知錯誤";
    // Notion 沒這個欄位的話會回 400 + 「property ... not found」
    const hint = msg.includes("not found") || msg.includes("Could not find")
      ? `Notion DB05 還沒「${AI_STATUS_PROP}」status 欄位（且要有「${AI_REQUEST_VALUE}」option）`
      : null;
    return NextResponse.json({ error: msg, hint }, { status: 422 });
  }
}
