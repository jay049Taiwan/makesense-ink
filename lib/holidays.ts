// Taiwan national holidays fetcher
// Source: https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/{year}.json

interface TaiwanCalendarDay {
  date: string; // YYYYMMDD
  week: string;
  isHoliday: boolean;
  description: string;
}

// In-memory cache for holidays per year
const holidayCache: Record<number, Set<string>> = {};

export async function getTaiwanHolidays(year: number): Promise<Set<string>> {
  if (holidayCache[year]) return holidayCache[year];

  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    if (!res.ok) return new Set();

    const data: TaiwanCalendarDay[] = await res.json();

    const holidays = new Set<string>();
    for (const day of data) {
      if (
        day.isHoliday &&
        day.description !== "星期六" &&
        day.description !== "星期日"
      ) {
        // Convert YYYYMMDD to YYYY-MM-DD
        const formatted = `${day.date.slice(0, 4)}-${day.date.slice(4, 6)}-${day.date.slice(6, 8)}`;
        holidays.add(formatted);
      }
    }

    holidayCache[year] = holidays;
    return holidays;
  } catch {
    return new Set();
  }
}

export function isHoliday(holidays: Set<string>, date: string): boolean {
  return holidays.has(date);
}
