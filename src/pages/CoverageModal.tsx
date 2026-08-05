import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { MuscleBars } from '../components/MuscleBars';
import { Exercise, Template } from '../types';
import {
  MuscleByDayBreakdown,
  templateMuscleRepsByDay,
  templateMuscleSets,
  templateMuscleSetsByDay,
} from '../lib/stats';

type View = 'setsTotal' | 'setsDay' | 'repsDay';

/** A muscle × day matrix with per-day and weekly totals. */
function MatrixTable({
  data,
  caption,
}: {
  data: MuscleByDayBreakdown;
  caption: string;
}) {
  const grand = data.dayTotals.reduce((a, b) => a + b, 0);
  if (data.rows.length === 0)
    return <p className="faint">Add exercises to this plan to see volume.</p>;
  return (
    <>
      <p className="faint" style={{ marginTop: 0 }}>
        {caption}
      </p>
      <div className="reps-table-wrap">
        <table className="reps-table">
          <thead>
            <tr>
              <th className="sticky-col">Muscle</th>
              {data.days.map((d, i) => (
                <th key={i}>{d}</th>
              ))}
              <th className="total-col">Week</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.muscle}>
                <td className="sticky-col">{r.label}</td>
                {r.perDay.map((v, i) => (
                  <td key={i} className={v ? 'has' : 'zero'}>
                    {v || '·'}
                  </td>
                ))}
                <td className="total-col">{r.total}</td>
              </tr>
            ))}
            <tr className="day-total">
              <td className="sticky-col">Total</td>
              {data.dayTotals.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
              <td className="total-col">{grand}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Muscle coverage for a plan: weekly hard sets per muscle (bars), or planned
 * weekly sets / reps per muscle broken down by day (matrix) — so you see each
 * muscle's volume and how it's spread across the week.
 */
export function CoverageModal({
  template,
  getExercise,
  onClose,
}: {
  template: Template;
  getExercise: (id: string) => Exercise | undefined;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>('setsTotal');
  const setsTotal = useMemo(
    () => templateMuscleSets(template, getExercise),
    [template, getExercise],
  );
  const setsByDay = useMemo(
    () => templateMuscleSetsByDay(template, getExercise),
    [template, getExercise],
  );
  const repsByDay = useMemo(
    () => templateMuscleRepsByDay(template, getExercise),
    [template, getExercise],
  );

  const tabs: [View, string][] = [
    ['setsTotal', 'Sets/wk'],
    ['setsDay', 'Sets × day'],
    ['repsDay', 'Reps × day'],
  ];

  return (
    <Modal title={`${template.name} — coverage`} onClose={onClose}>
      <div className="seg">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'setsTotal' && <MuscleBars sets={setsTotal} />}
      {view === 'setsDay' && (
        <MatrixTable
          data={setsByDay}
          caption="Planned sets/week per muscle, by day (secondary muscles count half)."
        />
      )}
      {view === 'repsDay' && (
        <MatrixTable
          data={repsByDay}
          caption="Planned reps/week per muscle, by day (sets × mid-range; secondary muscles count half)."
        />
      )}
    </Modal>
  );
}
