import { Exercise, MUSCLE_LABELS } from '../types';

const muscles = (ms: Exercise['primaryMuscles']) =>
  ms.map((m) => MUSCLE_LABELS[m]).join(', ');

/** Exercises with the muscles they target, as readable Markdown. */
export function exercisesToMarkdown(exercises: Exercise[]): string {
  const lines = [`# Workouty exercises (${exercises.length})`, ''];
  for (const e of exercises) {
    const prim = muscles(e.primaryMuscles) || '—';
    const sec = muscles(e.secondaryMuscles);
    lines.push(
      `- **${e.name}** (${e.category}) — Primary: ${prim}` +
        (sec ? ` · Secondary: ${sec}` : '') +
        (e.isCustom ? ' · _custom_' : ''),
    );
  }
  return lines.join('\n') + '\n';
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Exercises with the muscles they target, as CSV (for a spreadsheet). */
export function exercisesToCsv(exercises: Exercise[]): string {
  const header = [
    'Name',
    'Equipment',
    'Primary muscles',
    'Secondary muscles',
    'Custom',
  ];
  const rows = exercises.map((e) =>
    [
      e.name,
      e.category,
      muscles(e.primaryMuscles),
      muscles(e.secondaryMuscles),
      e.isCustom ? 'yes' : 'no',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...rows].join('\n') + '\n';
}
