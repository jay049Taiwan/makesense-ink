import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { createPage, DB } from "@/lib/notion";
import { fetchPersonByEmail } from "@/lib/fetch-all";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

// ── Rate limiting（結帳）：同一 IP 5 分鐘內最多 5 次 ──────────────────
const CHECKOUT_LIMIT = 5;
const CHECKOUT_WINDOW_MS = 5 * 60 * 1000;

async function checkCheckoutRateLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - CHECKOUT_WINDOW_MS);
  try {
    const { count } = await supabase
      .from("line_message_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", `ip:${ip}`)
      .eq("message_type", "checkout")
      .gte("created_at", windowStart.toISOString());
    return (count ?? 0) < CHECKOUT_LIMIT;
  } catch {
    return true; // 查詢失敗時放行，不因此封鎖正常訂單
  }
}

async function logCheckoutAttempt(ip: string): Promise<void> {
  try {
    await supabase.from("line_message_log").insert({
      user_id: `ip:${ip}`,
      message_type: "checkout",
      message_text: "checkout_attempt",
    });
  } catch { /* fire-and-forget */ }
}

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
    .select("id, notion_id, name, stock, price, category")
    .eq("notion_id", normalized)
    .maybeSingle();
  if (byNotion.data) return byNotion.data;
  // 再試 Supabase id（UUID）比對
  const byId = await supabase
    .from("products")
    .select("id, notion_id, name, stock, price, category")
    .eq("id", input)
    .maybeSingle();
  return byId.data;
}

async function resolveEvent(input: string) {
  const normalized = normalizeNotionId(input);
  const byNotion = await supabase
    .from("events")
    .select("id, notion_id, title, price")
    .eq("notion_id", normalized)
    .maybeSingle();
  if (byNotion.data) return byNotion.data;
  const byId = await supabase
    .from("events")
    .select("id, notion_id, title, price")
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
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const allowed = await checkCheckoutRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "太多請求，請稍後再試" },
      { status: 429 }
    );
  }
  logCheckoutAttempt(ip); // fire-and-forget，不 await

  try {
    const body = await req.json();
    const { items, contact, delivery, note, memberEmail, source, refundInfo, pointDiscount } = body as {
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
        registrations?: Record<string, string>[];
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
      pointDiscount?: number; // 點數折抵金額（1點=1元）
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

    // 2. 解析每個 item（從 Supabase 取得真實商品/活動資訊，含 server-side 價格）
    //    必須在計算總金額前執行，確保使用資料庫定價而非 client 傳入值
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

    // Fail fast：找不到對應商品/活動 → 建立訂單前就回錯，避免產出金額為 0 的孤兒訂單
    const unresolved = resolvedItems.filter((r) => !r.supabaseId);
    if (unresolved.length > 0) {
      console.error("找不到對應的商品/活動:", unresolved.map((r) => r.item.name));
      return NextResponse.json(
        { error: `找不到商品：${unresolved.map((r) => r.item.name).join(", ")}` },
        { status: 400 }
      );
    }

    // 3. 計算總金額（使用 Supabase 真實定價，完全忽略 client 傳入的 price）
    const subtotal = resolvedItems.reduce((sum, { item, productInfo, eventInfo }) => {
      const serverPrice = productInfo?.price ?? (eventInfo as any)?.price ?? 0;
      return sum + serverPrice * item.qty;
    }, 0);

    // 點數折抵驗證（server-side 重算，不信任 client 傳入值）
    const maxDiscount = Math.floor(subtotal * 0.3);
    const validatedPointDiscount = pointDiscount
      ? Math.min(Math.max(0, Math.floor(pointDiscount)), maxDiscount)
      : 0;
    const total = Math.max(0, subtotal - validatedPointDiscount);

    // 4. 建立訂單（V2：有票券 → reservation 模式，pending 等錄取；純商品 → direct 模式，直接 confirmed）
    const hasTickets = items.some((i) => ["走讀", "講座", "市集", "空間", "諮詢"].includes(i.type));
    const orderMode: "reservation" | "direct" = hasTickets ? "reservation" : "direct";
    const orderStatus = hasTickets ? "pending" : "confirmed";

    // 4.1 庫存預檢（direct 模式）：在建立訂單前確認庫存足夠，避免孤兒訂單
    if (orderMode === "direct") {
      const outOfStock: string[] = [];
      for (const { productInfo, item } of resolvedItems) {
        if (!productInfo) continue;
        if ((productInfo.stock ?? 0) < item.qty) {
          outOfStock.push(item.name);
        }
      }
      if (outOfStock.length > 0) {
        return NextResponse.json(
          { error: `庫存不足，以下商品無法結帳：${outOfStock.join("、")}`, outOfStock },
          { status: 409 }
        );
      }
    }

    // reservation 模式：退款資訊 + 重複報名防止
    if (orderMode === "reservation") {
      if (!refundInfo || !refundInfo.method) {
        return NextResponse.json({ error: "活動報名需提供退款資訊" }, { status: 400 });
      }

      // 重複報名防止：同一會員不可對同一活動有 pending/confirmed 訂單
      if (memberId) {
        const ticketEventIds = resolvedItems
          .filter((r) => r.eventInfo)
          .map((r) => r.eventInfo!.id);

        if (ticketEventIds.length > 0) {
          // 找該會員所有非取消的 reservation 訂單明細，看有沒有同樣的 eventId
          const { data: existingItems } = await supabase
            .from("order_items")
            .select("id, meta, orders!inner(member_id, status)")
            .eq("orders.member_id", memberId)
            .in("orders.status", ["pending", "confirmed"])
            .eq("item_type", "走讀"); // reservation 類型

          const existingEventIds = (existingItems || [])
            .map((i: any) => i.meta?.eventId)
            .filter(Boolean);

          const duplicates = resolvedItems
            .filter((r) => r.eventInfo && existingEventIds.includes(r.eventInfo.id))
            .map((r) => r.item.name);

          if (duplicates.length > 0) {
            return NextResponse.json(
              { error: `您已報名過以下活動，不可重複報名：${duplicates.join("、")}` },
              { status: 409 }
            );
          }
        }
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
        points_used: validatedPointDiscount || 0,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("建立訂單失敗:", orderError);
      return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
    }

    // 5. 寫入 order_items（price 也使用 server-side 真實定價）
    const orderItems = resolvedItems.map(({ item, supabaseId, productInfo, eventInfo }) => ({
      order_id: order.id,
      item_type: item.type,
      item_id: supabaseId!,
      quantity: item.qty,
      price: productInfo?.price ?? (eventInfo as any)?.price ?? 0,
      meta: {
        name: item.name,
        subtitle: item.subtitle || null,
        eventId: item.eventId || null,
        productId: item.productId || null,
        productNotionId: productInfo?.notion_id || (item.productId ? normalizeNotionId(item.productId) : null),
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

    // 4.5 扣商品庫存（V3：原子 RPC，防止並發超賣 + 雙重扣庫存）
    //   - 使用 decrement_stock(p_id, qty) Postgres function（原子 UPDATE ... RETURNING）
    //   - reservation 模式不在此扣，等錄取後才扣
    //   - DB06 sync 在 n8n 偵測到出貨記錄時會 skip（避免雙重扣）
    if (orderMode === "direct") {
      for (const { supabaseId, productInfo, item } of resolvedItems) {
        if (!productInfo || !supabaseId) continue;
        const { data: newStock, error: stockError } = await supabase
          .rpc("decrement_stock", { p_id: supabaseId, qty: item.qty });
        if (stockError) {
          console.warn(`[checkout] 扣庫存失敗 ${productInfo.name}:`, stockError.message);
        } else if (newStock === null) {
          // RPC 回傳 null = 庫存不足，無法扣除（理論上前端應已擋住，這裡做後備記錄）
          console.warn(`[checkout] 庫存不足，無法扣除 ${productInfo.name} x${item.qty}`);
        }
      }
    }

    // 4.6 寫入點數流水帳（會員專屬，3 種類型：消費 / 書籍 / 付費文章）
    //     reservation 模式不寫（等錄取後才算數）；訪客結帳沒 memberId 也不寫
    if (memberId && orderMode === "direct") {
      try {
        const ledgerRows: Array<{ member_id: string; type: string; value: number; source_table: string; source_id: string; note?: string }> = [];

        // (a) 消費積點：10 元 = 1 點
        if (total > 0) {
          ledgerRows.push({
            member_id: memberId, type: "消費積點", value: Math.floor(total / 10),
            source_table: "orders", source_id: order.id,
            note: `訂單 #${order.id.slice(0, 8)}`,
          });
        }

        // (b) 書籍本數：累計 category='商品/選書' 的數量
        let bookCount = 0;
        const purchasedProductSupabaseIds: string[] = [];
        for (const { item, productInfo } of resolvedItems) {
          if (!productInfo) continue;
          purchasedProductSupabaseIds.push(productInfo.id);
          if (typeof productInfo.category === "string" && productInfo.category.startsWith("商品/選書")) {
            bookCount += item.qty;
          }
        }
        if (bookCount > 0) {
          ledgerRows.push({
            member_id: memberId, type: "書籍本數", value: bookCount,
            source_table: "orders", source_id: order.id,
            note: `${bookCount} 本`,
          });
        }

        // (c) 付費文章：本次購買的商品如果是某些文章的「對應商品」→ 解鎖那些文章
        if (purchasedProductSupabaseIds.length > 0) {
          const { data: unlocked } = await supabase
            .from("articles")
            .select("id")
            .in("related_product_id", purchasedProductSupabaseIds)
            .eq("status", "published");
          const articleCount = (unlocked || []).length;
          if (articleCount > 0) {
            ledgerRows.push({
              member_id: memberId, type: "付費文章", value: articleCount,
              source_table: "orders", source_id: order.id,
              note: `解鎖 ${articleCount} 篇`,
            });
          }
        }

        // (d) 距離行程：走讀活動的距離（依 eventId 去重後查 events.distance_km）
        const walkEventIds = [...new Set(
          resolvedItems
            .filter(({ item }) => item.type === "走讀" && item.eventId)
            .map(({ item }) => item.eventId as string)
        )];
        if (walkEventIds.length > 0) {
          const { data: walkEvents } = await supabase
            .from("events")
            .select("notion_id, distance_km")
            .in("notion_id", walkEventIds);
          const totalDistanceKm = (walkEvents || []).reduce(
            (sum, e) => sum + (Number(e.distance_km) || 0), 0
          );
          if (totalDistanceKm > 0) {
            ledgerRows.push({
              member_id: memberId, type: "距離行程", value: totalDistanceKm,
              source_table: "orders", source_id: order.id,
              note: `${totalDistanceKm} km`,
            });
          }
        }

        if (ledgerRows.length > 0) {
          const { error: ledgerErr } = await supabase.from("point_ledger").insert(ledgerRows);
          if (ledgerErr) console.warn("[checkout] 寫 point_ledger 失敗:", ledgerErr.message);
        }
      } catch (e: any) {
        console.warn("[checkout] 點數寫入錯誤:", e?.message);
      }
    }

    // 4.7 扣除使用的點數（負向 ledger 項目）
    //   - direct 或 reservation 結帳若使用了點數折抵，立即扣除
    //   - reservation 取消時若需退回點數，由退款流程另行補正向 ledger
    if (validatedPointDiscount > 0 && memberId) {
      try {
        await supabase.from("point_ledger").insert({
          member_id: memberId,
          type: "點數折抵",
          value: -validatedPointDiscount,
          source_table: "orders",
          source_id: order.id,
          note: `訂單 #${order.id.slice(0, 8)} 折抵 ${validatedPointDiscount} 點`,
        });
      } catch (e: any) {
        console.warn("[checkout] 點數扣除失敗:", e?.message);
      }
    }

    // 5. 建立報名資料（registrations 陣列 → 每人一筆；fallback 到單筆 registration）
    const registrationItems = items.filter((i) =>
      (i.registrations && i.registrations.length > 0) ||
      (i.registration && Object.keys(i.registration).length > 0)
    );
    if (registrationItems.length > 0 && insertedItems) {
      const regRows: any[] = [];
      for (const item of registrationItems) {
        const matchedOrderItem = insertedItems.find(
          (oi: any) => oi.meta?.name === item.name && oi.item_type === item.type
        );
        if (!matchedOrderItem) continue;
        const regs: Record<string, string>[] = (item.registrations && item.registrations.length > 0)
          ? item.registrations
          : [item.registration as Record<string, string>];
        for (const r of regs) {
          regRows.push({
            order_item_id: matchedOrderItem.id,
            attendee_name: (r as any).name || (r as any).contact_name || contact.name,
            attendee_phone: (r as any).phone || contact.phone,
            attendee_email: (r as any).email || contact.email,
            birth_date: (r as any).birth_date || null,
            dietary: (r as any).dietary || null,
            emergency_contact: (r as any).emergency_contact || null,
            custom_fields: r || {},
          });
        }
      }
      if (regRows.length > 0) {
        const { error: regError } = await supabase.from("registrations").insert(regRows);
        if (regError) console.error("建立報名資料失敗:", regError);
      }
    }

    // 6. 推播 LINE 訂單確認（await 以免 serverless 終止）
    if (memberId) {
      try {
        const { notifyOrderCreated } = await import("@/lib/line-notifications");
        await notifyOrderCreated(
          order.id,
          memberId,
          resolvedItems.map(({ item, productInfo, eventInfo }) => ({
            name: item.name,
            qty: item.qty,
            price: productInfo?.price ?? (eventInfo as any)?.price ?? 0,
          })),
          total,
          hasTickets
        );
      } catch (e: any) {
        console.warn("[checkout] LINE notify failed:", e?.message);
      }
    }

    // 6b. 訂單確認 Email（不論是否有 LINE，確保用戶有收據）
    if (email) {
      try {
        const { sendOrderConfirmationEmail } = await import("@/lib/send-order-email");
        await sendOrderConfirmationEmail({
          to: email,
          contactName: contact.name,
          orderId: order.id,
          items: resolvedItems.map(({ item, productInfo, eventInfo }) => ({
            name: item.name,
            subtitle: item.subtitle,
            qty: item.qty,
            price: productInfo?.price ?? (eventInfo as any)?.price ?? item.price ?? 0,
          })),
          total,
          hasTickets,
          delivery,
        });
      } catch (e: any) {
        console.warn("[checkout] email failed:", e?.message);
      }
    }

    // 6c. 推播給合作廠商（涉及他們商品/活動的訂單）
    try {
      const { notifyPartnerOnOrder } = await import("@/lib/line-notifications");
      // 把 itemId 從剛建立的 orderItems 拿（含 Supabase 端的 product/event UUID）
      // item_type 用中文（商品/走讀/市集/講座/...），轉成 partner 通知用的 product/event
      const partnerItems = orderItems
        .map((row) => ({
          name: (row.meta as any)?.name || "—",
          qty: row.quantity,
          price: row.price,
          itemId: row.item_id as string,
          itemType: (row.item_type === "商品" ? "product" : "event") as "product" | "event",
        }))
        .filter((i) => i.itemId);
      if (partnerItems.length > 0) {
        await notifyPartnerOnOrder(order.id, partnerItems);
      }
    } catch (e: any) {
      console.warn("[checkout] partner LINE notify failed:", e?.message);
    }

    // 7. 直接在 Notion 建 DB06（每件商品一筆）+ DB05（訂單標頭，對應明細指向 DB06）
    //    欄位名已對照 Notion live schema 確認：
    //      DB05: 內容名稱(title), 內容類型=報名登記, 登記類別=紀錄庫存（reservation 改用 填寫報名+報名選項=活動）, 庫存選項=出貨, 對應明細→DB06
    //      DB06: 明細名稱(title), 明細類型=報名登記, 登記數量, 登記單價, 對應庫存→DB07
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
      const primaryReg = firstTicketItem?.item.registrations?.[0] || firstTicketItem?.item.registration || {};

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

      // 7-1. DB06 明細
      //   reservation：報名類訂單（DB05 登記類別=填寫報名 + 報名選項=活動），不連 DB07（對應庫存留空，避免跟真實庫存混淆）
      //   direct：庫存類訂單（DB05 登記類別=紀錄庫存 + 庫存選項=出貨）+ 對應庫存→DB07（實際扣庫存）
      //   ※ DB06 寫入時不寫 登記類別 / 庫存選項 欄位（登記類別屬 DB05 不在 DB06）
      const db06PageIds: string[] = [];
      for (const { item, productInfo } of resolvedItems) {
        const productNotionDashed = toDashedNotionId(productInfo?.notion_id || item.productId);

        // 有 registrations 陣列 → 每人一筆 DB06（qty=1）；否則維持一筆 DB06（qty=item.qty）
        const regs = (item.registrations && item.registrations.length > 0)
          ? item.registrations
          : (item.registration && Object.keys(item.registration).length > 0 ? [item.registration] : [null]);

        for (let i = 0; i < regs.length; i++) {
          const reg = regs[i];
          const perPersonQty = regs.length > 1 ? 1 : item.qty;
          const titleSuffix = regs.length > 1 ? `（${i + 1}/${regs.length}）` : "";

          const db06Props: Record<string, any> = {
            "明細名稱": { title: [{ text: { content: item.name + titleSuffix } }] },
            "明細類型": { select: { name: "報名登記" } },
            "登記數量": { number: perPersonQty },
            "登記單價": { number: item.price },
          };
          // DB05 登記類別=填寫報名 + 報名選項=活動；DB06 不寫入避免 schema 不匹配
          if (orderMode === "direct") {
            if (productNotionDashed) {
              db06Props["對應庫存"] = { relation: [{ id: productNotionDashed }] };
            }
          }
          if (reg && Object.keys(reg).length > 0) {
            fillAttendeeProps(db06Props, reg, contact.name);
          }

          try {
            const db06Page = await createPage(DB.DB06_TRANSACTION, db06Props);
            db06PageIds.push((db06Page as any).id as string);
          } catch (e: any) {
            console.warn(`[checkout] DB06 create failed for ${item.name}${titleSuffix}:`, e.message);
          }
        }
      }

      // 7-2. 建 DB05 訂單標頭
      //   兩種模式 內容類型 都用「報名登記」；用 登記類別 做區分
      //   reservation 模式：登記類別=填寫報名 + 報名選項=活動（等錄取後才建 confirmed DB05）
      //   direct 模式：登記類別=紀錄庫存（立刻交付）
      const titlePrefix = orderMode === "reservation" ? "預約" : "官網訂單";
      const db05Props: Record<string, any> = {
        "內容名稱": { title: [{ text: { content: `${titlePrefix} ${orderNumber}` } }] },
        "內容類型": { select: { name: "報名登記" } },
        "登記類別": { select: { name: orderMode === "reservation" ? "填寫報名" : "紀錄庫存" } },
      };
      if (orderMode === "direct") {
        db05Props["庫存選項"] = { select: { name: "出貨" } };
      }
      if (orderMode === "reservation") {
        db05Props["報名選項"] = { select: { name: "活動" } };
      }
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
