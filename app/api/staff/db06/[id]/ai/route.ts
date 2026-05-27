import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { requireStaff } from "../../../_guard";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * PUT /api/staff/db06/[id]/ai
 * body: { aiMode?: string, aiStatus?: string }
 *
 * 更新 DB06 清單明細的 智動模式（select）與 智動狀態（status）。
 * 智動狀態 → 待執行 時，額外觸發 n8n webhook（N8N_DB06_AI_WEBHOOK）。
 * 僅限 L2 工作人員。
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { aiMode, aiStatus } = body as { aiMode?: string; aiStatus?: string };

  if (aiMode === undefined && aiStatus === undefined) {
    return NextResponse.json({ error: "請提供 aiMode 或 aiStatus" }, { status: 400 });
  }

  const properties: Record<string, any> = {};
  if (aiMode !== undefined) {
    // 空字串代表清空 select
    properties["智動模式"] = aiMode ? { select: { name: aiMode } } : { select: null };
  }
  if (aiStatus !== undefined) {
    properties["智動狀態"] = { status: { name: aiStatus } };
  }

  try {
    await notion.pages.update({ page_id: id, properties });

    // 觸發 n8n webhook（只在設為「待執行」時）
    if (aiStatus === "待執行") {
      const webhookUrl = process.env.N8N_DB06_AI_WEBHOOK;
      if (webhookUrl) {
        // fire-and-forget：不 await，失敗只 log 不影響回應
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ db06Id: id, aiMode, aiStatus }),
        }).catch((e) => console.warn("[db06/ai] n8n webhook failed:", e.message));
      } else {
        console.log("[db06/ai] N8N_DB06_AI_WEBHOOK 未設定，跳過觸發");
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[staff/db06/ai] error:", err.message);
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}
