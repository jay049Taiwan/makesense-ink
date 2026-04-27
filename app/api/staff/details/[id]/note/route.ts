import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { updatePageProperties } from "@/lib/staff-tasks";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const { id } = await params;
  const { note } = await req.json();
  try {
    await updatePageProperties(id, {
      "交接回覆": { rich_text: [{ text: { content: note || "" } }] },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}
