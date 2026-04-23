import { NextResponse } from "next/server";
import { requireStaff } from "../../../_guard";
import { updatePageProperties } from "@/lib/staff-tasks";

const NAME_MAP: Record<string, string> = { "1000": "仟元", "500": "500元", "100": "佰元", "50": "50元", "10": "拾元", "5": "5元", "1": "壹元" };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  const { period, values } = await req.json();
  const prefix = period === "close" ? "打烊" : "開店";
  const properties: Record<string, any> = {};
  for (const [denom, count] of Object.entries(values || {})) {
    const name = NAME_MAP[denom];
    if (!name) continue;
    properties[`${prefix}${name}`] = { number: count === "" || count === null || count === undefined ? null : Number(count) };
  }
  try {
    await updatePageProperties(id, properties);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "更新失敗：" + err.message }, { status: 500 });
  }
}
