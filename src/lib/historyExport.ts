import { Exercise, Unit, Workout } from '../types';
import { exerciseVolume, workoutSetCount, workoutVolume } from './stats';

export interface HistoryPeriod {
  label: string;
  /** Number of days back, or null for all time. */
  days: number | null;
}

/** Period presets offered in the export dialog. */
export const HISTORY_PERIODS: HistoryPeriod[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
  { label: 'All time', days: null },
];

/** Workouts whose start falls within the last `days` days (null = all). */
export function filterWorkoutsByDays(
  workouts: Workout[],
  days: number | null,
  nowMs: number,
): Workout[] {
  if (days == null) return [...workouts];
  const cutoff = nowMs - days * 86400000;
  return workouts.filter((w) => new Date(w.startedAt).getTime() >= cutoff);
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const durationMin = (w: Workout): number | null =>
  w.finishedAt
    ? Math.round(
        (new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) /
          60000,
      )
    : null;

/**
 * Build a self-contained, AI-friendly Markdown export of the workout history
 * over a chosen period. Exercise names + volumes are resolved so it reads
 * without any app context — paste into any assistant for progress analysis.
 */
export function buildHistoryExport(
  workouts: Workout[],
  unit: Unit,
  getExercise: (id: string) => Exercise | undefined,
  periodLabel: string,
  exportedAt: string,
): string {
  // newest first for reading
  const rows = [...workouts].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  const exported = new Date(exportedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];
  lines.push(`# Workouty — Workout history (${periodLabel})`);
  lines.push('');
  lines.push(`Exported: ${exported}`);
  lines.push(`Weight unit: ${unit}`);
  lines.push(`Workouts: ${rows.length}`);
  lines.push('');

  if (rows.length === 0) {
    lines.push('_No workouts logged in this period._');
    lines.push('');
    return lines.join('\n');
  }

  // ── Framing for an AI assistant ──────────────────────────────────────────
  lines.push(
    'This is my workout history for the period above. Volume = weight × reps ' +
      'summed over completed working sets. Please analyse my training: how ' +
      'volume and strength are trending per exercise and overall, what is ' +
      'progressing or stalling, how balanced and frequent it is, and what to ' +
      'focus on next.',
  );
  lines.push('');

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalVolume = rows.reduce((v, w) => v + workoutVolume(w), 0);
  const totalSets = rows.reduce((n, w) => n + workoutSetCount(w), 0);
  const offDays = rows.filter((w) => w.offDay).length;
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Sessions: ${rows.length}`);
  lines.push(`- Total sets: ${totalSets}`);
  lines.push(`- Total volume: ${Math.round(totalVolume).toLocaleString()} ${unit}`);
  if (offDays > 0) lines.push(`- Off days (below-par, excluded from "last time"): ${offDays}`);
  lines.push('');

  // ── Sessions ─────────────────────────────────────────────────────────────
  lines.push('## Sessions (newest first)');
  lines.push('');
  for (const w of rows) {
    const mins = durationMin(w);
    const meta = [
      mins != null ? `${mins}m` : null,
      `${workoutSetCount(w)} sets`,
      `${Math.round(workoutVolume(w)).toLocaleString()} ${unit}`,
    ]
      .filter(Boolean)
      .join(' · ');
    lines.push(`### ${fmtDate(w.startedAt)} — ${w.name}${w.offDay ? ' (off day)' : ''}`);
    lines.push(`${meta}`);
    for (const e of w.exercises) {
      const name = getExercise(e.exerciseId)?.name ?? e.exerciseId;
      const sets = e.sets.map((s) => `${s.weight}×${s.reps}`).join(', ');
      lines.push(
        `- ${name}: ${sets} · ${Math.round(exerciseVolume(e.sets)).toLocaleString()} ${unit}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
