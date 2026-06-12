import { Exercise, Template, TemplateDay } from '../types';
import { uid } from './utils';

/**
 * "Ask an AI for a plan" flow: we generate a prompt the user can paste into
 * any AI assistant (Claude, ChatGPT, a coach, ...). The AI answers with JSON
 * in a fixed schema, the user pastes it back, and we import it as a template.
 */

/**
 * The plan exchange format, shown to the user so they can ask any AI:
 * "give me a workout plan in exactly this format".
 */
export const PLAN_FORMAT_EXAMPLE = `{
  "name": "My Plan",
  "description": "optional one-line description",
  "days": [
    {
      "name": "Push",
      "exercises": [
        { "name": "Bench Press (Barbell)", "sets": 3, "repsMin": 8, "repsMax": 12 },
        { "name": "Lateral Raise (Dumbbell)", "sets": 3, "repsMin": 10, "repsMax": 15 }
      ]
    },
    {
      "name": "Pull",
      "exercises": [
        { "name": "Lat Pulldown", "sets": 3, "repsMin": 8, "repsMax": 12 }
      ]
    }
  ]
}`;

/** Short instruction + format, ready to paste into any AI chat. */
export function buildFormatInstruction(): string {
  return `Give me the workout plan as a single JSON object in exactly this format (reply with only the JSON):

${PLAN_FORMAT_EXAMPLE}`;
}

export function buildAIPrompt(exercises: Exercise[], userWishes: string): string {
  const names = exercises.map((e) => e.name).join('; ');
  return `You are a certified strength coach. Create a workout plan for me.

My request: ${userWishes.trim() || 'A balanced muscle-building plan.'}

Rules:
- Reply with ONLY a JSON code block, no other text.
- Prefer exercise names from this list (exact spelling). If you must use an exercise that is not in the list, give it a clear name and fill "primaryMuscles" using only these values: chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs, lower_back, traps.

Available exercises: ${names}

JSON schema:
{
  "name": "Plan name",
  "description": "One sentence about the plan",
  "days": [
    {
      "name": "Day name (e.g. Push)",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "repsMin": 8,
          "repsMax": 12,
          "primaryMuscles": ["chest"]
        }
      ]
    }
  ]
}`;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  template?: Template;
  /** Names that weren't found in the database and were created as custom exercises. */
  createdExercises?: string[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[()\-_,./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function findExercise(name: string, all: Exercise[]): Exercise | undefined {
  const n = normalize(name);
  let exact = all.find((e) => normalize(e.name) === n);
  if (exact) return exact;
  // token-overlap fuzzy match: every word of the shorter name appears in the longer
  const tokens = n.split(' ');
  let best: Exercise | undefined;
  let bestScore = 0;
  for (const e of all) {
    const et = normalize(e.name).split(' ');
    const setE = new Set(et);
    const overlap = tokens.filter((t) => setE.has(t)).length;
    const score = overlap / Math.max(tokens.length, et.length);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return bestScore >= 0.6 ? best : undefined;
}

/** Extract the first JSON object from pasted text (handles ```json fences). */
function extractJSON(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no json');
  return JSON.parse(candidate.slice(start, end + 1));
}

export function importAIPlan(
  text: string,
  allExercises: Exercise[],
  addCustomExercise: (ex: Omit<Exercise, 'id' | 'isCustom'>) => Exercise,
): ImportResult {
  let data: any;
  try {
    data = extractJSON(text);
  } catch {
    return {
      ok: false,
      error:
        "Couldn't find valid JSON in what you pasted. Paste the AI's full JSON answer (the part between { and }).",
    };
  }
  if (!data || typeof data.name !== 'string' || !Array.isArray(data.days)) {
    return { ok: false, error: 'JSON is missing "name" or "days".' };
  }

  const created: string[] = [];
  const pool = [...allExercises];
  const days: TemplateDay[] = [];

  for (const d of data.days) {
    if (!d || typeof d.name !== 'string' || !Array.isArray(d.exercises)) continue;
    const day: TemplateDay = { id: uid(), name: d.name, exercises: [] };
    for (const e of d.exercises) {
      if (!e || typeof e.name !== 'string') continue;
      let ex = findExercise(e.name, pool);
      if (!ex) {
        const muscles = Array.isArray(e.primaryMuscles) ? e.primaryMuscles : [];
        ex = addCustomExercise({
          name: e.name,
          category: 'other',
          primaryMuscles: muscles,
          secondaryMuscles: [],
          description: 'Imported from an AI-generated plan.',
        });
        pool.push(ex);
        created.push(e.name);
      }
      const setsN = Number(e.sets) || 3;
      const lo = Number(e.repsMin) || 8;
      const hi = Number(e.repsMax) || Math.max(lo, 12);
      day.exercises.push({
        exerciseId: ex.id,
        targetSets: Math.min(Math.max(setsN, 1), 10),
        targetRepsMin: lo,
        targetRepsMax: hi,
      });
    }
    if (day.exercises.length > 0) days.push(day);
  }

  if (days.length === 0) {
    return { ok: false, error: 'No valid days/exercises found in the JSON.' };
  }

  const template: Template = {
    id: uid(),
    name: data.name,
    description:
      typeof data.description === 'string' ? data.description : undefined,
    days,
    createdAt: new Date().toISOString(),
  };
  return { ok: true, template, createdExercises: created };
}
