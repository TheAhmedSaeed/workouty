import { Exercise } from '../types';

/**
 * Demonstration images for built-in exercises, served from the open-source
 * free-exercise-db (https://github.com/yuhonas/free-exercise-db, public
 * domain). Each exercise has a start-position and end-position photo; the
 * app alternates them to animate the movement like a GIF.
 *
 * All URLs verified working at build time.
 */
const BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

const DEMO_IDS: Record<string, string> = {
  'bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'incline-bench-press': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'db-bench-press': 'Dumbbell_Bench_Press',
  'incline-db-press': 'Incline_Dumbbell_Press',
  'chest-fly-machine': 'Butterfly',
  'cable-fly': 'Cable_Crossover',
  'push-up': 'Pushups',
  dips: 'Dips_-_Chest_Version',
  'pull-up': 'Pullups',
  'chin-up': 'Chin-Up',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'barbell-row': 'Bent_Over_Barbell_Row',
  'db-row': 'One-Arm_Dumbbell_Row',
  'seated-cable-row': 'Seated_Cable_Rows',
  't-bar-row': 'T-Bar_Row_with_Handle',
  'face-pull': 'Face_Pull',
  'overhead-press': 'Standing_Military_Press',
  'db-shoulder-press': 'Dumbbell_Shoulder_Press',
  'lateral-raise': 'Side_Lateral_Raise',
  'cable-lateral-raise': 'One-Arm_Side_Laterals',
  'rear-delt-fly': 'Reverse_Machine_Flyes',
  'upright-row': 'Upright_Barbell_Row',
  shrug: 'Dumbbell_Shrug',
  'barbell-curl': 'Barbell_Curl',
  'db-curl': 'Dumbbell_Bicep_Curl',
  'hammer-curl': 'Hammer_Curls',
  'preacher-curl': 'Machine_Preacher_Curls',
  'cable-curl': 'Standing_Biceps_Cable_Curl',
  'triceps-pushdown': 'Triceps_Pushdown',
  'overhead-triceps-extension': 'Cable_Rope_Overhead_Triceps_Extension',
  'skull-crusher': 'Lying_Triceps_Press',
  'close-grip-bench': 'Close-Grip_Barbell_Bench_Press',
  squat: 'Barbell_Squat',
  'front-squat': 'Front_Barbell_Squat',
  'leg-press': 'Leg_Press',
  'hack-squat': 'Hack_Squat',
  'leg-extension': 'Leg_Extensions',
  lunge: 'Dumbbell_Lunges',
  'bulgarian-split-squat': 'Split_Squat_with_Dumbbells',
  deadlift: 'Barbell_Deadlift',
  'romanian-deadlift': 'Romanian_Deadlift',
  'leg-curl': 'Lying_Leg_Curls',
  'hip-thrust': 'Barbell_Hip_Thrust',
  'good-morning': 'Good_Morning',
  'back-extension': 'Hyperextensions_Back_Extensions',
  'standing-calf-raise': 'Standing_Calf_Raises',
  'seated-calf-raise': 'Seated_Calf_Raise',
  plank: 'Plank',
  'crunch-cable': 'Cable_Crunch',
  'hanging-leg-raise': 'Hanging_Leg_Raise',
  'ab-wheel': 'Ab_Roller',
  'russian-twist': 'Russian_Twist',
  'wrist-curl': 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench',
  'farmers-carry': 'Farmers_Walk',
};

/** Start/end position frames for an exercise, or null if none available. */
export function demoFrames(exerciseId: string): [string, string] | null {
  const id = DEMO_IDS[exerciseId];
  if (!id) return null;
  return [`${BASE}/${id}/0.jpg`, `${BASE}/${id}/1.jpg`];
}

/** YouTube search for a how-to video — always current, never a dead link. */
export function youtubeSearchUrl(exercise: Exercise): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${exercise.name} how to proper form`,
  )}`;
}
