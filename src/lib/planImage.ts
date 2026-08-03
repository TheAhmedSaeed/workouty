import { Exercise, Template } from '../types';

/**
 * Render a plan to a PNG the user can save/share. Drawn directly on a canvas
 * with the 2D API — no dependencies, works offline and on every browser
 * (including mobile Safari, which struggles with DOM-to-image libraries).
 */
export async function planToPngBlob(
  plan: Template,
  getExercise: (id: string) => Exercise | undefined,
): Promise<Blob> {
  const scale = 2;
  const W = 720;
  const PAD = 28;
  const fam = "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif";
  const F = (size: number, weight = '400') => `${weight} ${size}px ${fam}`;

  const meas = document.createElement('canvas').getContext('2d')!;
  const width = (t: string, f: string) => {
    meas.font = f;
    return meas.measureText(t).width;
  };
  const clip = (t: string, f: string, max: number) => {
    if (width(t, f) <= max) return t;
    let s = t;
    while (s.length > 1 && width(s + '…', f) > max) s = s.slice(0, -1);
    return s + '…';
  };

  interface Op {
    t: string;
    x: number;
    y: number;
    f: string;
    c: string;
    a?: CanvasTextAlign;
  }
  const ops: Op[] = [];

  let y = PAD + 24;
  ops.push({ t: plan.name || 'Workout plan', x: PAD, y, f: F(30, '800'), c: '#e8edf2' });
  y += 22;
  const sub =
    `${plan.days.length} day${plan.days.length === 1 ? '' : 's'}/week` +
    (plan.description ? ` · ${plan.description}` : '');
  ops.push({ t: sub, x: PAD, y, f: F(15), c: '#8b98a5' });
  y += 8;

  for (const day of plan.days) {
    y += 24;
    ops.push({ t: day.name, x: PAD, y, f: F(20, '700'), c: '#2f81f7' });
    y += 24;
    if (day.exercises.length === 0) {
      ops.push({ t: 'No exercises', x: PAD, y, f: F(15), c: '#5f6c7a' });
      y += 26;
    }
    for (const te of day.exercises) {
      const name = getExercise(te.exerciseId)?.name ?? 'Exercise';
      const reps = `${te.targetSets} × ${te.targetRepsMin}–${te.targetRepsMax}`;
      const rf = F(15);
      const nf = F(16);
      const nfit = clip(name, nf, W - PAD * 2 - width(reps, rf) - 18);
      ops.push({ t: nfit, x: PAD, y, f: nf, c: '#e8edf2' });
      ops.push({ t: reps, x: W - PAD, y, f: rf, c: '#8b98a5', a: 'right' });
      y += 26;
    }
    y += 6;
  }

  y += 24;
  ops.push({ t: 'Made with Workouty', x: PAD, y, f: F(13), c: '#5f6c7a' });
  const H = y + PAD - 10;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  for (const op of ops) {
    ctx.font = op.f;
    ctx.fillStyle = op.c;
    ctx.textAlign = op.a ?? 'left';
    ctx.fillText(op.t, op.x, op.y);
  }

  return await new Promise<Blob>((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not create image.'))),
        'image/png',
      );
    } else {
      // very old browser fallback
      fetch(canvas.toDataURL('image/png')).then((r) => r.blob()).then(resolve, reject);
    }
  });
}

/** Generate the plan PNG and trigger a download. */
export async function downloadPlanPng(
  plan: Template,
  getExercise: (id: string) => Exercise | undefined,
): Promise<void> {
  const blob = await planToPngBlob(plan, getExercise);
  const url = URL.createObjectURL(blob);
  const slug =
    (plan.name || 'plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'plan';
  const a = document.createElement('a');
  a.href = url;
  a.download = `workouty-${slug}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
