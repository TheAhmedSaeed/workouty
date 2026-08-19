import { CardioSession, CardioType } from '../types';
import {
  weekLabel,
  weekOfYear,
  weekRangeLabel,
  weekStartSunday,
} from './weeks';

export interface CardioTypeInfo {
  type: CardioType;
  label: string;
  icon: string;
}

/** The cardio kinds you can log, in menu order. */
export const CARDIO_TYPES: CardioTypeInfo[] = [
  { type: 'run', label: 'Running', icon: '🏃' },
  { type: 'walk', label: 'Walking', icon: '🚶' },
  { type: 'cycle', label: 'Cycling', icon: '🚴' },
  { type: 'row', label: 'Rowing', icon: '🚣' },
  { type: 'elliptical', label: 'Elliptical', icon: '🌀' },
  { type: 'swim', label: 'Swimming', icon: '🏊' },
  { type: 'hike', label: 'Hiking', icon: '🥾' },
  { type: 'jump_rope', label: 'Jump rope', icon: '🪢' },
  { type: 'stairmaster', label: 'Stairmaster', icon: '🧗' },
  { type: 'other', label: 'Other', icon: '💪' },
];

const CARDIO_TYPE_MAP: Record<CardioType, CardioTypeInfo> = Object.fromEntries(
  CARDIO_TYPES.map((t) => [t.type, t]),
) as Record<CardioType, CardioTypeInfo>;

export function cardioTypeInfo(type: CardioType): CardioTypeInfo {
  return CARDIO_TYPE_MAP[type] ?? CARDIO_TYPE_MAP.other;
}

/** Parse a 'YYYY-MM-DD' string as a local-time Date (no timezone shift). */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Sessions sorted newest → oldest by date. */
export function sortedCardio(list: CardioSession[]): CardioSession[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export interface CardioWeek {
  /** ISO date (YYYY-MM-DD) of the week's Sunday. */
  start: string;
  /** Week number within the year (week 1 = the week of Jan 1). */
  weekNo: number;
  label: string;
  range: string;
  /** Sessions that fell in this Sun–Sat week (newest first). */
  sessions: CardioSession[];
  /** Total minutes across the week's sessions. */
  minutes: number;
  /** Total distance (km) across sessions that recorded one. */
  distanceKm: number;
}

/**
 * Bucket cardio sessions into the last `count` Sun–Sat weeks (newest first,
 * current week at index 0), so you can see week-by-week consistency.
 */
export function cardioByWeek(
  sessions: CardioSession[],
  count: number,
  nowMs: number,
): CardioWeek[] {
  const thisSunday = weekStartSunday(new Date(nowMs));
  const weeks: CardioWeek[] = [];
  const index = new Map<string, CardioWeek>();

  for (let i = 0; i < count; i++) {
    const s = new Date(thisSunday);
    s.setDate(s.getDate() - i * 7);
    const startIso = s.toISOString().slice(0, 10);
    const wk: CardioWeek = {
      start: startIso,
      weekNo: weekOfYear(s),
      label: weekLabel(s),
      range: weekRangeLabel(s),
      sessions: [],
      minutes: 0,
      distanceKm: 0,
    };
    weeks.push(wk);
    index.set(startIso, wk);
  }

  for (const c of sessions) {
    const wkStart = weekStartSunday(parseDate(c.date));
    const key = wkStart.toISOString().slice(0, 10);
    const wk = index.get(key);
    if (!wk) continue; // outside the window we're showing
    wk.sessions.push(c);
    wk.minutes += c.minutes || 0;
    wk.distanceKm += c.distanceKm || 0;
  }

  for (const wk of weeks) {
    wk.sessions.sort((a, b) => b.date.localeCompare(a.date));
    wk.distanceKm = Math.round(wk.distanceKm * 100) / 100;
  }
  return weeks;
}

export interface CardioTotals {
  sessions: number;
  minutes: number;
  distanceKm: number;
}

/** Roll a list of sessions up into totals. */
export function cardioTotals(sessions: CardioSession[]): CardioTotals {
  let minutes = 0;
  let distanceKm = 0;
  for (const c of sessions) {
    minutes += c.minutes || 0;
    distanceKm += c.distanceKm || 0;
  }
  return {
    sessions: sessions.length,
    minutes,
    distanceKm: Math.round(distanceKm * 100) / 100,
  };
}
