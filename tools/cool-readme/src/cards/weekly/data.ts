// The weekly card's numbers: your contributions per weekday, and what stands out in them.
import type { Counted } from '../../compute.ts';

/** Contributions per weekday over the last 12 months, Monday first. */
export interface WeekdayItem {
  day: string;
  count: number;
}

/** The weekly card's numbers: the busiest and the quietest weekday, and the share of Monday to Friday. */
export interface WeekdayFacts {
  busiest: WeekdayItem;
  quietest: WeekdayItem;
  /** Percent of the contributions made Monday to Friday. */
  weekdays: number;
}

export function weekdayFacts(days: WeekdayItem[]): WeekdayFacts {
  const total = days.reduce((s, d) => s + d.count, 0);
  const busiest = days.reduce((top, d) => (d.count > top.count ? d : top), days[0]);
  const quietest = days.reduce((low, d) => (d.count < low.count ? d : low), days[0]);
  const weekdays = days.slice(0, 5).reduce((s, d) => s + d.count, 0);
  return { busiest, quietest, weekdays: total ? Math.round((weekdays / total) * 100) : 0 };
}

/** A weekday's full name, from its short one. */
export const DAY_NAMES: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

export function weeklyData({ snapshot }: Counted): WeekdayItem[] {
  // Weekly rhythm: the contribution calendar summed per weekday. Like the active-days ring, it
  // follows the calendar, which the count settings cannot filter.
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekly: WeekdayItem[] = DAYS.map((day) => ({ day, count: 0 }));
  for (const d of snapshot.calendar) {
    const sundayFirst = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    weekly[(sundayFirst + 6) % 7].count += d.count;
  }
  return weekly;
}
