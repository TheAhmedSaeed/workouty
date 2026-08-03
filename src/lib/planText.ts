import { Exercise, Template } from '../types';

/** A plan as clean, human-editable Markdown. */
export function planToMarkdown(
  plan: Template,
  getExercise: (id: string) => Exercise | undefined,
): string {
  const lines: string[] = [`# ${plan.name || 'Workout plan'}`];
  const meta =
    `${plan.days.length} day${plan.days.length === 1 ? '' : 's'}/week` +
    (plan.description ? ` · ${plan.description}` : '');
  lines.push(`_${meta}_`, '');

  for (const day of plan.days) {
    lines.push(`## ${day.name}`);
    if (day.exercises.length === 0) lines.push('- (no exercises)');
    for (const te of day.exercises) {
      const name = getExercise(te.exerciseId)?.name ?? 'Exercise';
      lines.push(
        `- ${name}: ${te.targetSets} x ${te.targetRepsMin}-${te.targetRepsMax}`,
      );
    }
    lines.push('');
  }

  lines.push(
    '<!-- Edit freely, then paste back into Workouty → New plan → Import.',
    '     Days start with "## ", exercises are "- Name: SETS x MIN-MAX". -->',
  );
  return lines.join('\n').trim() + '\n';
}

export interface ParsedPlan {
  name: string;
  days: {
    name: string;
    exercises: { name: string; sets: number; repsMin: number; repsMax: number }[];
  }[];
}

/**
 * Parse the Markdown format back into a plan structure (accepts both the ASCII
 * "x"/"-" the export uses and the pretty "×"/"–", and single rep counts).
 * Returns null if it finds no exercises.
 */
export function parsePlanMarkdown(text: string): ParsedPlan | null {
  let name = '';
  const days: ParsedPlan['days'] = [];
  let cur: ParsedPlan['days'][number] | null = null;
  let total = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('<!--') || line.startsWith('_')) continue;
    if (line.startsWith('## ')) {
      cur = { name: line.slice(3).trim(), exercises: [] };
      days.push(cur);
      continue;
    }
    if (line.startsWith('# ')) {
      name = line.slice(2).trim();
      continue;
    }
    // "- Name: 3 x 8-12"  |  "- Name: 3 x 8"
    const range = line.match(
      /^[-*•]?\s*(.+?):\s*(\d+)\s*[x×*]\s*(\d+)\s*[-–—]\s*(\d+)/i,
    );
    const single = line.match(/^[-*•]?\s*(.+?):\s*(\d+)\s*[x×*]\s*(\d+)\s*$/i);
    if ((range || single) && cur) {
      const m = (range ?? single)!;
      const lo = Number(m[3]);
      const hi = range ? Number(m[4]) : lo;
      cur.exercises.push({
        name: m[1].trim(),
        sets: Number(m[2]),
        repsMin: lo,
        repsMax: Math.max(lo, hi),
      });
      total++;
    }
  }

  if (total === 0) return null;
  return { name: name || 'Imported plan', days };
}
