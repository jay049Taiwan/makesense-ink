import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { writeStaffDB05Record } from "@/lib/staff-helper";

// 子類型 → DB05 請款請購 option 值
const SUB_TYPE_TO_DETAIL: Record<string, string> = {
  請款: "請款轉交",
  請購: "請購直匯",
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Item {
  name: string;
  price: number;
  qty: number;
  note?: string;
  url?: string;
}

// POST /api/staff/expense — 寫入請款 / 請購
//
// Body:
//   sub_type    : '請款' | '請購'
//   items       : Item[]
//   has_receipt : boolean (僅請款)
//   note        : string (僅請款)
export async function POST(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { sub_type, items = [], has_receipt, note } = body || {};
  const detail = SUB_TYPE_TO_DETAIL[sub_type];
  if (!detail) {
    return NextResponse.json({ error: `無效的 sub_type：${sub_type}` }, { status: 400 });
  }

  const email = guard.email;
  if (!email) {
    return NextResponse.json({ error: "員工 email 缺失，無法寫入紀錄" }, { status: 400 });
  }

  // 過濾無效品項
  const validItems: Item[] = (items as Item[]).filter(
    (i) => i && i.name && Number(i.price) > 0 && Number(i.qty) > 0
  );
  if (validItems.length === 0) {
    return NextResponse.json({ error: "至少需要一筆有效品項（含品名、金額、數量）" }, { status: 400 });
  }

  const total = validItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);

  // 標題：請款 2026-05-04 NT$1,234（3 筆）
  const today = fmtDate(new Date());
  const title = `${sub_type} ${today} NT$${total.toLocaleString()}（${validItems.length} 筆）`;

  // 內容：列出所有品項
  const lines = validItems.map((i, idx) => {
    const sub = `${idx + 1}. ${i.name} ｜ NT$${i.price} × ${i.qty} = NT$${Number(i.price) * Number(i.qty)}`;
    const extras: string[] = [];
    if (i.note) extras.push(`用途：${i.note}`);
    if (i.url) extras.push(`連結：${i.url}`);
    return extras.length > 0 ? `${sub}\n   ${extras.join("｜")}` : sub;
  });
  if (sub_type === "請款") {
    lines.push(`收據：${has_receipt ? "有" : "無"}`);
    if (note) lines.push(`備註：${note}`);
  }
  const content = lines.join("\n");

  try {
    const result = await writeStaffDB05Record({
      type: "expense",
      detail,
      title,
      staffEmail: email,
      amount: total,
      content,
    });
    return NextResponse.json({ success: true, db05_id: result.id, total });
  } catch (err: any) {
    console.error("[expense] Notion write failed:", err.message);
    return NextResponse.json({ error: "寫入 Notion 失敗：" + err.message }, { status: 500 });
  }
}
