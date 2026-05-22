"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import SafeImage from "@/components/ui/SafeImage";

interface EventItem {
  notion_id: string;
  title: string;
  event_date: string | null;
  cover_url: string | null;
  description: string | null;
  event_type: string | null;
  price: number | null;
  location: string | null;
}

const TYPE_FILTERS = ["全部", "走讀", "講座", "市集", "空間"] as const;

const TYPE_EMOJI: Record<string, string> = {
  走讀: "🗺",
  講座: "🎙",
  市集: "🛍",
  空間: "🏠",
};

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  走讀: { bg: "#e8f5e9", text: "#2e7d32" },
  講座: { bg: "#e3f2fd", text: "#1565c0" },
  市集: { bg: "#fff3e0", text: "#e65100" },
  空間: { bg: "#fce4ec", text: "#c62828" },
};

function getEventType(event_type: string | null): string {
  if (!event_type) return "走讀";
  if (event_type.includes("走讀") || event_type.includes("導覽")) return "走讀";
  if (event_type.includes("講座") || event_type.includes("課程")) return "講座";
  if (event_type.includes("市集")) return "市集";
  if (event_type.includes("空間") || event_type.includes("場地")) return "空間";
  return "走讀";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "日期待定";
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<(typeof TYPE_FILTERS)[number]>("全部");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("events")
        .select("notion_id, title, event_date, cover_url, description, event_type, price, location")
        .eq("status", "active")
        .order("event_date", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = events.filter((e) => {
    const type = getEventType(e.event_type);
    const matchType = activeFilter === "全部" || type === activeFilter;
    const past = isPast(e.event_date);
    const matchTime = showPast ? past : !past;
    return matchType && matchTime;
  });

  const upcomingCount = events.filter((e) => !isPast(e.event_date)).length;
  const pastCount = events.filter((e) => isPast(e.event_date)).length;

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
      {/* 標題 */}
      <div className="mb-8">
        <h1 className="text-[1.8em] font-bold mb-2" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
          活動總覽
        </h1>
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>
          走讀・講座・市集・空間 — 在宜蘭，我們用活動連結人與土地
        </p>
      </div>

      {/* 即將舉辦 / 已結束 切換 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowPast(false)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: !showPast ? "var(--color-moss)" : "transparent",
            color: !showPast ? "#fff" : "var(--color-mist)",
            border: !showPast ? "none" : "1px solid var(--color-dust)",
          }}
        >
          即將舉辦 {upcomingCount > 0 && <span className="ml-1 opacity-70">({upcomingCount})</span>}
        </button>
        <button
          onClick={() => setShowPast(true)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: showPast ? "var(--color-bark)" : "transparent",
            color: showPast ? "#fff" : "var(--color-mist)",
            border: showPast ? "none" : "1px solid var(--color-dust)",
          }}
        >
          往期活動 {pastCount > 0 && <span className="ml-1 opacity-70">({pastCount})</span>}
        </button>
      </div>

      {/* 類型篩選 */}
      <div className="flex gap-2 flex-wrap mb-8">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm transition-all"
            style={{
              background: activeFilter === f ? "var(--color-ink)" : "var(--color-warm-white)",
              color: activeFilter === f ? "#fff" : "var(--color-bark)",
              border: activeFilter === f ? "none" : "1px solid var(--color-dust)",
            }}
          >
            {f !== "全部" && TYPE_EMOJI[f] ? `${TYPE_EMOJI[f]} ` : ""}{f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ border: "1px solid var(--color-dust)" }}>
              <div className="h-48 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空狀態 */}
      {!loading && filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4 opacity-30">📅</p>
          <p className="text-sm" style={{ color: "var(--color-mist)" }}>
            {showPast ? "尚無往期活動記錄" : "目前沒有即將舉辦的活動，敬請期待"}
          </p>
        </div>
      )}

      {/* 活動卡片 */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => {
            const type = getEventType(event.event_type);
            const typeColor = TYPE_COLOR[type] || TYPE_COLOR["走讀"];
            const past = isPast(event.event_date);

            return (
              <Link
                key={event.notion_id}
                href={`/events/${event.notion_id}`}
                className="group rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
              >
                {/* 封面圖 */}
                <div className="relative h-48 overflow-hidden bg-gray-50" style={{ background: "var(--color-parchment)" }}>
                  {event.cover_url ? (
                    <SafeImage
                      src={event.cover_url}
                      alt={event.title}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      placeholderType="event"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl opacity-20">{TYPE_EMOJI[type] || "📅"}</span>
                    </div>
                  )}
                  {/* 類型 badge */}
                  <span
                    className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: typeColor.bg, color: typeColor.text }}
                  >
                    {TYPE_EMOJI[type]} {type}
                  </span>
                  {/* 已結束遮罩 */}
                  {past && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.35)" }}
                    >
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
                        已結束
                      </span>
                    </div>
                  )}
                </div>

                {/* 內容 */}
                <div className="p-4 flex-1 flex flex-col">
                  <h2
                    className="font-semibold text-base mb-2 leading-snug line-clamp-2 group-hover:underline"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {event.title}
                  </h2>

                  {/* 日期 */}
                  <p className="text-xs mb-1" style={{ color: "var(--color-bark)" }}>
                    📅 {formatDate(event.event_date)}
                  </p>

                  {/* 地點 */}
                  {event.location && (
                    <p className="text-xs mb-2 truncate" style={{ color: "var(--color-mist)" }}>
                      📍 {event.location}
                    </p>
                  )}

                  {/* 摘要 */}
                  {event.description && (
                    <p className="text-xs leading-relaxed line-clamp-2 flex-1 mb-3" style={{ color: "var(--color-mist)" }}>
                      {event.description}
                    </p>
                  )}

                  {/* 票價 */}
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-rust)" }}>
                      {event.price ? `NT$ ${event.price.toLocaleString()}` : "免費"}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                      {past ? "查看回顧" : "了解詳情"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
