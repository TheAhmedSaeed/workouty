import { describe, expect, it } from 'vitest';
import {
  recentWeeks,
  weekAdherence,
  weekLabel,
  weekOfYear,
  weekRangeLabel,
  weekStartSunday,
} from '../lib/weeks';
import { Template, Workout } from '../types';

// In 2026, Aug 2 is a Sunday and Aug 1 a Saturday.
const day = (name: string) => ({ id: name, name, exercises: [] });
const plan: Template = {
  id: 'p',
  name: 'PPL',
  days: [day('a'), day('b'), day('c'), day('d')],
  createdAt: '',
};
const w = (dayId: string, d: number, templateId = 'p'): Workout => ({
  id: `${dayId}-${d}`,
  name: '',
  templateId,
  dayId,
  startedAt: new Date(2026, 7, d, 10, 0, 0).toISOString(),
  exercises: [],
});

describe('week boundaries and labels', () => {
  it('weeks start on Sunday', () => {
    expect(weekStartSunday(new Date(2026, 7, 5)).getDay()).toBe(0); // Wed → its Sunday
    expect(weekStartSunday(new Date(2026, 7, 2)).getDate()).toBe(2); // Aug 2 is a Sunday
  });

  it('labels by owning month + week-of-month', () => {
    expect(weekLabel(new Date(2026, 7, 2))).toBe('August week 1'); // Aug 2–8
    // Sun Jul 26 – Sat Aug 1: Wednesday (Jul 29) owns it → July week 5
    expect(weekLabel(new Date(2026, 6, 26))).toBe('July week 5');
  });

  it('formats the date range, spanning months when needed', () => {
    expect(weekRangeLabel(new Date(2026, 7, 2))).toMatch(/Aug 2.*8/);
    expect(weekRangeLabel(new Date(2026, 6, 26))).toMatch(/Jul 26.*Aug 1/);
  });

  it('numbers weeks within the year, consecutively', () => {
    const jul = weekOfYear(new Date(2026, 6, 26)); // Jul 26–Aug 1
    const aug = weekOfYear(new Date(2026, 7, 2)); // Aug 2–8
    expect(aug).toBe(jul + 1);
    expect(jul).toBe(31);
  });
});

describe('weekAdherence', () => {
  it('counts distinct plan days completed in the Sun–Sat week', () => {
    const workouts = [
      w('a', 3), // in week Aug 2–8
      w('b', 5),
      w('a', 4), // duplicate day a — counts once
      w('c', 10), // next week — excluded
      w('d', 4, 'other'), // different plan — excluded
    ];
    const s = weekAdherence(workouts, plan, new Date(2026, 7, 2));
    expect(s.target).toBe(4);
    expect(s.done).toBe(2);
    expect(s.doneDayIds.sort()).toEqual(['a', 'b']);
    expect(s.label).toBe('August week 1');
  });
});

describe('recentWeeks', () => {
  it('returns weeks newest-first with the current week first', () => {
    const now = new Date(2026, 7, 12, 9, 0, 0).getTime(); // Aug 12 (in Aug 9–15 week)
    const weeks = recentWeeks([w('a', 3)], plan, 3, now);
    expect(weeks).toHaveLength(3);
    expect(weeks[0].label).toBe('August week 2'); // current
    expect(weeks[1].label).toBe('August week 1'); // has the Aug 3 workout
    expect(weeks[1].done).toBe(1);
    expect(weeks[0].done).toBe(0);
  });
});
