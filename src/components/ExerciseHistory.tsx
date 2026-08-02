import { Unit, Workout } from '../types';
import { exerciseLog, personalRecord } from '../lib/stats';
import { formatDate } from '../lib/utils';

/**
 * Full per-session history of an exercise: every time you did it, with the
 * sets (weight × reps) and total volume, plus your best.
 */
export function ExerciseHistory({
  workouts,
  exerciseId,
  unit,
  limit = 30,
}: {
  workouts: Workout[];
  exerciseId: string;
  unit: Unit;
  limit?: number;
}) {
  const log = exerciseLog(workouts, exerciseId);
  if (log.length === 0)
    return <p className="faint">No logged history yet — do it once and it'll show here.</p>;

  const pr = personalRecord(workouts, exerciseId);
  const shown = log.slice(0, limit);

  return (
    <div className="ex-history">
      <div className="section-title" style={{ marginTop: 10 }}>
        History ({log.length})
      </div>
      {pr && (
        <p className="muted" style={{ marginTop: 0 }}>
          🏆 Best: {pr.weight} {unit} × {pr.reps} (est. 1RM ≈ {pr.est1RM} {unit})
        </p>
      )}
      {shown.map((s, i) => (
        <div className="ex-history-row" key={i}>
          <div className="row between">
            <b>{formatDate(s.date)}</b>
            <span className="faint">
              {s.sets.length} sets · {s.volume.toLocaleString()} {unit}
            </span>
          </div>
          <div className="ex-history-sets">
            {s.sets.map((x) => `${x.weight}×${x.reps}`).join(', ')}
          </div>
        </div>
      ))}
      {log.length > limit && (
        <p className="faint">…and {log.length - limit} earlier sessions.</p>
      )}
    </div>
  );
}
