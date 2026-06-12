import { Exercise } from '../types';

/**
 * Built-in exercise database. Each exercise carries the muscles it targets
 * and a plain-language description, so the app can explain what you're
 * training and analyse whether a plan covers the whole body.
 */
export const EXERCISES: Exercise[] = [
  // ── Chest ──────────────────────────────────────────────────────────────
  {
    id: 'bench-press',
    name: 'Bench Press (Barbell)',
    category: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    description:
      'The classic horizontal press. Builds the whole chest with heavy loading; front delts and triceps assist.',
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press (Barbell)',
    category: 'barbell',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
    description:
      'Pressing on an incline shifts emphasis to the upper chest and front delts.',
  },
  {
    id: 'db-bench-press',
    name: 'Bench Press (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    description:
      'Dumbbells allow a deeper stretch and even left/right loading. Great chest builder with extra stabiliser work.',
  },
  {
    id: 'incline-db-press',
    name: 'Incline Press (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
    description:
      'Targets the upper chest fibres with a long range of motion. A staple on push days.',
  },
  {
    id: 'chest-fly-machine',
    name: 'Chest Fly (Machine / Pec Deck)',
    category: 'machine',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    description:
      'Isolates the chest without triceps involvement. Good for stretching and squeezing the pecs at higher reps.',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly (Crossover)',
    category: 'cable',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    description:
      'Constant cable tension through the whole arc. Adjust pulley height to bias upper, mid or lower chest.',
  },
  {
    id: 'push-up',
    name: 'Push Up',
    category: 'bodyweight',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders', 'abs'],
    description:
      'Bodyweight horizontal push. Works chest, triceps and front delts and trains the core as a stabiliser.',
  },
  {
    id: 'dips',
    name: 'Dips (Chest)',
    category: 'bodyweight',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    description:
      'Leaning forward on dips emphasises the lower chest; staying upright shifts work to the triceps.',
  },

  // ── Back ───────────────────────────────────────────────────────────────
  {
    id: 'pull-up',
    name: 'Pull Up',
    category: 'bodyweight',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    description:
      'The king of vertical pulls. Builds lat width; biceps and grip work hard too.',
  },
  {
    id: 'chin-up',
    name: 'Chin Up',
    category: 'bodyweight',
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['forearms'],
    description:
      'Underhand pull up. Slightly more biceps involvement than a regular pull up while still hammering the lats.',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'cable',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    description:
      'Machine version of the pull up — easy to load progressively for lat width.',
  },
  {
    id: 'barbell-row',
    name: 'Bent Over Row (Barbell)',
    category: 'barbell',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'lower_back', 'traps'],
    description:
      'Heavy horizontal pull for back thickness. The hinge position also loads the lower back isometrically.',
  },
  {
    id: 'db-row',
    name: 'One-Arm Row (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    description:
      'Supported single-arm row. Lets you row heavy with little lower-back stress and fix side-to-side imbalances.',
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    category: 'cable',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'traps'],
    description:
      'Smooth horizontal pull for mid-back thickness with constant cable tension.',
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    category: 'machine',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'traps', 'lower_back'],
    description:
      'Chest-angle row that allows heavy loading for overall back mass.',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    category: 'cable',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['back'],
    description:
      'Pull rope to your face with elbows high. Trains rear delts and upper back — great for posture and shoulder health.',
  },

  // ── Shoulders ──────────────────────────────────────────────────────────
  {
    id: 'overhead-press',
    name: 'Overhead Press (Barbell)',
    category: 'barbell',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'abs', 'traps'],
    description:
      'Standing strict press. Builds strong front and side delts; the core braces hard to keep you upright.',
  },
  {
    id: 'db-shoulder-press',
    name: 'Shoulder Press (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps'],
    description:
      'Seated or standing dumbbell press. A natural pressing path with even loading per arm.',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    description:
      'Isolates the side delts, the muscle that gives shoulders width. Light weight, strict form, higher reps.',
  },
  {
    id: 'cable-lateral-raise',
    name: 'Lateral Raise (Cable)',
    category: 'cable',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    description:
      'Cable keeps tension on the side delt even at the bottom of the movement.',
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly (Machine / Reverse Pec Deck)',
    category: 'machine',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps', 'back'],
    description:
      'Isolates the rear delts — often undertrained and key for balanced, healthy shoulders.',
  },
  {
    id: 'upright-row',
    name: 'Upright Row',
    category: 'barbell',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['biceps'],
    description:
      'Vertical pull along the body that hits side delts and traps together.',
  },
  {
    id: 'shrug',
    name: 'Shrug (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['traps'],
    secondaryMuscles: ['forearms'],
    description: 'Direct upper-trap work — shrug up, squeeze, lower slowly.',
  },

  // ── Biceps ─────────────────────────────────────────────────────────────
  {
    id: 'barbell-curl',
    name: 'Bicep Curl (Barbell)',
    category: 'barbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    description: 'The classic mass builder for the biceps with heavy two-arm loading.',
  },
  {
    id: 'db-curl',
    name: 'Bicep Curl (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    description:
      'Curl with supination per arm. Even loading and a strong peak contraction.',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    description:
      'Neutral-grip curl that targets the brachialis and forearms for thicker-looking arms.',
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    category: 'machine',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    description:
      'The pad removes momentum so the biceps do all the work, especially in the stretched position.',
  },
  {
    id: 'cable-curl',
    name: 'Bicep Curl (Cable)',
    category: 'cable',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    description: 'Constant tension through the whole curl — great as a finisher.',
  },

  // ── Triceps ────────────────────────────────────────────────────────────
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown (Cable)',
    category: 'cable',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    description:
      'Push the cable down with elbows pinned. Simple, joint-friendly triceps isolation.',
  },
  {
    id: 'overhead-triceps-extension',
    name: 'Overhead Triceps Extension (Cable/DB)',
    category: 'cable',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    description:
      'Trains the long head of the triceps in a deep stretch — the head that adds most arm size.',
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher (EZ Bar)',
    category: 'barbell',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    description:
      'Lying triceps extension. Lower to the forehead, extend back up — heavy direct triceps work.',
  },
  {
    id: 'close-grip-bench',
    name: 'Close-Grip Bench Press',
    category: 'barbell',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['shoulders'],
    description:
      'Narrow-grip bench that lets you overload the triceps with compound weight.',
  },

  // ── Quads / legs ───────────────────────────────────────────────────────
  {
    id: 'squat',
    name: 'Squat (Barbell)',
    category: 'barbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'lower_back', 'abs'],
    description:
      'The fundamental lower-body lift. Quads and glutes drive the movement; the whole trunk braces.',
  },
  {
    id: 'front-squat',
    name: 'Front Squat (Barbell)',
    category: 'barbell',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'abs'],
    description:
      'Bar on the front rack keeps the torso upright and shifts more work onto the quads and core.',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'machine',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    description:
      'Heavy quad and glute work without loading the spine. Foot position changes the emphasis.',
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat (Machine)',
    category: 'machine',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    description:
      'Guided squat pattern that keeps tension on the quads through a deep range.',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    category: 'machine',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    description:
      'Pure quad isolation — the only way to fully isolate the quads, ideal after compound work.',
  },
  {
    id: 'lunge',
    name: 'Walking Lunge (Dumbbell)',
    category: 'dumbbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    description:
      'Single-leg strength, balance and a big glute stretch on every step.',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    category: 'dumbbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    description:
      'Rear-foot-elevated split squat. Brutal but one of the best single-leg quad and glute builders.',
  },

  // ── Hamstrings / glutes / posterior chain ──────────────────────────────
  {
    id: 'deadlift',
    name: 'Deadlift (Barbell)',
    category: 'barbell',
    primaryMuscles: ['hamstrings', 'glutes', 'lower_back'],
    secondaryMuscles: ['back', 'traps', 'forearms', 'quads'],
    description:
      'Lift the bar from the floor. Trains the entire posterior chain and grip — the biggest total-body pull.',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift (Barbell)',
    category: 'barbell',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['lower_back', 'forearms'],
    description:
      'Hip hinge with a big hamstring stretch — the best hamstring builder with a barbell.',
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl (Machine)',
    category: 'machine',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['calves'],
    description:
      'Isolates the hamstrings through knee flexion — pairs perfectly with RDLs which work them at the hip.',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust (Barbell)',
    category: 'barbell',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'quads'],
    description:
      'Drive the hips up against the bar. The most direct heavy glute exercise there is.',
  },
  {
    id: 'good-morning',
    name: 'Good Morning (Barbell)',
    category: 'barbell',
    primaryMuscles: ['hamstrings', 'lower_back'],
    secondaryMuscles: ['glutes'],
    description:
      'Barbell hinge from the shoulders that strengthens hamstrings and spinal erectors.',
  },
  {
    id: 'back-extension',
    name: 'Back Extension (Hyperextension)',
    category: 'bodyweight',
    primaryMuscles: ['lower_back', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    description:
      'Bodyweight or loaded extensions for the lower back and glutes — great accessory for deadlift health.',
  },

  // ── Calves ─────────────────────────────────────────────────────────────
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    category: 'machine',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    description:
      'Straight-leg calf raise hitting the gastrocnemius. Full stretch at the bottom, pause at the top.',
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    category: 'machine',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    description:
      'Bent-knee raise that biases the soleus, the deeper calf muscle.',
  },

  // ── Abs / core ─────────────────────────────────────────────────────────
  {
    id: 'plank',
    name: 'Plank',
    category: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['lower_back', 'shoulders'],
    description:
      'Isometric brace for the whole core. Log time as reps (seconds).',
  },
  {
    id: 'crunch-cable',
    name: 'Cable Crunch',
    category: 'cable',
    primaryMuscles: ['abs'],
    secondaryMuscles: [],
    description:
      'Kneeling crunch against cable resistance — lets you progressively overload the abs.',
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['forearms'],
    description:
      'Raise legs while hanging from a bar. Strong lower-ab and hip-flexor work, plus grip.',
  },
  {
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    category: 'other',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['shoulders', 'lower_back'],
    description:
      'Roll out and resist the extension — one of the hardest and most effective ab exercises.',
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: [],
    description: 'Rotational core work for the obliques.',
  },

  // ── Forearms ───────────────────────────────────────────────────────────
  {
    id: 'wrist-curl',
    name: 'Wrist Curl',
    category: 'dumbbell',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    description: 'Direct forearm flexor work for grip and forearm size.',
  },
  {
    id: 'farmers-carry',
    name: "Farmer's Carry",
    category: 'dumbbell',
    primaryMuscles: ['forearms', 'traps'],
    secondaryMuscles: ['abs', 'shoulders'],
    description:
      'Pick up heavy dumbbells and walk. Trains grip, traps and total-body stability. Log distance/time as reps.',
  },
];

export const EXERCISE_MAP: Map<string, Exercise> = new Map(
  EXERCISES.map((e) => [e.id, e]),
);
