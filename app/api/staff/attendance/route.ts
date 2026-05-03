import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { writeStaffDB05Record, getStaffIdByEmail } from "@/lib/staff-helper";
import { supabaseAdmin } from "@/lib/supabase";

// 子類型 → DB05 紀錄備項 option 值
const SUB_TYPE_TO_DETAIL: Record<string, string> = {
  打卡: "打卡紀錄",
  日誌: "工作紀錄",
  請假: "請假紀錄",
  加班: "加班紀錄",
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// POST /api/staff/attendance — 寫入打卡 / 日誌 / 請假 / 加班
//
// Body:
//   sub_type: '打卡' | '日誌' | '請假' | '加班'
//   payload : sub_type 對應的彈性資料
//     打卡: { action: '上班' | '下班' }
//     日誌: { content: string }
//     請假: { leave_type: string, start_date: string, end_date: string, reason?: string }
//     加班: { date: string, hours: number, reason?: string }
export async function POST(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { sub_type, payload } = body || {};
  const detail = SUB_TYPE_TO_DETAIL[sub_type];
  if (!detail) {
    return NextResponse.json({ error: `無效的 sub_type：${sub_type}` }, { status: 400 });
  }

  const email = guard.email;
  if (!email) {
    return NextResponse.json({ error: "員工 email 缺失，無法寫入紀錄" }, { status: 400 });
  }

  // 解析員工 staff_id（用於 Supabase 同步）+ DB08 page id（給 helper）
  const staffId = await getStaffIdByEmail(email);
  if (!staffId) {
    return NextResponse.json({ error: "員工資料未同步，請聯繫管理員" }, { status: 409 });
  }

  // 標題與內容彙整
  const now = new Date();
  let title = "";
  let content = "";
  let activityDate: string | null = null;
  let hours: number | null = null;

  if (sub_type === "打卡") {
    const action = payload?.action === "下班" ? "下班" : "上班";
    title = `打卡 ${action} ${fmtDateTime(now)}`;
    content = `${action}打卡：${fmtDateTime(now)}`;
    activityDate = fmtDate(now);
  } else if (sub_type === "日誌") {
    title = `工作日誌 ${fmtDate(now)}`;
    content = String(payload?.content || "").trim();
    if (!content) return NextResponse.json({ error: "日誌內容不可空白" }, { status: 400 });
    activityDate = fmtDate(now);
  } else if (sub_type === "請假") {
    const lt = String(payload?.leave_type || "請假");
    const sd = String(payload?.start_date || "");
    const ed = String(payload?.end_date || "");
    if (!sd || !ed) return NextResponse.json({ error: "請假起訖日期必填" }, { status: 400 });
    title = `${lt} ${sd}~${ed}`;
    content = `${lt}：${sd} ~ ${ed}` + (payload?.reason ? `\n事由：${payload.reason}` : "");
    activityDate = sd;
  } else if (sub_type === "加班") {
    const date = String(payload?.date || fmtDate(now));
    const hrs = Number(payload?.hours || 0);
    if (!hrs || hrs <= 0) return NextResponse.json({ error: "加班時數必須大於 0" }, { status: 400 });
    title = `加班 ${date} ${hrs}h`;
    content = `加班：${date} ${hrs}小時` + (payload?.reason ? `\n事由：${payload.reason}` : "");
    activityDate = date;
    hours = hrs;
  }

  // Step 1: 寫入 Notion DB05
  let notionId: string | null = null;
  try {
    const result = await writeStaffDB05Record({
      type: "attendance",
      detail,
      title,
      staffEmail: email,
      content,
    });
    notionId = result.id;
  } catch (err: any) {
    console.error("[attendance] Notion write failed:", err.message);
    return NextResponse.json({ error: "寫入 Notion 失敗：" + err.message }, { status: 500 });
  }

  // Step 2: 同步到 Supabase staff_activities（讀取走 Supabase）
  try {
    await supabaseAdmin.from("staff_activities").insert({
      staff_id: staffId,
      task_type: sub_type,
      notion_db05_id: notionId,
      detail: payload || {},
      activity_date: activityDate,
      hours,
    });
  } catch (err: any) {
    console.error("[attendance] Supabase sync failed:", err.message);
    // 不擋使用者，Notion 已寫入；同步失敗只記錄
  }

  return NextResponse.json({ success: true, db05_id: notionId });
}

// GET /api/staff/attendance?sub_type=打卡&limit=30 — 讀取歷史紀錄
export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const subType = url.searchParams.get("sub_type");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

  const email = guard.email;
  if (!email) {
    return NextResponse.json({ error: "員工 email 缺失" }, { status: 400 });
  }
  const staffId = await getStaffIdByEmail(email);
  if (!staffId) {
    return NextResponse.json({ records: [] });
  }

  let q = supabaseAdmin
    .from("staff_activities")
    .select("id, task_type, detail, activity_date, hours, notion_db05_id, created_at")
    .eq("staff_id", staffId)
    .not("task_type", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subType) q = q.eq("task_type", subType);

  const { data, error } = await q;
  if (error) {
    console.error("[attendance] GET failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ records: data || [] });
}
