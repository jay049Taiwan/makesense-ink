import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { createPage, DB } from "@/lib/notion";
import { getNotionUserId } from "@/lib/notion-users";
import { getStaffIdByEmail } from "@/lib/staff-helper";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/staff/inventory — 庫存異動（進貨/出貨/盤點）
//
// 寫入順序（Supabase 是真相來源 / Notion 是鏡射）：
//   1. Supabase staff_activities（task_type=進貨/出貨/盤點，detail=完整 payload）
//   2. best-effort 寫 Notion DB06 多筆明細 + DB05 標頭
//      成功 → 回填 notion_db05_id + notion_synced_at
//      失敗 → notion_sync_error 留訊息，但 API 仍回 success
//
// Body:
//   operation      : '進貨' | '出貨' | '盤點'
//   items          : [{ name, quantity, price, cost_price, notion_id }]
//   misc_items     : [{ name, amount }]
//   counterpart_id : DB08 page ID（選填）
export async function POST(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = guard.email;

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { operation, items = [], misc_items = [], counterpart_id } = body;
  if (!["進貨", "出貨", "盤點"].includes(operation)) {
    return NextResponse.json({ error: `無效的 operation：${operation}` }, { status: 400 });
  }

  if (!email) return NextResponse.json({ error: "員工 email 缺失" }, { status: 400 });
  const staffId = await getStaffIdByEmail(email);
  if (!staffId) return NextResponse.json({ error: "員工資料未同步" }, { status: 409 });

  const today = new Date().toISOString().split("T")[0];
  const eventTitle = `${operation} ${today}`;
  const itemCount = (items || []).length;
  const totalQty = (items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);

  // Step 1（必須成功）：Supabase staff_activities
  const { data: activity, error: insertErr } = await supabaseAdmin
    .from("staff_activities")
    .insert({
      staff_id: staffId,
      task_type: operation,  // 進貨 / 出貨 / 盤點
      detail: {
        operation,
        items, misc_items, counterpart_id: counterpart_id || null,
        item_count: itemCount, total_qty: totalQty,
        _title: eventTitle,
      },
      activity_date: today,
    })
    .select("id")
    .single();
  if (insertErr || !activity) {
    console.error("[inventory] Supabase insert failed:", insertErr?.message);
    return NextResponse.json({ error: "儲存失敗：" + (insertErr?.message || "unknown") }, { status: 500 });
  }

  // Step 2（best-effort）：Notion 鏡射 — DB06 多筆 + DB05 標頭
  const notionUserId = await getNotionUserId(email);
  const db06PageIds: string[] = [];
  const errors: string[] = [];

  try {
    for (const item of items) {
      const props: Record<string, any> = {
        "明細名稱": { title: [{ text: { content: item.name || "庫存品項" } }] },
        "明細類型": { select: { name: "庫存紀錄" } },
        "登記數量": { number: item.quantity || 0 },
      };
      if (operation === "出貨" && item.price) {
        props["登記售價"] = { number: item.price };
        props["登記單價"] = { number: item.price };
      } else if (operation === "進貨" && item.cost_price) {
        props["登記進價"] = { number: item.cost_price };
        props["登記單價"] = { number: item.cost_price };
      }
      if (item.notion_id) {
        props["對應庫存"] = { relation: [{ id: item.notion_id }] };
      }
      try {
        const page = await createPage(DB.DB06_TRANSACTION, props);
        db06PageIds.push(page.id);
      } catch (err: any) {
        errors.push(`DB06 ${item.name}：${err.message}`);
        console.error(`[inventory] DB06 failed for ${item.name}:`, err.message);
      }
    }

    for (const misc of misc_items || []) {
      if (!misc.amount || misc.amount <= 0) continue;
      const props: Record<string, any> = {
        "明細名稱": { title: [{ text: { content: misc.name || "雜支" } }] },
        "明細類型": { select: { name: "庫存紀錄" } },
        "登記數量": { number: 1 },
        "登記單價": { number: misc.amount },
      };
      if (operation === "出貨") props["登記售價"] = { number: misc.amount };
      try {
        const page = await createPage(DB.DB06_TRANSACTION, props);
        db06PageIds.push(page.id);
      } catch (err: any) {
        errors.push(`DB06 雜支 ${misc.name}：${err.message}`);
      }
    }

    const db05Props: Record<string, any> = {
      "表單名稱": { title: [{ text: { content: eventTitle } }] },
      "表單類型": { select: { name: "報名登記" } },
      "登記類別": { select: { name: "紀錄庫存" } },
      "庫存細項": { select: { name: operation } },
    };
    if (notionUserId) db05Props["責任執行"] = { people: [{ id: notionUserId }] };
    if (counterpart_id) db05Props["對應對象"] = { relation: [{ id: counterpart_id }] };
    if (db06PageIds.length > 0) db05Props["對應明細"] = { relation: db06PageIds.map(id => ({ id })) };

    const db05Page = await createPage(DB.DB05_REGISTRATION, db05Props);

    await supabaseAdmin
      .from("staff_activities")
      .update({
        notion_db05_id: db05Page.id,
        notion_synced_at: new Date().toISOString(),
        notion_sync_error: errors.length > 0 ? `部分 DB06 失敗：${errors.join("；")}`.slice(0, 500) : null,
      })
      .eq("id", activity.id);

    return NextResponse.json({
      success: true,
      id: activity.id,
      db05_id: db05Page.id,
      db06_count: db06PageIds.length,
      message: `${operation}記錄已存入 Supabase + Notion（${db06PageIds.length} 筆 DB06）`,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (err: any) {
    console.error("[inventory] Notion mirror failed:", err.message);
    await supabaseAdmin
      .from("staff_activities")
      .update({ notion_sync_error: err.message?.slice(0, 500) || "unknown" })
      .eq("id", activity.id);
    return NextResponse.json({
      success: true, id: activity.id, db05_id: null, db06_count: db06PageIds.length,
      warning: "資料已存入 Supabase，但 Notion 鏡射暫時失敗（可後續補同步）",
    });
  }
}
