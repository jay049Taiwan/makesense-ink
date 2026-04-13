import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/calendar/bookings?year=2026&month=4
 * 回傳該月已被預約的時段
 */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month")); // 1-based

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
      .gte("booking_date", startDate)
      .lt("booking_date", endDate)
      .neq("status", "cancelled");

    if (error) throw error;

    const result = (data || []).map((b) => ({
      date: b.booking_date,
      timeSlot: b.time_slot as "morning" | "afternoon",
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calendar bookings API error:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
