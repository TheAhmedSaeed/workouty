// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { StoreProvider } from '../state/store';
import { generatePlan } from '../lib/planGenerator';
import { buildAIPrompt, importAIPlan } from '../lib/aiPlan';
import { EXERCISES, EXERCISE_MAP } from '../data/exercises';
import { demoFrames, youtubeSearchUrl } from '../data/demos';
import {
  exerciseHistory,
  lastPerformance,
  templateMuscleSets,
  weeklySeries,
  workoutVolume,
} from '../lib/stats';
import { Exercise, Workout } from '../types';

// recharts ResponsiveContainer needs ResizeObserver, absent in jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = RO;

const renderApp = () =>
  render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe('plan generator', () => {
  it('generates valid plans for every configuration', () => {
    for (const days of [2, 3, 4, 5, 6] as const) {
      for (const goal of ['strength', 'hypertrophy', 'general'] as const) {
        for (const exp of ['beginner', 'intermediate', 'advanced'] as const) {
          const t = generatePlan({ daysPerWeek: days, goal, experience: exp });
          expect(t.days.length).toBe(days);
          for (const d of t.days)
            for (const te of d.exercises) {
              expect(EXERCISE_MAP.has(te.exerciseId)).toBe(true);
              expect(te.targetSets).toBeGreaterThan(0);
              expect(te.targetRepsMin).toBeLessThanOrEqual(te.targetRepsMax);
            }
        }
      }
    }
  });

  it('6-day PPL covers all major muscles adequately', () => {
    const t = generatePlan({
      daysPerWeek: 6,
      goal: 'hypertrophy',
      experience: 'intermediate',
    });
    const sets = templateMuscleSets(t, (id) => EXERCISE_MAP.get(id));
    for (const m of ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps'] as const)
      expect(sets[m]).toBeGreaterThanOrEqual(8);
  });
});

describe('AI plan import', () => {
  it('builds a prompt containing schema and exercise names', () => {
    const p = buildAIPrompt(EXERCISES, '4 day upper lower');
    expect(p).toContain('JSON schema');
    expect(p).toContain('Bench Press (Barbell)');
    expect(p).toContain('4 day upper lower');
  });

  it('imports a JSON plan, fuzzy-matching names and creating unknowns', () => {
    const created: Exercise[] = [];
    const addCustom = (ex: Omit<Exercise, 'id' | 'isCustom'>): Exercise => {
      const full = { ...ex, id: `custom-${created.length}`, isCustom: true };
      created.push(full);
      return full;
    };
    const answer = `Here is your plan:
\`\`\`json
{
  "name": "Test Plan",
  "description": "desc",
  "days": [
    {
      "name": "Day 1",
      "exercises": [
        { "name": "Barbell Bench Press", "sets": 4, "repsMin": 6, "repsMax": 10 },
        { "name": "Zercher Squat", "sets": 3, "repsMin": 5, "repsMax": 8, "primaryMuscles": ["quads"] }
      ]
    }
  ]
}
\`\`\``;
    const res = importAIPlan(answer, EXERCISES, addCustom);
    expect(res.ok).toBe(true);
    const day = res.template!.days[0];
    expect(day.exercises[0].exerciseId).toBe('bench-press'); // fuzzy matched
    expect(res.createdExercises).toEqual(['Zercher Squat']);
    expect(created[0].primaryMuscles).toEqual(['quads']);
  });

  it('rejects garbage input with a friendly error', () => {
    const res = importAIPlan('not json at all', EXERCISES, () => {
      throw new Error('should not be called');
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});

describe('stats', () => {
  const w = (daysAgo: number, weight: number): Workout => ({
    id: `w${daysAgo}`,
    name: 'Push',
    startedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    finishedAt: new Date(Date.now() - daysAgo * 86400000 + 3600000).toISOString(),
    exercises: [
      {
        exerciseId: 'bench-press',
        sets: [
          { weight, reps: 8, completed: true, type: 'normal' },
          { weight, reps: 6, completed: true, type: 'normal' },
          { weight: 40, reps: 10, completed: true, type: 'warmup' },
          { weight: 100, reps: 10, completed: false, type: 'normal' },
        ],
      },
    ],
  });

  it('volume counts only completed working sets', () => {
    expect(workoutVolume(w(0, 80))).toBe(80 * 8 + 80 * 6);
  });

  it('lastPerformance returns the most recent workout sets', () => {
    const workouts = [w(10, 70), w(2, 80)];
    const last = lastPerformance(workouts, 'bench-press');
    expect(last!.sets[0].weight).toBe(80);
  });

  it('exerciseHistory is chronological with correct best weight', () => {
    const hist = exerciseHistory([w(10, 70), w(2, 80)], 'bench-press');
    expect(hist.length).toBe(2);
    expect(hist[0].bestWeight).toBe(70);
    expect(hist[1].bestWeight).toBe(80);
  });

  it('weeklySeries buckets workouts into the current week', () => {
    const series = weeklySeries([w(0, 80)]);
    expect(series[series.length - 1].workouts).toBe(1);
  });
});

describe('exercise demos', () => {
  it('every built-in exercise has demo frames and a YouTube link', () => {
    for (const ex of EXERCISES) {
      const frames = demoFrames(ex.id);
      expect(frames, `missing demo for ${ex.id}`).not.toBeNull();
      expect(frames![0]).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.*\/0\.jpg$/);
      expect(frames![1]).toMatch(/\/1\.jpg$/);
      expect(youtubeSearchUrl(ex)).toContain('youtube.com/results');
    }
  });

  it('exercise detail modal shows the animated demo and YouTube button', () => {
    renderApp();
    fireEvent.click(screen.getByText('Exercises'));
    fireEvent.click(screen.getByText('Bench Press (Barbell)'));
    expect(screen.getByAltText('Start position')).toBeTruthy();
    expect(screen.getByAltText('End position')).toBeTruthy();
    const yt = screen.getByText(/Watch how-to video on YouTube/) as HTMLAnchorElement;
    expect(yt.href).toContain('youtube.com/results');
    expect(yt.target).toBe('_blank');
  });
});

describe('app UI', () => {
  it('renders home, navigates all tabs without crashing', () => {
    renderApp();
    expect(screen.getByText('Workouty')).toBeTruthy();
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText(/No workouts logged yet/)).toBeTruthy();
    fireEvent.click(screen.getByText('Analytics'));
    expect(screen.getByText(/Charts appear here/)).toBeTruthy();
    fireEvent.click(screen.getByText('Exercises'));
    expect(screen.getByText('Bench Press (Barbell)')).toBeTruthy();
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Kilograms (kg)')).toBeTruthy();
    // cloud sync section is offered when not configured
    expect(screen.getByText('☁️ Set up cloud sync')).toBeTruthy();
  });

  it('full flow: generate plan, start day, log sets, finish, see history & analytics', () => {
    renderApp();

    // generate a plan via the wizard
    fireEvent.click(screen.getByRole('button', { name: '＋ New plan' }));
    fireEvent.click(screen.getByText('✨ Generate for me'));
    fireEvent.click(screen.getByText('3 days'));
    fireEvent.click(screen.getByText('Build muscle'));
    fireEvent.click(screen.getByText('✨ Generate plan'));
    fireEvent.click(screen.getByText('✓ Save this plan'));
    expect(screen.getByText('Full Body ×3')).toBeTruthy();

    // start the first day
    fireEvent.click(screen.getAllByText('Start')[0]);
    expect(screen.getByText(/Full Body ×3 — Full Body A/)).toBeTruthy();

    // log the first set of the first exercise (Squat)
    const weightInputs = screen
      .getAllByRole('spinbutton')
      .filter((i) => (i as HTMLInputElement).placeholder === '0');
    fireEvent.change(weightInputs[0], { target: { value: '100' } });
    fireEvent.change(weightInputs[1], { target: { value: '5' } });
    fireEvent.click(screen.getAllByText('✓')[0]);

    // finish
    fireEvent.click(screen.getByText('✓ Finish workout'));
    fireEvent.click(screen.getByText('✓ Finish'));

    // history shows it
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText(/1 exercises · 1 sets/)).toBeTruthy();

    // analytics overview renders with data
    fireEvent.click(screen.getByText('Analytics'));
    expect(screen.getByText('Total sets')).toBeTruthy();

    // per-exercise view has the squat
    fireEvent.click(screen.getByText('Per exercise'));
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'squat' } });
    expect(screen.getByText(/Heaviest set per workout/)).toBeTruthy();
  });

  it('imports a pasted JSON plan via the Import option', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: '＋ New plan' }));
    fireEvent.click(screen.getByText('📥 Import / paste JSON'));
    const json = JSON.stringify({
      name: 'Pasted Plan',
      days: [
        {
          name: 'Day 1',
          exercises: [{ name: 'Squat (Barbell)', sets: 5, repsMin: 5, repsMax: 5 }],
        },
      ],
    });
    fireEvent.change(
      screen.getByPlaceholderText(/"name": "My Plan"/),
      { target: { value: json } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Import plan' }));
    expect(screen.getByText('Plan imported 🎉')).toBeTruthy();
    fireEvent.click(screen.getByText('Done'));
    expect(screen.getByText('Pasted Plan')).toBeTruthy();
    expect(screen.getByText(/1 day \/ week/)).toBeTruthy();
  });

  it('shows last-time hints when repeating a workout day', () => {
    renderApp();
    // build a tiny manual plan
    fireEvent.click(screen.getByRole('button', { name: '＋ New plan' }));
    fireEvent.click(screen.getByText('🛠️ Build manually'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Push Pull Legs'), {
      target: { value: 'Mini' },
    });
    fireEvent.click(screen.getByText('＋ Add exercise'));
    fireEvent.change(screen.getByPlaceholderText('Search by name or muscle…'), {
      target: { value: 'Bench Press (Barbell)' },
    });
    fireEvent.click(screen.getByText('Bench Press (Barbell)'));
    fireEvent.click(screen.getByText('Save plan'));

    // first session: log 60kg x 8
    fireEvent.click(screen.getAllByText('Start')[0]);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '60' } });
    fireEvent.change(inputs[1], { target: { value: '8' } });
    fireEvent.click(screen.getAllByText('✓')[0]);
    fireEvent.click(screen.getByText('✓ Finish workout'));
    fireEvent.click(screen.getByText('✓ Finish'));

    // second session: previous performance is shown and pre-filled
    fireEvent.click(screen.getAllByText('Start')[0]);
    expect(screen.getByText(/Last time/)).toBeTruthy();
    expect(screen.getByText('60 kg × 8')).toBeTruthy();
    const prefilled = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(prefilled[0].value).toBe('60');
    expect(prefilled[1].value).toBe('8');
  });
});
