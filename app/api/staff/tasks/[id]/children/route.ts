import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { fetchDB05Children } from "@/lib/staff-tasks";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const children = await fetchDB05Children(id);
    return NextResponse.json({ children });
  } catch (err: any) {
    return NextResponse.json({ error: "查詢明細失敗：" + err.message }, { status: 500 });
  }
}
