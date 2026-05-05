import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * GET /api/calendar/bookings?year=2026&month=4
 * 回傳該月的空間預約占用時段（from Supabase space_bookings）
 * 來源含 external（會員官網預約）與 internal（DB04 場地使用同步）
 * 回傳格式對應 BookingSlot[]：{ date, timeSlot }
 */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));

  if (!year || !month) {
    return NextResponse.json({ error: "需要 year 和 month" }, { status: 400 });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  try {
    const { data, error } = await supabase
      .from("space_bookings")
      .select("booking_date, time_slot")
      .eq("status", "confirmed")
      .gte("booking_date", startDate)
      .lt("booking_date", endDate);

    if (error) throw error;

    const result = (data || []).map((b) => ({
      date: b.booking_date,
      timeSlot: b.time_slot === "morning" ? "morning" : "afternoon",
    }));

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (e: any) {
    console.error("[calendar/bookings]", e.message);
    return NextResponse.json([], { status: 500 });
  }
}
