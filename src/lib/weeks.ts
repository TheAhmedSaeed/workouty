import { Template, Workout } from '../types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Sunday 00:00 (local) of the week containing `d`. */
export function weekStartSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // getDay(): Sunday = 0
  return x;
}

/**
 * Label a week by the month that owns the majority of its days and its index
 * within that month, e.g. "August week 1". A Sun–Sat week is owned by the month
 * of its Wednesday (the median day), and consecutive Wednesdays fall in distinct
 * ceil(date/7) buckets, so that gives a stable 1-based week number.
 */
export function weekLabel(weekStart: Date): string {
  const wed = new Date(weekStart);
  wed.setDate(wed.getDate() + 3);
  return `${MONTHS[wed.getMonth()]} week ${Math.ceil(wed.getDate() / 7)}`;
}

function fmtMD(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** e.g. "Aug 2–8" or, across a month boundary, "Aug 30 – Sep 5". */
export function weekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return weekStart.getMonth() === end.getMonth()
    ? `${fmtMD(weekStart)}–${end.getDate()}`
    : `${fmtMD(weekStart)} – ${fmtMD(end)}`;
}

export interface WeekStat {
  /** ISO date (YYYY-MM-DD) of the week's Sunday. */
  start: string;
  label: string;
  range: string;
  target: number;
  done: number;
  /** Plan day-ids completed this week (distinct). */
  doneDayIds: string[];
}

/** How many distinct plan days were completed in the given Sun–Sat week. */
export function weekAdherence(
  workouts: Workout[],
  plan: Template,
  weekStart: Date,
): WeekStat {
  const start = weekStart.getTime();
  const end = start + 7 * 86400000;
  const planDayIds = new Set(plan.days.map((d) => d.id));
  const done = new Set<string>();
  for (const w of workouts) {
    const t = new Date(w.startedAt).getTime();
    if (t < start || t >= end) continue;
    if (w.templateId !== plan.id || !w.dayId) continue;
    if (planDayIds.has(w.dayId)) done.add(w.dayId);
  }
  return {
    start: weekStart.toISOString().slice(0, 10),
    label: weekLabel(weekStart),
    range: weekRangeLabel(weekStart),
    target: plan.days.length,
    done: done.size,
    doneDayIds: [...done],
  };
}

/** The last `count` weeks (newest first, current week at index 0). */
export function recentWeeks(
  workouts: Workout[],
  plan: Template,
  count: number,
  nowMs: number,
): WeekStat[] {
  const thisSunday = weekStartSunday(new Date(nowMs));
  const out: WeekStat[] = [];
  for (let i = 0; i < count; i++) {
    const s = new Date(thisSunday);
    s.setDate(s.getDate() - i * 7);
    out.push(weekAdherence(workouts, plan, s));
  }
  return out;
}
