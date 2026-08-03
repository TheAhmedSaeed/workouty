import {
  Exercise,
  MUSCLE_LABELS,
  Template,
  TemplateDay,
  Workout,
} from '../types';
import { weekAdherence, weekStartSunday } from '../lib/weeks';
import { dayReadiness, muscleLastTrained } from '../lib/readiness';
import { downloadPlanPng } from '../lib/planImage';
import { formatDate } from '../lib/utils';

/**
 * Home-screen focus on the current plan: each day with a Start button that's
 * disabled once you've done it this week, and a muscle-recovery readiness line
 * (48h rest) so you know whether you're ready to train it.
 */
export function CurrentPlanFocus({
  plan,
  workouts,
  getExercise,
  onStart,
  onExportText,
}: {
  plan: Template;
  workouts: Workout[];
  getExercise: (id: string) => Exercise | undefined;
  onStart: (t: Template, d: TemplateDay) => void;
  onExportText: () => void;
}) {
  const week = weekAdherence(workouts, plan, weekStartSunday(new Date()));
  const doneThisWeek = new Set(week.doneDayIds);
  const lastTrained = muscleLastTrained(workouts, getExercise);
  const now = Date.now();

  const lastDone = (d: TemplateDay): string | null => {
    for (let i = workouts.length - 1; i >= 0; i--) {
      const w = workouts[i];
      if (w.templateId === plan.id && w.dayId === d.id)
        return formatDate(w.startedAt);
    }
    return null;
  };

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 800, minWidth: 0 }}>{plan.name}</div>
        <div className="row" style={{ gap: 4, flex: '0 0 auto' }}>
          <button className="btn small ghost" onClick={onExportText}>
            📝 Text
          </button>
          <button
            className="btn small ghost"
            onClick={() => downloadPlanPng(plan, getExercise)}
          >
            🖼 Image
          </button>
        </div>
      </div>
      {plan.days.map((d) => {
        const done = doneThisWeek.has(d.id);
        const r = dayReadiness(d, getExercise, lastTrained, now);
        const last = lastDone(d);
        return (
          <div className="plan-day" key={d.id}>
            <div className="row between">
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {d.name}
                </div>
                <div className="faint">
                  {d.exercises.length} exercises
                  {last ? ` · last done ${last}` : ''}
                </div>
              </div>
              {done ? (
                <div className="row" style={{ gap: 4, flex: '0 0 auto' }}>
                  <button className="btn small success" disabled>
                    ✓ Done
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={() => onStart(plan, d)}
                  >
                    Repeat
                  </button>
                </div>
              ) : (
                <button
                  className="btn small primary"
                  onClick={() => onStart(plan, d)}
                >
                  Start
                </button>
              )}
            </div>
            {r.totalCount > 0 &&
              (r.ready ? (
                <div className="ready-line ok">💪 Muscles rested — ready</div>
              ) : (
                <div className="ready-line wait">
                  ⏳ Recovering:{' '}
                  {r.recovering
                    .map((x) => `${MUSCLE_LABELS[x.muscle]} ${x.hoursLeft}h`)
                    .join(', ')}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
