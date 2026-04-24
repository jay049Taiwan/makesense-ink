"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SafeImage from "@/components/ui/SafeImage";
import { useCart } from "@/components/providers/CartProvider";

interface Ticket { name: string; price: string; notion_id?: string }

interface EventItem {
  id: string;
  title: string;
  date: string;
  price: number | null;
  cover_url: string | null;
  description: string | null;
  slug: string;
  location?: string;
  event_type?: string;
  tickets: Ticket[];
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

const parsePrice = (s: string) => parseInt(s.replace(/[^0-9]/g, "")) || 0;

function EventCard({ event, onTap }: { event: EventItem; onTap: (e: EventItem) => void }) {
  const days = daysUntil(event.date);
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;

  return (
    <button
      onClick={() => onTap(event)}
      className="flex rounded-xl overflow-hidden transition-shadow hover:shadow-md text-left w-full"
      style={{ background: "#fff", border: "1px solid #ece8e1" }}
    >
      <div className="w-28 shrink-0">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage src={event.cover_url} alt={event.title} placeholderType="event" />
        </div>
      </div>
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
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#4ECDC4", color: "#fff" }}
          >
            加入購物車
          </span>
        </div>
      </div>
    </button>
  );
}

function EventSheet({ event, onClose }: { event: EventItem | null; onClose: () => void }) {
  const { addItem } = useCart();
  const [qtys, setQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    if (event) {
      // 預設把第一個票種設 1
      const init: Record<string, number> = {};
      if (event.tickets[0]) init[event.tickets[0].name] = 1;
      setQtys(init);
    }
  }, [event]);

  if (!event) return null;

  const mapType = (et?: string): "走讀" | "講座" | "市集" | "空間" => {
    if (!et) return "走讀";
    if (et.includes("走讀")) return "走讀";
    if (et.includes("講座")) return "講座";
    if (et.includes("市集")) return "市集";
    if (et.includes("空間")) return "空間";
    return "走讀";
  };

  const total = event.tickets.reduce((s, t) => s + parsePrice(t.price) * (qtys[t.name] || 0), 0);
  const hasAny = event.tickets.some(t => (qtys[t.name] || 0) > 0);

  const handleAdd = () => {
    for (const t of event.tickets) {
      const q = qtys[t.name] || 0;
      if (q === 0) continue;
      addItem({
        id: `ticket-${event.slug}-${t.name}`,
        name: event.title,
        subtitle: t.name,
        type: mapType(event.event_type),
        price: parsePrice(t.price),
        qty: q,
        eventId: event.slug,
        productId: t.notion_id,
        meta: { date: event.date, location: event.location || "" },
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: "#fff", animation: "sheetUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="overflow-y-auto px-4 pb-2">
          <div className="aspect-[16/9] rounded-lg overflow-hidden mb-3">
            <SafeImage src={event.cover_url} alt={event.title} placeholderType="event" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "#2d2a26" }}>{event.title}</h3>
          <p className="text-sm mt-1" style={{ color: "#b87333" }}>
            {formatDate(event.date)}
            {event.location && <span style={{ color: "#999" }}> · {event.location}</span>}
          </p>
          {event.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#555" }}>
              {event.description.length > 200 ? event.description.slice(0, 200) + "…" : event.description}
            </p>
          )}

          {/* 票種 */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2" style={{ color: "#2d2a26" }}>選擇票種</h4>
            {event.tickets.length === 0 ? (
              <p className="text-sm" style={{ color: "#999" }}>此活動暫無票種資訊</p>
            ) : (
              <div className="space-y-2">
                {event.tickets.map((t) => {
                  const q = qtys[t.name] || 0;
                  return (
                    <div key={t.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ border: "1px solid #ece8e1" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "#2d2a26" }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#b5522a" }}>{t.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQtys((p) => ({ ...p, [t.name]: Math.max(0, q - 1) }))}
                          className="w-8 h-8 rounded-lg text-base"
                          style={{ background: "#f0ebe4", color: "#7a5c40" }}
                        >−</button>
                        <span className="text-sm w-6 text-center" style={{ color: "#2d2a26" }}>{q}</span>
                        <button
                          onClick={() => setQtys((p) => ({ ...p, [t.name]: q + 1 }))}
                          className="w-8 h-8 rounded-lg text-base"
                          style={{ background: "#f0ebe4", color: "#7a5c40" }}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderTop: "1px solid #ece8e1" }}>
          <div className="flex-1">
            <p className="text-xs" style={{ color: "#999" }}>小計</p>
            <p className="text-base font-bold" style={{ color: "#b5522a" }}>NT$ {total.toLocaleString()}</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={!hasAny}
            className="px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: hasAny ? "#7a5c40" : "#ccc",
              color: "#fff",
              opacity: hasAny ? 1 : 0.6,
            }}
          >
            ＋ 加入購物車
          </button>
          <a
            href={`/events/${event.slug}?liff_mode=true`}
            className="px-4 py-3 rounded-xl text-sm"
            style={{ border: "1px solid #ece8e1", color: "#7a5c40" }}
          >
            詳情
          </a>
        </div>
      </div>
      <style>{`@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

export default function LiffEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sheetEvent, setSheetEvent] = useState<EventItem | null>(null);
  const PAGE_SIZE = 10;

  const loadEvents = async (pageNum: number) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("events")
      .select("id, notion_id, title, event_date, price, cover_url, description, status, location, event_type, tickets")
      .eq("status", "active")
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) { console.error("Events load err:", error); return; }
    const items: EventItem[] = (data || []).map((e: any) => {
      const tickets: Ticket[] = Array.isArray(e.tickets) && e.tickets.length > 0
        ? e.tickets
        : (e.price ? [{ name: "成人票", price: `$${e.price}` }] : []);
      return {
        id: e.notion_id || e.id,
        title: e.title,
        date: e.event_date,
        price: e.price,
        cover_url: e.cover_url,
        description: e.description,
        slug: e.notion_id || e.id,
        location: e.location,
        event_type: e.event_type,
        tickets,
      };
    });

    if (pageNum === 0) setEvents(items);
    else setEvents((prev) => [...prev, ...items]);
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
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>活動體驗</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>點一下卡片選票、加入購物車</p>
      </div>

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
              <EventCard key={event.id} event={event} onTap={setSheetEvent} />
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

      <EventSheet event={sheetEvent} onClose={() => setSheetEvent(null)} />
    </div>
  );
}
