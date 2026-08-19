import { describe, expect, it } from 'vitest';
import { CardioSession } from '../types';
import {
  CARDIO_TYPES,
  cardioByWeek,
  cardioTotals,
  cardioTypeInfo,
  sortedCardio,
} from '../lib/cardio';

const s = (over: Partial<CardioSession>): CardioSession => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-19',
  type: 'run',
  minutes: 30,
  ...over,
});

// Wed Aug 19 2026 — its Sun–Sat week starts Sun Aug 16.
const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();

describe('cardioByWeek', () => {
  it('returns the requested number of weeks, newest first', () => {
    const weeks = cardioByWeek([], 8, NOW);
    expect(weeks).toHaveLength(8);
    expect(weeks[0].start).toBe('2026-08-16'); // this week's Sunday
    expect(weeks[1].start).toBe('2026-08-09'); // previous week
  });

  it('buckets sessions into the correct Sun–Sat week and sums minutes', () => {
    const sessions = [
      s({ date: '2026-08-19', minutes: 30 }), // this week
      s({ date: '2026-08-16', minutes: 20 }), // this week (the Sunday)
      s({ date: '2026-08-12', minutes: 45 }), // last week
    ];
    const weeks = cardioByWeek(sessions, 4, NOW);
    expect(weeks[0].sessions).toHaveLength(2);
    expect(weeks[0].minutes).toBe(50);
    expect(weeks[1].sessions).toHaveLength(1);
    expect(weeks[1].minutes).toBe(45);
    expect(weeks[2].minutes).toBe(0);
  });

  it('drops sessions older than the window', () => {
    const weeks = cardioByWeek([s({ date: '2026-06-01' })], 4, NOW);
    expect(weeks.every((w) => w.sessions.length === 0)).toBe(true);
  });

  it('sums distance and rounds it', () => {
    const weeks = cardioByWeek(
      [
        s({ date: '2026-08-19', distanceKm: 5.1 }),
        s({ date: '2026-08-18', distanceKm: 2.25 }),
      ],
      4,
      NOW,
    );
    expect(weeks[0].distanceKm).toBe(7.35);
  });

  it('orders each week’s sessions newest first', () => {
    const weeks = cardioByWeek(
      [s({ date: '2026-08-17' }), s({ date: '2026-08-19' })],
      4,
      NOW,
    );
    expect(weeks[0].sessions.map((x) => x.date)).toEqual([
      '2026-08-19',
      '2026-08-17',
    ]);
  });
});

describe('cardioTotals', () => {
  it('rolls up sessions, minutes and distance', () => {
    const t = cardioTotals([
      s({ minutes: 30, distanceKm: 5 }),
      s({ minutes: 20, distanceKm: 2.5 }),
    ]);
    expect(t).toEqual({ sessions: 2, minutes: 50, distanceKm: 7.5 });
  });
});

describe('cardioTypeInfo', () => {
  it('has an entry for every configured type', () => {
    for (const c of CARDIO_TYPES) {
      expect(cardioTypeInfo(c.type).label).toBe(c.label);
    }
  });
});

describe('sortedCardio', () => {
  it('sorts newest first without mutating the input', () => {
    const input = [s({ date: '2026-08-10' }), s({ date: '2026-08-20' })];
    const out = sortedCardio(input);
    expect(out.map((x) => x.date)).toEqual(['2026-08-20', '2026-08-10']);
    expect(input.map((x) => x.date)).toEqual(['2026-08-10', '2026-08-20']);
  });
});
