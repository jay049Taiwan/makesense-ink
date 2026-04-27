import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { updatePageProperties } from "@/lib/staff-tasks";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { topicName, executionTime, handoverNote } = await req.json();
  const properties: Record<string, any> = {};
  if (topicName !== undefined) {
    properties["主題名稱"] = { rich_text: [{ text: { content: topicName } }] };
  }
  if (executionTime !== undefined) {
    properties["執行時間"] = executionTime ? { date: { start: executionTime } } : { date: null };
  }
  if (handoverNote !== undefined) {
    properties["交接備註"] = { rich_text: [{ text: { content: handoverNote } }] };
  }
  try {
    await updatePageProperties(id, properties);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}
