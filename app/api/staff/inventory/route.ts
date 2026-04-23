import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPage, DB } from "@/lib/notion";
import { getNotionUserId } from "@/lib/notion-users";

// POST /api/staff/inventory — 庫存異動（進貨/出貨/盤點）
// 流程：DB06（每品項+雜支各一筆）→ DB05（標頭，對應明細指向所有 DB06）
// DB04 不碰
//
// Body:
//   operation      : '進貨' | '出貨' | '盤點'
//   items          : [{ name, quantity, price, cost_price, notion_id }]
//                    notion_id = DB07 page ID（選填）
//   misc_items     : [{ name, amount }]（選填，運費/稅）
//   counterpart_id : DB08 page ID（選填）
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if ((session as any).role !== "staff") {
    return NextResponse.json({ error: "非工作人員" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { operation, items = [], misc_items = [], counterpart_id } = body;

  if (!["進貨", "出貨", "盤點"].includes(operation)) {
    return NextResponse.json({ error: `無效的 operation：${operation}` }, { status: 400 });
  }

  const operatorNotionId = await getNotionUserId(session.user.email);
  const today = new Date().toISOString().split("T")[0];
  const eventTitle = `${operation} ${today}`;

  // Step 1: 為每個品項建一筆 DB06
  const db06PageIds: string[] = [];
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
      console.error(`[inventory] DB06 failed for ${item.name}:`, err.message);
    }
  }

  // Step 2: 雜支
  for (const misc of misc_items) {
    if (!misc.amount || misc.amount <= 0) continue;
    const props: Record<string, any> = {
      "明細名稱": { title: [{ text: { content: misc.name || "雜支" } }] },
      "明細類型": { select: { name: "庫存紀錄" } },
      "登記數量": { number: 1 },
      "登記單價": { number: misc.amount },
    };
    if (operation === "出貨") {
      props["登記售價"] = { number: misc.amount };
    }
    try {
      const page = await createPage(DB.DB06_TRANSACTION, props);
      db06PageIds.push(page.id);
    } catch (err: any) {
      console.error(`[inventory] DB06 misc failed for ${misc.name}:`, err.message);
    }
  }

  // Step 3: DB05 標頭
  const db05Props: Record<string, any> = {
    "表單名稱": { title: [{ text: { content: eventTitle } }] },
    "表單類型": { select: { name: "報名登記" } },
    "登記選項": { select: { name: "紀錄庫存" } },
    "庫存細項": { select: { name: operation } },
  };
  if (operatorNotionId) {
    db05Props["責任執行"] = { people: [{ id: operatorNotionId }] };
  }
  if (counterpart_id) {
    db05Props["對應對象"] = { relation: [{ id: counterpart_id }] };
  }
  if (db06PageIds.length > 0) {
    db05Props["對應明細"] = { relation: db06PageIds.map(id => ({ id })) };
  }

  try {
    const db05Page = await createPage(DB.DB05_REGISTRATION, db05Props);
    return NextResponse.json({
      success: true,
      db05_id: db05Page.id,
      db06_count: db06PageIds.length,
      message: `${operation}記錄已寫入 Notion（${db06PageIds.length} 筆明細）`,
    });
  } catch (err: any) {
    console.error("[inventory] DB05 failed:", err.message);
    return NextResponse.json({ error: "寫入 Notion 失敗：" + err.message }, { status: 500 });
  }
}
