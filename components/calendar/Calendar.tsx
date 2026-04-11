"use client";

import { useState, useCallback } from "react";

// Day of week headers (Monday start)
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  label?: string;
  type?: "market" | "event" | "blocked";
  href?: string;
}

interface CalendarProps {
  events?: CalendarEvent[];
  holidays?: Set<string>;
  onDateClick?: (date: string) => void;
  selectedDate?: string | null;
  mode?: "default" | "market" | "space";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get day of week (0=Monday, 6=Sunday)
function getMondayBasedDay(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Calendar({
  events = [],
  holidays = new Set(),
  onDateClick,
  selectedDate,
  mode = "default",
}: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Build event lookup
  const eventMap = new Map<string, CalendarEvent>();
  for (const ev of events) {
    eventMap.set(ev.date, ev);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getMondayBasedDay(viewYear, viewMonth, 1);

  // Navigation
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }, [today]);

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full max-w-[1000px] mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {viewYear} 年 {viewMonth + 1} 月
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors"
          >
            上月
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors"
          >
            本月
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-brand-cream transition-colors"
          >
            下月
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-2 text-center text-sm font-medium ${
              i >= 5 ? "text-cal-weekend-text" : "text-muted"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div key={`empty-${idx}`} className="h-[90px] border-b border-r border-border" />
            );
          }

          const dateStr = formatDate(viewYear, viewMonth, day);
          const dayOfWeek = (idx % 7); // 0=Mon, 5=Sat, 6=Sun
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isHoliday = holidays.has(dateStr);
          const isSaturday = dayOfWeek === 5;
          const isSunday = dayOfWeek === 6;
          const event = eventMap.get(dateStr);

          // Determine background color (priority: selected > today > event > holiday > weekend)
          let bgClass = "bg-white";
          if (isSelected) bgClass = "bg-brand-teal/10 ring-2 ring-brand-teal ring-inset";
          else if (isToday) bgClass = "bg-cal-today";
          else if (event?.type === "market") bgClass = "bg-cal-market";
          else if (event?.type === "blocked") bgClass = "bg-cal-blocked";
          else if (isHoliday) bgClass = "bg-cal-holiday-bg";
          else if (isSunday) bgClass = "bg-cal-sunday";
          else if (isSaturday) bgClass = "bg-cal-saturday";

          // Text color
          let textClass = "text-foreground";
          if (isPast) textClass = "text-muted/50";
          else if (isHoliday) textClass = "text-cal-holiday-text";
          else if (isSaturday || isSunday) textClass = "text-cal-weekend-text";

          const isClickable = onDateClick && (!isPast || mode === "market");

          return (
            <div
              key={dateStr}
              onClick={() => isClickable && onDateClick(dateStr)}
              className={`h-[90px] border-b border-r border-border p-1.5 transition-colors ${bgClass} ${
                isClickable ? "cursor-pointer hover:bg-brand-teal/5" : ""
              }`}
            >
              <span className={`text-sm font-medium ${textClass}`}>
                {day}
              </span>
              {event?.label && (
                <p className="text-xs mt-0.5 text-brand-orange font-medium truncate">
                  {event.label}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-cal-today border border-border" />
          今天
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-cal-holiday-bg border border-border" />
          國定假日
        </span>
        {mode === "market" && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cal-market border border-border" />
            市集日
          </span>
        )}
        {mode === "space" && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cal-blocked border border-border" />
            已封鎖
          </span>
        )}
      </div>
    </div>
  );
}
