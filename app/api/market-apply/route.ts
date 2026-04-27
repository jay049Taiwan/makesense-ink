import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

const N8N_MARKET_APPLY_WEBHOOK = process.env.N8N_MARKET_APPLY_WEBHOOK || "https://makesense.zeabur.app/webhook/market-apply";

/**
 * POST /api/market-apply
 * body: { eventId, vendorName, contactName, contactPhone, contactEmail,
 *         intro, mainProducts, boothNeeds (string[]), notes,
 *         selectedPhotoIds (string[]) }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, name, phone, email")
    .eq("email", email)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  const {
    eventId,
    vendorName,
    contactName,
    contactPhone,
    contactEmail,
    intro,
    mainProducts,
    boothNeeds,
    notes,
    selectedPhotoIds,
  } = body;

  if (!eventId || !vendorName) {
    return NextResponse.json({ error: "缺少必填欄位（活動 / 攤商名稱）" }, { status: 400 });
  }

  // 驗證 event 是市集類型
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, notion_id, title, event_type, event_date, location")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  if (!event.event_type?.includes("市集") && event.event_type !== "園遊市集") {
    return NextResponse.json({ error: "此活動不是市集，無法申請擺攤" }, { status: 400 });
  }

  // 寫入申請
  const { data: app, error: insertErr } = await supabaseAdmin
    .from("market_applications")
    .insert({
      event_id: eventId,
      member_id: member.id,
      vendor_name: vendorName,
      contact_name: contactName || member.name,
      contact_phone: contactPhone || member.phone,
      contact_email: contactEmail || member.email,
      intro,
      main_products: mainProducts,
      booth_needs: Array.isArray(boothNeeds) ? boothNeeds : [],
      notes,
      selected_photo_ids: Array.isArray(selectedPhotoIds) ? selectedPhotoIds : [],
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[market-apply] insert failed:", insertErr);
    return NextResponse.json({ error: "申請寫入失敗：" + insertErr.message }, { status: 500 });
  }

  // 撈所選照片的 URL（給 n8n / Notion 用）
  const photoUrlsByCategory: Record<string, string[]> = { logo: [], image: [], product: [], activity: [], performance: [] };
  if (Array.isArray(selectedPhotoIds) && selectedPhotoIds.length > 0) {
    const { data: photos } = await supabaseAdmin
      .from("vendor_photos")
      .select("id, category, url")
      .in("id", selectedPhotoIds)
      .eq("member_id", member.id);
    for (const p of photos || []) {
      if (photoUrlsByCategory[p.category]) photoUrlsByCategory[p.category].push(p.url);
    }
  }

  // 推 n8n webhook（fire-and-forget，失敗不擋申請成功）
  try {
    fetch(N8N_MARKET_APPLY_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: app.id,
        event: {
          id: event.id,
          notion_id: event.notion_id,
          title: event.title,
          date: event.event_date,
          location: event.location,
        },
        applicant: {
          member_id: member.id,
          email: member.email,
        },
        vendor_name: vendorName,
        contact: {
          name: contactName || member.name,
          phone: contactPhone || member.phone,
          email: contactEmail || member.email,
        },
        intro,
        main_products: mainProducts,
        booth_needs: Array.isArray(boothNeeds) ? boothNeeds : [],
        notes,
        photos: photoUrlsByCategory,
      }),
    }).catch((e) => console.warn("[market-apply] n8n webhook fail:", e?.message));
  } catch (e: any) {
    console.warn("[market-apply] n8n webhook err:", e?.message);
  }

  return NextResponse.json({ applicationId: app.id, status: "pending" });
}
