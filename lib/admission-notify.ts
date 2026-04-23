import { supabaseAdmin as supabase } from "@/lib/supabase";
import { createPage, DB, extractTitle } from "@/lib/notion";
import { notifyRegistrationResult } from "@/lib/line-notifications";

export type AdmissionResult = "accepted" | "rejected";

export interface AdmissionNotifyOptions {
  db05PageId: string;             // 原 預約報名 DB05 頁（dashed UUID）
  result: AdmissionResult;
  orderId: string;                // Supabase orders.id
  memberId?: string | null;
  eventName?: string;
  customMessage?: string;
  skipLine?: boolean;
  /** 預先取得的 預約 DB05 頁面資料（避免重複 fetch） */
  db05Page?: any;
  /** 已存在的 confirmed DB05 notion_id（冪等性用，存在就跳過建立） */
  existingConfirmedDb05?: string | null;
}

export interface AdmissionNotifyResult {
  memberId: string | null;
  eventName: string;
  linePushed: boolean;
  confirmedDb05NotionId: string | null;
  stockDecremented: Array<{ productId: string; from: number; to: number }>;
  refundStatus: string | null;
}

// 把 32 hex 轉成 dashed UUID（Notion relation 必須 dashed）
function toDashedNotionId(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/-/g, "").toLowerCase();
  if (clean.length !== 32) return null;
  return clean.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

// 把 registration custom_fields 塞進 DB06 properties
function fillAttendeeProps(p: Record<string, any>, reg: Record<string, any> | null | undefined, fallbackName?: string) {
  const r = reg || {};
  const name = r.contact_name || r.name || fallbackName;
  if (name) p["登記姓名"] = { rich_text: [{ text: { content: String(name) } }] };
  if (r.phone) p["登記電話"] = { rich_text: [{ text: { content: String(r.phone) } }] };
  if (r.email) p["登記信箱"] = { rich_text: [{ text: { content: String(r.email) } }] };
  if (r.birth_date) p["登記出生日"] = { date: { start: String(r.birth_date) } };
  if (r.dietary) p["登記飲食習慣"] = { rich_text: [{ text: { content: String(r.dietary) } }] };
  if (r.emergency_contact) p["登記備註"] = { rich_text: [{ text: { content: `緊急聯絡：${r.emergency_contact}` } }] };
}

/**
 * V2：錄取/未錄取通知的共用邏輯
 *
 * accepted：
 *   - 建立新 DB05（表單類型=報名登記，代表已確認交易）
 *   - 為每個 order_items 建 DB06（明細類型=庫存紀錄、出貨）+ 對應 attendee 資料
 *   - 扣 Supabase products.stock
 *   - 推 LINE Flex 卡片
 *   - 回傳 confirmed_db05_notion_id 給呼叫端寫回 orders
 *
 * rejected：
 *   - 設定 refund_status（若之前有付款 → pending，否則 not_applicable）
 *   - 推 LINE 純文字
 *   - 不動庫存、不建任何 Notion 紀錄（V2 架構本來就沒扣過）
 */
export async function processAdmission(opts: AdmissionNotifyOptions): Promise<AdmissionNotifyResult> {
  const { db05PageId, result, orderId, customMessage, skipLine } = opts;

  // 1. 取 預約 DB05 頁
  const reservationDb05: any = opts.db05Page;
  const reservationTitle = extractTitle(reservationDb05?.properties?.["表單名稱"]?.title) || "報名";
  const eventName = opts.eventName || reservationTitle;
  const memberId = opts.memberId ?? null;

  const outcome: AdmissionNotifyResult = {
    memberId,
    eventName,
    linePushed: false,
    confirmedDb05NotionId: null,
    stockDecremented: [],
    refundStatus: null,
  };

  if (result === "accepted") {
    // 2a. 錄取 → 建立交易紀錄（若還沒建過）
    if (opts.existingConfirmedDb05) {
      outcome.confirmedDb05NotionId = opts.existingConfirmedDb05;
    } else {
      const confirmed = await createConfirmedEntries({ reservationDb05PageId: db05PageId, reservationDb05, orderId, eventName });
      outcome.confirmedDb05NotionId = confirmed.db05NotionId;
      outcome.stockDecremented = confirmed.stockDecremented;
    }
    outcome.refundStatus = null;  // 未來付款做的話：若已付款則維持 null（正常流程不退款）
  } else {
    // 2b. 未錄取 → 標記退款狀態（實際退款邏輯等金流接上後再補）
    //     現況：現場付現，尚未付款 → not_applicable
    //     未來線上付款 → pending（需手動/自動執行退款）
    //     判斷依據：若 order 的 paid_at 有值 → pending；否則 not_applicable
    const { data: order } = await supabase
      .from("orders")
      .select("paid_at")
      .eq("id", orderId)
      .maybeSingle();
    outcome.refundStatus = order?.paid_at ? "pending" : "not_applicable";
  }

  // 3. LINE 推播
  if (!skipLine && memberId) {
    try {
      await notifyRegistrationResult(memberId, eventName, result, customMessage);
      outcome.linePushed = true;
    } catch (e: any) {
      console.error("[admission-notify] LINE 推播失敗:", e.message);
    }
  }

  return outcome;
}

/**
 * 錄取時建立「報名登記 DB05 + 各筆 DB06 庫存紀錄」並扣 Supabase 庫存
 */
async function createConfirmedEntries(args: {
  reservationDb05PageId: string;
  reservationDb05?: any;
  orderId: string;
  eventName: string;
}): Promise<{ db05NotionId: string | null; stockDecremented: AdmissionNotifyResult["stockDecremented"] }> {
  const { reservationDb05PageId, reservationDb05, orderId, eventName } = args;

  // 抓 order + order_items + registrations
  const { data: order } = await supabase
    .from("orders")
    .select("id, total")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.warn(`[admission-notify] order ${orderId} 不存在`);
    return { db05NotionId: null, stockDecremented: [] };
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, item_type, item_id, quantity, price, meta")
    .eq("order_id", orderId);

  if (!orderItems || orderItems.length === 0) {
    console.warn(`[admission-notify] order ${orderId} 無明細`);
    return { db05NotionId: null, stockDecremented: [] };
  }

  const orderItemIds = orderItems.map((oi: any) => oi.id);
  const { data: regs } = await supabase
    .from("registrations")
    .select("order_item_id, attendee_name, attendee_phone, attendee_email, birth_date, dietary, emergency_contact, custom_fields")
    .in("order_item_id", orderItemIds);
  const regByOrderItemId: Record<string, any> = {};
  for (const r of regs || []) regByOrderItemId[r.order_item_id] = r;

  // 依 order_items 逐筆建 DB06 + 扣庫存
  const stockDecremented: AdmissionNotifyResult["stockDecremented"] = [];
  const db06PageIds: string[] = [];
  const orderNumber = orderId.slice(0, 8);

  for (const oi of orderItems as any[]) {
    // 用 products.id = item_id 找 notion_id + 扣庫存
    const { data: product } = await supabase
      .from("products")
      .select("id, notion_id, name, stock")
      .eq("id", oi.item_id)
      .maybeSingle();

    const productNotionDashed = toDashedNotionId(product?.notion_id || oi.meta?.productNotionId);
    const itemName = oi.meta?.name || product?.name || "明細";

    const db06Props: Record<string, any> = {
      "明細名稱": { title: [{ text: { content: itemName } }] },
      "明細類型": { select: { name: "庫存紀錄" } },
      "庫存選項": { select: { name: "出貨" } },
      "登記數量": { number: oi.quantity },
      "登記單價": { number: oi.price },
    };
    if (productNotionDashed) {
      db06Props["對應庫存"] = { relation: [{ id: productNotionDashed }] };
    }

    // Attendee 資料（票券類才有）
    const reg = regByOrderItemId[oi.id];
    if (reg) {
      const regCustom = reg.custom_fields || {};
      fillAttendeeProps(db06Props, {
        contact_name: reg.attendee_name,
        phone: reg.attendee_phone,
        email: reg.attendee_email,
        birth_date: reg.birth_date,
        dietary: reg.dietary,
        emergency_contact: reg.emergency_contact,
        ...regCustom,
      });
    }

    try {
      const db06Page: any = await createPage(DB.DB06_TRANSACTION, db06Props);
      db06PageIds.push(db06Page.id);
    } catch (e: any) {
      console.warn(`[admission-notify] DB06 建立失敗 ${itemName}:`, e.message);
      continue;
    }

    // 扣庫存
    if (product) {
      const newStock = Math.max((product.stock ?? 0) - oi.quantity, 0);
      const { error: stockErr } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", product.id);
      if (!stockErr) {
        stockDecremented.push({ productId: product.id, from: product.stock ?? 0, to: newStock });
      } else {
        console.warn(`[admission-notify] 扣庫存失敗 ${product.name}:`, stockErr.message);
      }
    }
  }

  // 建 報名登記 DB05（帶 聯絡人/attendee 資料；關聯剛建的 DB06）
  const db05Props: Record<string, any> = {
    "表單名稱": { title: [{ text: { content: `報名錄取 ${orderNumber}` } }] },
    "表單類型": { select: { name: "報名登記" } },
    "登記選項": { select: { name: "紀錄庫存" } },
    "庫存細項": { select: { name: "出貨" } },
  };

  // 從原 預約 DB05 複製聯絡人欄位（若有抓到）
  const srcProps = reservationDb05?.properties || {};
  const copyFields = ["登記聯絡人", "登記電話", "登記信箱", "登記姓名", "登記出生日", "登記飲食習慣", "對應對象", "對應協作"];
  for (const f of copyFields) {
    const v = srcProps[f];
    if (!v) continue;
    // 只處理 rich_text / date / relation
    if (v.rich_text?.length > 0) {
      db05Props[f] = { rich_text: v.rich_text.map((t: any) => ({ text: { content: t.plain_text || "" } })) };
    } else if (v.date?.start) {
      db05Props[f] = { date: { start: v.date.start } };
    } else if (v.relation?.length > 0) {
      db05Props[f] = { relation: v.relation.map((r: any) => ({ id: r.id })) };
    }
  }

  if (db06PageIds.length > 0) {
    db05Props["對應明細"] = { relation: db06PageIds.map((id) => ({ id })) };
  }

  try {
    const db05Page: any = await createPage(DB.DB05_REGISTRATION, db05Props);
    const db05NotionId = String(db05Page.id).replace(/-/g, "");
    return { db05NotionId, stockDecremented };
  } catch (e: any) {
    console.error("[admission-notify] 報名登記 DB05 建立失敗:", e.message);
    return { db05NotionId: null, stockDecremented };
  }
}
