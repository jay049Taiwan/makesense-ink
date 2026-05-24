export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createPage, DB } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/** 每個 IP 每 10 分鐘最多 3 次預約（防垃圾表單）*/
const BOOKING_LIMIT = 3;
const WINDOW_MS = 10 * 60 * 1000;

async function checkSpaceBookingRateLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  try {
    const { count } = await supabase
      .from("line_message_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", `ip:${ip}`)
      .eq("message_type", "booking_space")
      .gte("created_at", windowStart.toISOString());
    return (count || 0) < BOOKING_LIMIT;
  } catch {
    return true; // 查不到時放行，不阻斷服務
  }
}

export async function POST(request: NextRequest) {
  // IP rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkSpaceBookingRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

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

    // 記錄此次預約（供 rate limit 計數，fire-and-forget）
    void supabase.from("line_message_log").insert({
      user_id: `ip:${ip}`,
      message_type: "booking_space",
      template: "space_form",
    });

    // Create entry in Notion DB05
    const page = await createPage(DB.DB05_REGISTRATION, {
      "內容名稱": {
        title: [{ text: { content: `空間預約：${body.venue} - ${body.date} ${body.timeSlot}` } }],
      },
      "明細內容": {
        rich_text: [{ text: { content: JSON.stringify(body, null, 2).slice(0, 2000) } }],
      },
      "內容類型": {
        select: { name: "報名登記" },
      },
      "登記類別": {
        select: { name: "填寫報名" },
      },
      "報名選項": {
        select: { name: "使用空間" },
      },
    });

    // 同步寫入 Supabase space_bookings（external = 會員官網預約）
    const slotMap: Record<string, string> = { "上午": "morning", "下午": "afternoon" };
    await supabase.from("space_bookings").upsert({
      booking_date: body.date,
      time_slot: slotMap[body.timeSlot] || body.timeSlot,
      venue: body.venue,
      status: "confirmed",
      source: "external",
      contact_name: body.contactName,
      contact_phone: body.contactPhone,
      contact_email: body.contactEmail,
      usage_type: body.usageType,
      attendee_count: body.attendeeCount ? Number(body.attendeeCount) : null,
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
