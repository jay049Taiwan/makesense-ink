"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { getSchoolBreak } from "@/lib/school-breaks";

// Day of week headers (Monday start)
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// ── 介面 ──

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  label?: string;
  type?: "market" | "event" | "blocked";
  href?: string;
}

export interface ActivityEvent {
  date: string;
  title: string;
  status: string;
  href: string | null;
}

export interface BookingSlot {
  date: string;
  timeSlot: "morning" | "afternoon";
}

interface CalendarProps {
  events?: CalendarEvent[];
  activityEvents?: ActivityEvent[];
  bookings?: BookingSlot[];
  holidays?: Set<string>;
  onDateClick?: (date: string, timeSlot?: "morning" | "afternoon") => void;
  selectedDate?: string | null;
  mode?: "default" | "market" | "space";
  fetchUrl?: string;
}

// ── 工具函式 ──

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMondayBasedDay(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 用 Intl 取農曆日（瀏覽器原生支援，不需任何套件）
// 回傳 1=初一, 15=十五, 其他=0
function getLunarMark(date: Date): "初一" | "十五" | null {
  try {
    const f = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", { day: "numeric" });
    const parts = f.formatToParts(date);
    const dayPart = parts.find((p) => p.type === "day");
    const d = dayPart ? parseInt(dayPart.value, 10) : 0;
    if (d === 1) return "初一";
    if (d === 15) return "十五";
    return null;
  } catch {
    return null;
  }
}

// 寒暑假日期表搬到 lib/school-breaks.ts，每年由 Noah 手動更新

// ── 狀態標籤顏色 ──
const statusColors: Record<string, { bg: string; text: string }> = {
  published: { bg: "rgba(78,205,196,0.15)", text: "#3aa89f" },
  draft: { bg: "#f0f0f0", text: "#999" },
  unpublished: { bg: "#f0f0f0", text: "#999" },
  cancelled: { bg: "#fde8e8", text: "#e53e3e" },
};

// ── 元件 ──

export default function Calendar({
  events = [],
  activityEvents: propActivityEvents,
  bookings: propBookings,
  holidays = new Set(),
  onDateClick,
  selectedDate,
  mode = "default",
  fetchUrl,
}: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [loadedActivityEvents, setLoadedActivityEvents] = useState<ActivityEvent[]>([]);
  const [loadedBookings, setLoadedBookings] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // 自動載入台灣國定假日
  const [autoHolidays, setAutoHolidays] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${viewYear}.json`)
      .then((r) => r.json())
      .then((data: { date: string; isHoliday: boolean; description: string }[]) => {
        const set = new Set<string>();
        for (const d of data) {
          if (d.isHoliday && d.description !== "星期六" && d.description !== "星期日") {
            set.add(`${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`);
          }
        }
        setAutoHolidays(set);
      })
      .catch(() => {});
  }, [viewYear]);

  // 合併外部傳入的 holidays 和自動載入的
  const mergedHolidays = new Set([...holidays, ...autoHolidays]);

  // 自動載入月份資料
  useEffect(() => {
    if (!fetchUrl) return;
    setIsLoading(true);
    const url = `${fetchUrl}?year=${viewYear}&month=${viewMonth + 1}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (mode === "space") {
          setLoadedBookings(Array.isArray(data) ? data : []);
        } else {
          setLoadedActivityEvents(Array.isArray(data) ? data : []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [fetchUrl, viewYear, viewMonth, mode]);

  const allActivityEvents = propActivityEvents || loadedActivityEvents;
  const allBookings = propBookings || loadedBookings;

  // 建立查詢 Map
  const activityMap = new Map<string, ActivityEvent[]>();
  for (const ev of allActivityEvents) {
    const existing = activityMap.get(ev.date) || [];
    existing.push(ev);
    activityMap.set(ev.date, existing);
  }

  const bookedSlotMap = new Map<string, Set<string>>();
  for (const b of allBookings) {
    const existing = bookedSlotMap.get(b.date) || new Set();
    existing.add(b.timeSlot);
    bookedSlotMap.set(b.date, existing);
  }

  // Legacy event map
  const eventMap = new Map<string, CalendarEvent>();
  for (const ev of events) {
    eventMap.set(ev.date, ev);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getMondayBasedDay(viewYear, viewMonth, 1);

  // Navigation
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }, [today]);

  // Grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // 格高
  const cellHeight = mode === "space"
    ? "h-[80px] sm:h-[120px]"
    : mode === "default"
      ? "h-[70px] sm:h-[110px]"
      : "h-[60px] sm:h-[90px]";

  return (
    <div className="w-full max-w-[1000px] mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {viewYear} 年 {viewMonth + 1} 月
          {isLoading && <span className="text-xs ml-2 font-normal" style={{ color: "var(--color-mist)" }}>載入中...</span>}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors">上月</button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors">本月</button>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors">下月</button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className={`py-2 text-center text-sm font-medium ${i >= 5 ? "text-cal-weekend-text" : "text-muted"}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className={`${cellHeight} border-b border-r border-border`} />;
          }

          const dateStr = formatDate(viewYear, viewMonth, day);
          const dayOfWeek = idx % 7;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isHoliday = mergedHolidays.has(dateStr);
          const isSaturday = dayOfWeek === 5;
          const isSunday = dayOfWeek === 6;
          const event = eventMap.get(dateStr);
          const dayActivities = activityMap.get(dateStr) || [];
          const bookedSlots = bookedSlotMap.get(dateStr) || new Set<string>();
          const lunarMark = getLunarMark(new Date(viewYear, viewMonth, day));
          const schoolBreak = getSchoolBreak(viewYear, viewMonth, day);

          // Background — 優先級：選取 > 今天 > 市集 > 國定假日 > 週末 > 寒暑假底色
          let bgClass = "bg-white";
          let bgStyle: React.CSSProperties = {};
          if (isSelected) bgClass = "bg-brand-teal/10 ring-2 ring-brand-teal ring-inset";
          else if (isToday) bgClass = "bg-cal-today";
          else if (event?.type === "market") bgClass = "bg-cal-market";
          else if (event?.type === "blocked") bgClass = "bg-cal-blocked";
          else if (isHoliday) bgClass = "bg-cal-holiday-bg";
          else if (isSunday) bgClass = "bg-cal-sunday";
          else if (isSaturday) bgClass = "bg-cal-saturday";
          else if (schoolBreak === "winter") { bgClass = ""; bgStyle = { background: "rgba(91,163,217,0.08)" }; }
          else if (schoolBreak === "summer") { bgClass = ""; bgStyle = { background: "rgba(184,148,60,0.08)" }; }

          // Text color
          let textClass = "text-foreground";
          if (isPast) textClass = "text-muted/50";
          else if (isHoliday) textClass = "text-cal-holiday-text";
          else if (isSaturday || isSunday) textClass = "text-cal-weekend-text";

          const isClickable = onDateClick && mode !== "space" && (!isPast || mode === "market");

          return (
            <div
              key={dateStr}
              onClick={() => isClickable && onDateClick(dateStr)}
              style={bgStyle}
              className={`${cellHeight} border-b border-r border-border p-1 sm:p-1.5 transition-colors ${bgClass} ${
                isClickable ? "cursor-pointer hover:bg-brand-teal/5" : ""
              } overflow-hidden relative`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-xs sm:text-sm font-medium ${textClass}`}>{day}</span>
                {lunarMark && (
                  <span
                    className="text-[8px] sm:text-[9px] px-1 py-px rounded leading-none"
                    style={{
                      background: lunarMark === "初一" ? "rgba(232,147,90,0.15)" : "rgba(180,140,90,0.15)",
                      color: lunarMark === "初一" ? "#c97540" : "#8b6a40",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {lunarMark}
                  </span>
                )}
              </div>

              {/* ── mode="default": 活動列表 ── */}
              {mode === "default" && dayActivities.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayActivities.slice(0, 2).map((ev, i) => {
                    const sc = statusColors[ev.status] || statusColors.published;
                    const inner = (
                      <div className="flex items-center gap-0.5 min-w-0">
                        <span className="truncate text-[8px] sm:text-[10px] font-medium" style={{ color: "var(--color-ink)" }}>
                          {ev.title}
                        </span>
                        <span className="flex-shrink-0 text-[7px] sm:text-[8px] px-1 rounded" style={{ background: sc.bg, color: sc.text }}>
                          {ev.status === "published" ? "受理中" : ev.status}
                        </span>
                      </div>
                    );
                    return ev.href ? (
                      <Link key={i} href={ev.href} onClick={(e) => e.stopPropagation()} className="block hover:opacity-70">
                        {inner}
                      </Link>
                    ) : (
                      <div key={i}>{inner}</div>
                    );
                  })}
                  {dayActivities.length > 2 && (
                    <span className="text-[8px]" style={{ color: "var(--color-mist)" }}>+{dayActivities.length - 2} 更多</span>
                  )}
                </div>
              )}

              {/* ── mode="default": legacy event label ── */}
              {mode !== "space" && event?.label && dayActivities.length === 0 && (
                <p className="text-[9px] sm:text-xs mt-0.5 text-brand-orange font-medium truncate">{event.label}</p>
              )}

              {/* ── mode="space": 上午/下午時段 ── */}
              {mode === "space" && !isPast && (
                <div className="mt-0.5 space-y-0.5">
                  {(["morning", "afternoon"] as const).map((slot) => {
                    const isBooked = bookedSlots.has(slot);
                    const slotLabel = slot === "morning" ? "上午" : "下午";
                    return (
                      <button
                        key={slot}
                        disabled={isBooked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isBooked && onDateClick) onDateClick(dateStr, slot);
                        }}
                        className="w-full text-[8px] sm:text-[10px] py-0.5 rounded transition-colors text-center"
                        style={{
                          background: isBooked ? "rgba(229,62,62,0.08)" : "rgba(78,205,196,0.1)",
                          color: isBooked ? "#e53e3e" : "#3aa89f",
                          cursor: isBooked ? "default" : "pointer",
                          textDecoration: isBooked ? "line-through" : "none",
                        }}
                      >
                        {slotLabel} {isBooked ? "已預訂" : "可預約"}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 過去的日期在 space mode 不顯示 slot */}
              {mode === "space" && isPast && (
                <div className="mt-1 text-center">
                  <span className="text-[8px]" style={{ color: "var(--color-mist)" }}>—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-cal-today border border-border" /> 今天
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-cal-holiday-bg border border-border" /> 國定假日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-border" style={{ background: "rgba(91,163,217,0.08)" }} /> 寒假
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-border" style={{ background: "rgba(184,148,60,0.08)" }} /> 暑假
        </span>
        <span className="flex items-center gap-1">
          <span
            className="text-[9px] px-1 py-px rounded leading-none"
            style={{ background: "rgba(232,147,90,0.15)", color: "#c97540", fontFamily: "var(--font-serif)" }}
          >初一</span>
          <span
            className="text-[9px] px-1 py-px rounded leading-none ml-0.5"
            style={{ background: "rgba(180,140,90,0.15)", color: "#8b6a40", fontFamily: "var(--font-serif)" }}
          >十五</span>
          <span className="ml-1">農曆</span>
        </span>
        {mode === "market" && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cal-market border border-border" /> 市集日
          </span>
        )}
        {mode === "space" && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-border" style={{ background: "rgba(78,205,196,0.1)" }} /> 可預約
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-border" style={{ background: "rgba(229,62,62,0.08)" }} /> 已預訂
            </span>
          </>
        )}
      </div>
    </div>
  );
}
