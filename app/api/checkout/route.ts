import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { createPage, DB } from "@/lib/notion";
import { fetchPersonByEmail } from "@/lib/fetch-all";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

// 把 32 hex（無 dash）Notion ID 轉成 UUID 8-4-4-4-12（relation 必須帶 dash）
function toDashedNotionId(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/-/g, "").toLowerCase();
  if (clean.length !== 32) return null;
  return clean.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

/**
 * 把 notion_id（32 hex, no dash）轉成 UUID 格式（8-4-4-4-12）
 * 方便跟 products.notion_id（無 dash）比對
 */
function normalizeNotionId(id: string): string {
  const clean = id.replace(/-/g, "").toLowerCase();
  return clean;
}

/**
 * 查商品：接受 notion_id（無 dash）、UUID（有 dash）、或 Supabase id（UUID）
 * 回傳 { id, notion_id, name, stock, price } 或 null
 */
async function resolveProduct(input: string) {
  const normalized = normalizeNotionId(input);
  // 先試 notion_id 比對
  const byNotion = await supabase
    .from("products")
    .select("id, notion_id, name, stock, price")
    .eq("notion_id", normalized)
    .maybeSingle();
  if (byNotion.data) return byNotion.data;
  // 再試 Supabase id（UUID）比對
  const byId = await supabase
    .from("products")
    .select("id, notion_id, name, stock, price")
    .eq("id", input)
    .maybeSingle();
  return byId.data;
}

async function resolveEvent(input: string) {
  const normalized = normalizeNotionId(input);
  const byNotion = await supabase
    .from("events")
    .select("id, notion_id, title")
    .eq("notion_id", normalized)
    .maybeSingle();
  if (byNotion.data) return byNotion.data;
  const byId = await supabase
    .from("events")
    .select("id, notion_id, title")
    .eq("id", input)
    .maybeSingle();
  return byId.data;
}

/**
 * POST /api/checkout
 * 接收購物車資料 → 寫入 Supabase orders + order_items + registrations
 * + 扣 products.stock
 * + 非同步呼叫 n8n webhook 在 Notion 建 DB05+DB06
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, contact, delivery, note, memberEmail, source, refundInfo } = body as {
      items: {
        id: string;
        name: string;
        subtitle?: string;
        type: string;
        price: number;
        qty: number;
        eventId?: string;
        productId?: string;
        meta?: Record<string, string>;
        registration?: Record<string, string>;
      }[];
      contact: { name: string; phone: string; email: string };
      delivery: string;
      note?: string;
      memberEmail?: string;
      source?: "web" | "liff" | "telegram" | "preorder";
      /**
       * V2：有票券的訂單要提供退款資訊（未來金流接上後使用）
       *   method: "original" → 退回原付款帳戶
       *   method: "custom"   → 指定退款帳戶，需填 bank_name/account_number/account_holder
       */
      refundInfo?: {
        method: "original" | "custom";
        bank_name?: string;
        account_number?: string;
        account_holder?: string;
      };
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
    }

    // 1. 找或建會員（優先用 server-side session email → memberEmail → contact.email）
    //    避免 client 沒傳 memberEmail 時，訂單變匿名（member_id=null）
    let memberId: string | null = null;
    const session = await auth();
    const sessionEmail = normalizeEmail(session?.user?.email) || null;
    const email = normalizeEmail(sessionEmail || memberEmail || contact.email) || null;
    if (email) {
      // maybeSingle() 0 筆時回 null 不報錯；比 single() 安全
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingMember) {
        memberId = existingMember.id;
        // 結帳時順手回寫 name/phone（下次 placeholder 會用新的）
        const memberUpdates: Record<string, any> = {};
        if (contact.name && contact.name.trim()) memberUpdates.name = contact.name.trim();
        if (contact.phone && contact.phone.trim()) memberUpdates.phone = contact.phone.trim();
        if (Object.keys(memberUpdates).length > 0) {
          await supabase.from("members").update(memberUpdates).eq("id", memberId);
        }
      } else {
        const { data: newMember, error: memberError } = await supabase
          .from("members")
          .insert({ email, name: contact.name, phone: contact.phone })
          .select("id")
          .single();
        if (memberError) {
          console.error("建立會員失敗:", memberError);
          return NextResponse.json({ error: "建立會員失敗" }, { status: 500 });
        }
        memberId = newMember.id;
      }
    }

    // 2. 計算總金額
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    // 3. 建立訂單（V2：有票券 → reservation 模式，pending 等錄取；純商品 → direct 模式，直接 confirmed）
    const hasTickets = items.some((i) => ["走讀", "講座", "市集", "空間", "諮詢"].includes(i.type));
    const orderMode: "reservation" | "direct" = hasTickets ? "reservation" : "direct";
    const orderStatus = hasTickets ? "pending" : "confirmed";

    // reservation 模式要求退款資訊
    if (orderMode === "reservation") {
      if (!refundInfo || !refundInfo.method) {
        return NextResponse.json({ error: "活動報名需提供退款資訊" }, { status: 400 });
      }
      if (refundInfo.method === "custom") {
        const missing = ["bank_name", "account_number", "account_holder"].filter(
          (k) => !((refundInfo as any)[k] || "").trim()
        );
        if (missing.length > 0) {
          return NextResponse.json({ error: `退款帳戶資訊不完整：${missing.join(", ")}` }, { status: 400 });
        }
      }
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        member_id: memberId,
        status: orderStatus,
        total,
        source: source || "web",
        refund_info: orderMode === "reservation" ? refundInfo : null,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("建立訂單失敗:", orderError);
      return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
    }

    // 4. 解析每個 item 的 Supabase UUID（item_id 欄位型別是 UUID，不能存 notion_id）
    //    同時記下 products/events 的完整資訊供後續扣庫存與 n8n webhook 使用
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        let supabaseId: string | null = null;
        let productInfo: Awaited<ReturnType<typeof resolveProduct>> | null = null;
        let eventInfo: Awaited<ReturnType<typeof resolveEvent>> | null = null;

        if (item.productId) {
          productInfo = await resolveProduct(item.productId);
          if (productInfo) supabaseId = productInfo.id;
        }
        if (!supabaseId && item.eventId) {
          eventInfo = await resolveEvent(item.eventId);
          if (eventInfo) supabaseId = eventInfo.id;
        }
        if (!supabaseId && item.id) {
          // fallback：item.id 可能已是 UUID
          productInfo = await resolveProduct(item.id);
          if (productInfo) {
            supabaseId = productInfo.id;
          } else {
            eventInfo = await resolveEvent(item.id);
            if (eventInfo) supabaseId = eventInfo.id;
          }
        }

        return { item, supabaseId, productInfo, eventInfo };
      })
    );

    // 檢查是否有找不到對應的 item
    const unresolved = resolvedItems.filter((r) => !r.supabaseId);
    if (unresolved.length > 0) {
      console.error("找不到對應的商品/活動:", unresolved.map((r) => r.item.name));
      return NextResponse.json(
        { error: `找不到商品：${unresolved.map((r) => r.item.name).join(", ")}` },
        { status: 400 }
      );
    }

    const orderItems = resolvedItems.map(({ item, supabaseId, productInfo }) => ({
      order_id: order.id,
      item_type: item.type,
      item_id: supabaseId!,
      quantity: item.qty,
      price: item.price,
      meta: {
        name: item.name,
        subtitle: item.subtitle || null,
        eventId: item.eventId || null,
        productId: item.productId || null,
        productNotionId: productInfo?.notion_id || null,
        ...item.meta,
      },
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select("id, item_type, meta");

    if (itemsError) {
      console.error("建立訂單明細失敗:", itemsError);
      return NextResponse.json({ error: "建立訂單明細失敗" }, { status: 500 });
    }

    // 4.5 扣商品庫存（V2：僅 direct 模式即時扣；reservation 模式等錄取後才扣）
    if (orderMode === "direct") {
      for (const { supabaseId, productInfo, item } of resolvedItems) {
        if (!productInfo || !supabaseId) continue;
        const newStock = Math.max((productInfo.stock ?? 0) - item.qty, 0);
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", supabaseId);
        if (stockError) {
          console.warn(`[checkout] 扣庫存失敗 ${productInfo.name}:`, stockError.message);
        }
      }
    }

    // 5. 建立報名資料（有 registration 的項目）
    const registrationItems = items.filter((i) => i.registration && Object.keys(i.registration).length > 0);
    if (registrationItems.length > 0 && insertedItems) {
      const registrations = registrationItems.map((item) => {
        const matchedOrderItem = insertedItems.find(
          (oi: any) => oi.meta?.name === item.name && oi.item_type === item.type
        );
        return {
          order_item_id: matchedOrderItem?.id,
          attendee_name: item.registration?.contact_name || contact.name,
          attendee_phone: item.registration?.phone || contact.phone,
          attendee_email: item.registration?.email || contact.email,
          birth_date: item.registration?.birth_date || null,
          dietary: item.registration?.dietary || null,
          emergency_contact: item.registration?.emergency_contact || null,
          custom_fields: item.registration || {},
        };
      }).filter((r) => r.order_item_id);

      if (registrations.length > 0) {
        const { error: regError } = await supabase
          .from("registrations")
          .insert(registrations);
        if (regError) {
          console.error("建立報名資料失敗:", regError);
        }
      }
    }

    // 6. 推播 LINE 訂單確認（await 以免 serverless 終止）
    if (memberId) {
      try {
        const { notifyOrderCreated } = await import("@/lib/line-notifications");
        await notifyOrderCreated(
          order.id,
          memberId,
          items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          total,
          hasTickets
        );
      } catch (e: any) {
        console.warn("[checkout] LINE notify failed:", e?.message);
      }
    }

    // 7. 直接在 Notion 建 DB06（每件商品一筆）+ DB05（訂單標頭，對應明細指向 DB06）
    //    欄位名已對照 Notion live schema 確認：
    //      DB05: 表單名稱(title), 表單類型=報名登記, 登記選項=紀錄庫存, 庫存細項=出貨, 對應明細→DB06
    //      DB06: 明細名稱(title), 明細類型=庫存紀錄, 登記數量, 登記單價, 對應庫存→DB07
    //    改用 await：Vercel serverless 會在 response 後終止執行，fire-and-forget 跑不完
    //    失敗不影響結帳回應（包 try/catch）
    try {
      const orderNumber = order.id.slice(0, 8);

      // 7-0. 預先解析 DB08（報名者→人物） + DB04（主要活動）的 Notion page id
      let contactDb08PageId: string | null = null;
      if (email) {
        try {
          const person = await fetchPersonByEmail(email);
          if (person?.id) contactDb08PageId = person.id; // 已是 dashed UUID
        } catch (e: any) {
          console.warn("[checkout] fetchPersonByEmail failed:", e.message);
        }
      }

      // 主要活動 = 第一個票券類 item 的 eventId（可能為 null，例如純商品訂單）
      const firstTicketItem = resolvedItems.find(({ item }) => !!item.eventId);
      const mainEventNotionDashed = toDashedNotionId(firstTicketItem?.item.eventId || firstTicketItem?.eventInfo?.notion_id);

      // 主要報名者（A）的報名資料：優先用第一張票的 registration，沒有就 fallback 聯絡人資料
      const primaryReg = firstTicketItem?.item.registration || {};

      // 共用：把 attendee 資料塞進 properties
      function fillAttendeeProps(p: Record<string, any>, reg: Record<string, string> | undefined, fallbackName?: string) {
        const r = reg || {};
        const name = r.contact_name || r.name || fallbackName;
        if (name) p["登記姓名"] = { rich_text: [{ text: { content: name } }] };
        if (r.phone) p["登記電話"] = { rich_text: [{ text: { content: r.phone } }] };
        if (r.email) p["登記信箱"] = { rich_text: [{ text: { content: r.email } }] };
        if (r.birth_date) p["登記出生日"] = { date: { start: r.birth_date } };
        if (r.dietary) p["登記飲食習慣"] = { rich_text: [{ text: { content: r.dietary } }] };
        if (r.emergency_contact) p["登記備註"] = { rich_text: [{ text: { content: `緊急聯絡：${r.emergency_contact}` } }] };
      }

      // 7-1. DB06 明細（V2：僅 direct 模式建；reservation 模式等錄取時才建）
      const db06PageIds: string[] = [];
      if (orderMode === "direct") {
        for (const { item, productInfo } of resolvedItems) {
          // productInfo 可能為 null（票券類商品常沒在 Supabase products），
          // 此時 fallback 回 item.productId（前端帶來的 DB07 notion_id）
          const productNotionDashed = toDashedNotionId(productInfo?.notion_id || item.productId);

          const db06Props: Record<string, any> = {
            "明細名稱": { title: [{ text: { content: item.name } }] },
            "明細類型": { select: { name: "庫存紀錄" } },
            "庫存選項": { select: { name: "出貨" } },
            "登記數量": { number: item.qty },
            "登記單價": { number: item.price },
          };
          if (productNotionDashed) {
            db06Props["對應庫存"] = { relation: [{ id: productNotionDashed }] };
          }
          if (item.registration && Object.keys(item.registration).length > 0) {
            fillAttendeeProps(db06Props, item.registration, contact.name);
          }

          try {
            const db06Page = await createPage(DB.DB06_TRANSACTION, db06Props);
            db06PageIds.push((db06Page as any).id as string);
          } catch (e: any) {
            console.warn(`[checkout] DB06 create failed for ${item.name}:`, e.message);
          }
        }
      }

      // 7-2. 建 DB05 訂單標頭
      //   reservation 模式：表單類型=預約報名（無 DB06 relation，等錄取後才有）
      //   direct 模式：表單類型=報名登記（含 DB06 對應明細）
      const formType = orderMode === "reservation" ? "預約報名" : "報名登記";
      const titlePrefix = orderMode === "reservation" ? "預約" : "官網訂單";
      // 登記選項：reservation 用「預約報名」、direct 用「紀錄庫存」
      const registerOption = orderMode === "reservation" ? "預約報名" : "紀錄庫存";
      const db05Props: Record<string, any> = {
        "表單名稱": { title: [{ text: { content: `${titlePrefix} ${orderNumber}` } }] },
        "表單類型": { select: { name: formType } },
        "登記選項": { select: { name: registerOption } },
        "庫存細項": { select: { name: "出貨" } },
      };
      // 訂單聯絡人（A）層級
      if (contact.name) db05Props["登記聯絡人"] = { rich_text: [{ text: { content: contact.name } }] };
      if (contact.phone) db05Props["登記電話"] = { rich_text: [{ text: { content: contact.phone } }] };
      if (email) db05Props["登記信箱"] = { rich_text: [{ text: { content: email } }] };
      if (note) db05Props["登記備註"] = { rich_text: [{ text: { content: note } }] };
      // A 的 attendee 資料（若有填）
      fillAttendeeProps(db05Props, primaryReg, contact.name);
      // Relations
      if (db06PageIds.length > 0) {
        db05Props["對應明細"] = { relation: db06PageIds.map((id) => ({ id })) };
      }
      if (contactDb08PageId) {
        db05Props["對應對象"] = { relation: [{ id: contactDb08PageId }] };
      }
      if (mainEventNotionDashed) {
        db05Props["對應協作"] = { relation: [{ id: mainEventNotionDashed }] };
      }

      const db05Page: any = await createPage(DB.DB05_REGISTRATION, db05Props);

      // 回寫 orders.notion_db05_id，方便之後 sync/single 以 notion_id 精確查訂單
      if (db05Page?.id) {
        const db05NotionId = String(db05Page.id).replace(/-/g, "");
        await supabase.from("orders").update({ notion_db05_id: db05NotionId }).eq("id", order.id);
      }
    } catch (e: any) {
      console.warn("[checkout] Notion writeback failed:", e.message);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: orderStatus,
      total,
      itemCount: items.length,
    });
  } catch (err) {
    console.error("結帳 API 錯誤:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
