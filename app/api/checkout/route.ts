import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/checkout
 * 接收購物車資料 → 寫入 Supabase orders + order_items + registrations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, contact, delivery, note, memberEmail } = body as {
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
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
    }

    // 1. 找或建會員
    let memberId: string | null = null;
    const email = memberEmail || contact.email;
    if (email) {
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("email", email)
        .single();

      if (existingMember) {
        memberId = existingMember.id;
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

    // 3. 建立訂單
    const hasTickets = items.some((i) => ["走讀", "講座", "市集", "空間", "諮詢"].includes(i.type));
    const orderStatus = hasTickets ? "pending" : "confirmed"; // 有票券需審核

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        member_id: memberId,
        status: orderStatus,
        total,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("建立訂單失敗:", orderError);
      return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
    }

    // 4. 建立訂單明細
    const orderItems = items.map((item) => ({
      order_id: order.id,
      item_type: item.type,
      item_id: item.productId || item.eventId || item.id,
      quantity: item.qty,
      price: item.price,
      meta: {
        name: item.name,
        subtitle: item.subtitle || null,
        eventId: item.eventId || null,
        productId: item.productId || null,
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
