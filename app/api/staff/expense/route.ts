import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { writeStaffDB05Record, getStaffIdByEmail } from "@/lib/staff-helper";
import { supabaseAdmin } from "@/lib/supabase";

const SUB_TYPE_TO_DETAIL: Record<string, string> = {
  請款: "請款轉交",
  請購: "請購直匯",
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Item { name: string; price: number; qty: number; note?: string; url?: string; }

// POST /api/staff/expense — 請款 / 請購
//   寫入順序：Supabase staff_activities（真相來源）→ Notion DB05（鏡射，best-effort）
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
  if (!email) return NextResponse.json({ error: "員工 email 缺失" }, { status: 400 });

  const staffId = await getStaffIdByEmail(email);
  if (!staffId) return NextResponse.json({ error: "員工資料未同步" }, { status: 409 });

  const validItems: Item[] = (items as Item[]).filter(
    (i) => i && i.name && Number(i.price) > 0 && Number(i.qty) > 0
  );
  if (validItems.length === 0) {
    return NextResponse.json({ error: "至少需要一筆有效品項（含品名、金額、數量）" }, { status: 400 });
  }

  const total = validItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const today = fmtDate(new Date());
  const title = `${sub_type} ${today} NT$${total.toLocaleString()}（${validItems.length} 筆）`;

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

  // Step 1（必須成功）：Supabase
  const { data: activity, error: insertErr } = await supabaseAdmin
    .from("staff_activities")
    .insert({
      staff_id: staffId,
      task_type: sub_type,
      detail: { items: validItems, has_receipt: !!has_receipt, note: note || null, total, _title: title, _content: content },
      activity_date: today,
    })
    .select("id")
    .single();
  if (insertErr || !activity) {
    console.error("[expense] Supabase insert failed:", insertErr?.message);
    return NextResponse.json({ error: "儲存失敗：" + (insertErr?.message || "unknown") }, { status: 500 });
  }

  // Step 2（best-effort）：Notion 鏡射
  try {
    const result = await writeStaffDB05Record({
      type: "expense", detail, title, staffEmail: email, amount: total, content,
    });
    await supabaseAdmin
      .from("staff_activities")
      .update({ notion_db05_id: result.id, notion_synced_at: new Date().toISOString(), notion_sync_error: null })
      .eq("id", activity.id);
    return NextResponse.json({ success: true, id: activity.id, notion_db05_id: result.id, total });
  } catch (err: any) {
    console.error("[expense] Notion mirror failed:", err.message);
    await supabaseAdmin
      .from("staff_activities")
      .update({ notion_sync_error: err.message?.slice(0, 500) || "unknown" })
      .eq("id", activity.id);
    return NextResponse.json({
      success: true, id: activity.id, notion_db05_id: null, total,
      warning: "資料已存入 Supabase，但 Notion 鏡射暫時失敗",
    });
  }
}
