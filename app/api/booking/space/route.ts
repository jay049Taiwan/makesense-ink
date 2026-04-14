export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createPage, DB } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, any>;

    // Validate required fields
    const required = ["date", "timeSlot", "venue", "attendeeCount", "usageType", "eventSummary", "contactName", "contactPhone", "contactEmail"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `缺少必填欄位: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate consent agreements
    if (!body.consent || body.consent.length < 4) {
      return NextResponse.json(
        { error: "請同意所有使用規範" },
        { status: 400 }
      );
    }

    // Create entry in Notion DB05
    const page = await createPage(DB.DB05_REGISTRATION, {
      "明細名稱": {
        title: [{ text: { content: `空間預約：${body.venue} - ${body.date} ${body.timeSlot}` } }],
      },
      "明細內容": {
        rich_text: [{ text: { content: JSON.stringify(body, null, 2).slice(0, 2000) } }],
      },
      "表單類型": {
        select: { name: "報名登記" },
      },
    });

    // 同步寫入 Supabase space_bookings
    const slotMap: Record<string, string> = { "上午": "morning", "下午": "afternoon" };
    await supabase.from("space_bookings").upsert({
      booking_date: body.date,
      time_slot: slotMap[body.timeSlot] || body.timeSlot,
      venue: body.venue,
      status: "confirmed",
      contact_name: body.contactName,
      contact_phone: body.contactPhone,
      contact_email: body.contactEmail,
      usage_type: body.usageType,
      event_summary: body.eventSummary,
      notion_page_id: page.id,
    }, { onConflict: "booking_date,time_slot,venue" });

    return NextResponse.json({
      success: true,
      pageId: page.id,
      message: "預約成功",
    });
  } catch (error) {
    console.error("Space booking error:", error);
    return NextResponse.json(
      { error: "預約失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
