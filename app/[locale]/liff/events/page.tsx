"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";

interface EventItem {
  id: string;
  title: string;
  date: string;
  price: number | null;
  cover_url: string | null;
  description: string | null;
  slug: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[d.getDay()];
  return `${month}/${day}（${weekday}）`;
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function EventCard({ event }: { event: EventItem }) {
  const days = daysUntil(event.date);
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;

  return (
    <a
      href={`/events/${event.slug}?liff_mode=true`}
      className="flex rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: "#fff", border: "1px solid #ece8e1" }}
    >
      {/* 左側圖片 */}
      <div className="w-28 shrink-0">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage src={event.cover_url} alt={event.title} placeholderType="event" />
        </div>
      </div>

      {/* 右側內容 */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium" style={{ color: "#b87333" }}>
              {formatDate(event.date)}
            </span>
            {isToday && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: "#e74c3c" }}>
                今天
              </span>
            )}
            {isSoon && !isToday && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#FFF3E0", color: "#E65100" }}>
                {days} 天後
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold line-clamp-2" style={{ color: "#2d2a26" }}>
            {event.title}
          </h3>
          {event.description && (
            <p className="text-xs line-clamp-2 mt-1" style={{ color: "#999" }}>
              {event.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          {event.price != null && event.price > 0 ? (
            <span className="text-sm font-bold" style={{ color: "#4ECDC4" }}>
              NT$ {event.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#4ECDC4" }}>免費</span>
          )}
          <a
            href={`/events/${event.slug}?liff_mode=true`}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#4ECDC4", color: "#fff" }}
          >
            立即報名
          </a>
        </div>
      </div>
    </a>
  );
}

export default function LiffEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const loadEvents = async (pageNum: number) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date, price, cover_url, description, status")
      .eq("status", "active")
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) { console.error("Events load err:", error); return; }
    const items = (data || []).map(e => ({
      id: e.notion_id || e.id,
      title: e.title,
      date: e.event_date,
      price: e.price,
      cover_url: e.cover_url,
      description: e.description,
      slug: e.notion_id || e.id,
    }));

    if (pageNum === 0) setEvents(items);
    else setEvents(prev => [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => { loadEvents(0); }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadEvents(next);
  };

  return (
    <div className="pb-4">
      {/* 標題 */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>活動體驗</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>探索即將到來的精彩活動</p>
      </div>

      {/* 活動列表 */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
          ))
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#999" }}>目前沒有即將舉辦的活動</p>
            <p className="text-xs mt-1" style={{ color: "#ccc" }}>敬請期待新的活動公告</p>
          </div>
        ) : (
          <>
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ background: "#fff", border: "1px solid #ece8e1", color: "#7a5c40" }}
              >
                載入更多活動
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
