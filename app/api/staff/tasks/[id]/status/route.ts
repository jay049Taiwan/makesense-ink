import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { updatePageProperties } from "@/lib/staff-tasks";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  const { field, value } = await req.json();
  const properties: Record<string, any> = {};
  if (field === "execution") {
    properties["執行狀態"] = { status: { name: value } };
  } else if (field === "review") {
    return NextResponse.json({ error: "目前介面不支援修改檢核狀態" }, { status: 403 });
  } else {
    return NextResponse.json({ error: "無效的欄位" }, { status: 400 });
  }
  try {
    await updatePageProperties(id, properties);
    return NextResponse.json({ success: true, message: "執行狀態已更新" });
  } catch (err: any) {
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}
