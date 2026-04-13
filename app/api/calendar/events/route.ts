import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/calendar/events?year=2026&month=4
 * 回傳該月的活動資料（from Supabase events + articles）
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
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, event_date, status")
      .gte("event_date", startDate)
      .lt("event_date", endDate)
      .order("event_date", { ascending: true });

    if (error) throw error;

    // 找每個活動對應的最新文章
    const result = await Promise.all(
      (events || []).map(async (ev) => {
        let href: string | null = null;
        const { data: articles } = await supabase
          .from("articles")
          .select("id")
          .eq("related_event_id", ev.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (articles && articles.length > 0) {
          href = `/post/${articles[0].id}`;
        }

        const eventDate = new Date(ev.event_date);
        const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;

        return {
          date: dateStr,
          title: ev.title,
          status: ev.status,
          href,
        };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calendar events API error:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
