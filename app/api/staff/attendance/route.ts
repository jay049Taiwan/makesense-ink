import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { writeStaffDB05Record, getStaffIdByEmail } from "@/lib/staff-helper";
import { supabaseAdmin } from "@/lib/supabase";

// 子類型 → DB05 紀錄細項 select option 值（2026/05/07 紀錄備項→紀錄細項，options 移除「紀錄」後綴）
const SUB_TYPE_TO_DETAIL: Record<string, string> = {
  打卡: "打卡",
  日誌: "日誌",
  請假: "請假",
  加班: "加班",
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
// 寫入順序（Supabase 是真相來源 / Notion 是鏡射）：
//   1. 寫 Supabase staff_activities（必須成功，失敗整筆失敗）
//   2. best-effort 寫 Notion DB05 鏡射；成功 → 回填 notion_db05_id + notion_synced_at
//      失敗 → notion_sync_error 留訊息，但 API 仍回 success（資料在 Supabase）
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

  // Step 1（必須成功）：Supabase staff_activities — Supabase 是真相來源
  const { data: activity, error: insertErr } = await supabaseAdmin
    .from("staff_activities")
    .insert({
      staff_id: staffId,
      task_type: sub_type,
      detail: { ...payload, _title: title, _content: content },
      activity_date: activityDate,
      hours,
    })
    .select("id")
    .single();
  if (insertErr || !activity) {
    console.error("[attendance] Supabase insert failed:", insertErr?.message);
    return NextResponse.json({ error: "儲存失敗：" + (insertErr?.message || "unknown") }, { status: 500 });
  }

  // Step 2（best-effort）：Notion DB05 鏡射
  try {
    const result = await writeStaffDB05Record({
      type: "attendance", detail, title, staffEmail: email, content,
    });
    await supabaseAdmin
      .from("staff_activities")
      .update({ notion_db05_id: result.id, notion_synced_at: new Date().toISOString(), notion_sync_error: null })
      .eq("id", activity.id);
    return NextResponse.json({ success: true, id: activity.id, notion_db05_id: result.id });
  } catch (err: any) {
    console.error("[attendance] Notion mirror failed:", err.message);
    await supabaseAdmin
      .from("staff_activities")
      .update({ notion_sync_error: err.message?.slice(0, 500) || "unknown" })
      .eq("id", activity.id);
    return NextResponse.json({
      success: true, id: activity.id, notion_db05_id: null,
      warning: "資料已存入 Supabase，但 Notion 鏡射暫時失敗（可後續補同步）",
    });
  }
}

// GET /api/staff/attendance?sub_type=打卡&limit=30 — 讀歷史（純 Supabase）
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
    .select("id, task_type, detail, activity_date, hours, notion_db05_id, notion_synced_at, notion_sync_error, created_at")
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
