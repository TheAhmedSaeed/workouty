import { MuscleGroup, Workout } from '../types';
import { Exercise } from '../types';

/** A single stretch with clear, do-it-now instructions. */
export interface Stretch {
  id: string;
  name: string;
  /** Muscles this stretch opens up. */
  muscles: MuscleGroup[];
  /** Step-by-step "how to do it". */
  how: string;
  /** Recommended hold in seconds. */
  hold: number;
  /** True if you repeat it on each side. */
  perSide?: boolean;
}

export const STRETCHES: Stretch[] = [
  {
    id: 'neck-release',
    name: 'Neck release',
    muscles: ['traps'],
    how: 'Sit or stand tall. Gently drop your right ear toward your right shoulder, resting your right hand on your head for a light pull. Feel the stretch along the left of your neck. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'chest-doorway',
    name: 'Doorway chest stretch',
    muscles: ['chest', 'shoulders'],
    how: 'Stand in a doorway, forearms on the frame, elbows about shoulder height. Step one foot through and lean forward until you feel an open stretch across your chest.',
    hold: 30,
  },
  {
    id: 'cross-body-shoulder',
    name: 'Cross-body shoulder stretch',
    muscles: ['shoulders'],
    how: 'Bring one arm straight across your chest. Use the other arm to hug it in closer. Keep the shoulder down, not shrugged. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'overhead-triceps',
    name: 'Overhead triceps stretch',
    muscles: ['triceps'],
    how: 'Reach one arm overhead and bend the elbow so your hand drops behind your neck. With the other hand, gently press the elbow back and down. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'biceps-wall',
    name: 'Wall biceps stretch',
    muscles: ['biceps'],
    how: 'Place your palm flat on a wall behind you at shoulder height, arm straight. Slowly turn your body away from the wall until you feel a stretch through the biceps and forearm. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'wrist-forearm',
    name: 'Wrist & forearm stretch',
    muscles: ['forearms'],
    how: 'Extend one arm forward, palm up. With the other hand, gently pull the fingers down and back toward the floor. Then flip the palm down and repeat. Switch sides.',
    hold: 15,
    perSide: true,
  },
  {
    id: 'cat-cow',
    name: 'Cat–cow',
    muscles: ['lower_back', 'back', 'abs'],
    how: 'On hands and knees, inhale and drop your belly while lifting your chest and tailbone (cow). Exhale and round your spine toward the ceiling, tucking your chin (cat). Flow slowly between the two.',
    hold: 30,
  },
  {
    id: 'childs-pose',
    name: "Child's pose",
    muscles: ['back', 'lower_back'],
    how: 'From hands and knees, sit your hips back onto your heels and reach your arms forward along the floor. Let your chest sink and breathe into your back.',
    hold: 30,
  },
  {
    id: 'seated-twist',
    name: 'Seated spinal twist',
    muscles: ['back', 'abs'],
    how: 'Sit tall, legs extended. Cross one foot over the opposite thigh. Twist your torso toward the bent knee, using your opposite elbow against it for a gentle rotation. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'cobra',
    name: 'Cobra stretch',
    muscles: ['abs'],
    how: 'Lie face down, hands under your shoulders. Press gently to lift your chest, keeping hips on the floor and shoulders relaxed away from your ears. Stop where it feels good, not pinched.',
    hold: 20,
  },
  {
    id: 'forward-fold',
    name: 'Standing forward fold',
    muscles: ['hamstrings', 'lower_back'],
    how: 'Stand with feet hip-width. Hinge at the hips and let your upper body hang toward the floor, knees softly bent. Let your head and arms dangle heavy.',
    hold: 30,
  },
  {
    id: 'quad-stretch',
    name: 'Standing quad stretch',
    muscles: ['quads'],
    how: 'Stand tall (hold a wall for balance). Bend one knee and grab your ankle behind you, drawing the heel toward your glute. Keep knees together and hips forward. Switch sides.',
    hold: 25,
    perSide: true,
  },
  {
    id: 'figure-four',
    name: 'Figure-four glute stretch',
    muscles: ['glutes'],
    how: 'Lie on your back. Cross one ankle over the opposite thigh. Reach through and pull the back thigh toward your chest until you feel it in the glute. Switch sides.',
    hold: 25,
    perSide: true,
  },
  {
    id: 'hip-flexor-lunge',
    name: 'Kneeling hip-flexor stretch',
    muscles: ['quads', 'glutes'],
    how: 'Kneel on one knee with the other foot flat in front (half-kneel). Tuck your pelvis and shift your weight gently forward until you feel a stretch at the front of the down-leg hip. Switch sides.',
    hold: 25,
    perSide: true,
  },
  {
    id: 'calf-wall',
    name: 'Wall calf stretch',
    muscles: ['calves'],
    how: 'Stand facing a wall, hands on it. Step one foot back, heel down, back leg straight. Lean into the wall until you feel the calf stretch. Switch sides.',
    hold: 25,
    perSide: true,
  },
  {
    id: 'lat-side-reach',
    name: 'Overhead side reach',
    muscles: ['back', 'chest'],
    how: 'Stand tall, reach both arms overhead and clasp your hands. Lean gently to one side, feeling the stretch along your ribs and lats. Switch sides.',
    hold: 20,
    perSide: true,
  },
  {
    id: 'worlds-greatest',
    name: "World's greatest stretch",
    muscles: ['quads', 'glutes', 'hamstrings', 'back'],
    how: 'Step into a deep lunge. Place both hands inside the front foot, then rotate the same-side arm up toward the ceiling, following your hand with your eyes. Return and switch sides.',
    hold: 20,
    perSide: true,
  },
];

const BY_ID = new Map(STRETCHES.map((s) => [s.id, s]));

/** A friendly full-body wake-up routine for rest days. */
const GENERAL_ROUTINE = [
  'neck-release',
  'cat-cow',
  'childs-pose',
  'forward-fold',
  'quad-stretch',
  'figure-four',
  'chest-doorway',
  'worlds-greatest',
].map((id) => BY_ID.get(id)!);

/** A how-to video search that's always current (never a dead link). */
export function stretchVideoUrl(stretch: Stretch): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${stretch.name} stretch how to`,
  )}`;
}

export interface StretchRoutine {
  /** True when we fell back to the general rest-day routine. */
  general: boolean;
  /** Muscles trained the previous day that we're targeting. */
  targetMuscles: MuscleGroup[];
  stretches: Stretch[];
}

/** Muscles trained on the calendar day before `nowMs`. */
export function musclesTrainedYesterday(
  workouts: Workout[],
  getExercise: (id: string) => Exercise | undefined,
  nowMs: number,
): MuscleGroup[] {
  const d = new Date(nowMs);
  const startToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const startYesterday = startToday - 86400000;
  const freq = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    const t = new Date(w.startedAt).getTime();
    if (t < startYesterday || t >= startToday) continue;
    for (const we of w.exercises) {
      const ex = getExercise(we.exerciseId);
      if (!ex) continue;
      for (const m of ex.primaryMuscles) freq.set(m, (freq.get(m) ?? 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

/**
 * Build a morning stretch routine. If you trained the previous day, it targets
 * those muscles (most-worked first); otherwise it returns a general full-body
 * wake-up routine.
 */
export function morningStretchRoutine(
  workouts: Workout[],
  getExercise: (id: string) => Exercise | undefined,
  nowMs: number,
): StretchRoutine {
  const targetMuscles = musclesTrainedYesterday(workouts, getExercise, nowMs);
  if (targetMuscles.length === 0)
    return { general: true, targetMuscles: [], stretches: GENERAL_ROUTINE };

  const chosen: Stretch[] = [];
  const seen = new Set<string>();
  // For each trained muscle (most-worked first), add stretches that hit it.
  for (const m of targetMuscles) {
    for (const s of STRETCHES) {
      if (seen.has(s.id) || !s.muscles.includes(m)) continue;
      seen.add(s.id);
      chosen.push(s);
      if (chosen.length >= 6) break;
    }
    if (chosen.length >= 6) break;
  }
  return { general: false, targetMuscles, stretches: chosen };
}
