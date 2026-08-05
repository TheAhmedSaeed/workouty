import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { MuscleBars } from '../components/MuscleBars';
import { Exercise, Template } from '../types';
import { templateMuscleRepsByDay, templateMuscleSets } from '../lib/stats';

/**
 * Muscle coverage for a plan: weekly hard sets per muscle (bars), or planned
 * weekly reps per muscle broken down by day (matrix), so you can see the
 * volume each muscle gets and how it's spread across the week.
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
  const [view, setView] = useState<'sets' | 'reps'>('sets');
  const sets = useMemo(
    () => templateMuscleSets(template, getExercise),
    [template, getExercise],
  );
  const reps = useMemo(
    () => templateMuscleRepsByDay(template, getExercise),
    [template, getExercise],
  );
  const grandTotal = reps.dayTotals.reduce((a, b) => a + b, 0);

  return (
    <Modal title={`${template.name} — coverage`} onClose={onClose}>
      <div className="seg">
        <button
          className={view === 'sets' ? 'active' : ''}
          onClick={() => setView('sets')}
        >
          Weekly sets
        </button>
        <button
          className={view === 'reps' ? 'active' : ''}
          onClick={() => setView('reps')}
        >
          Reps by day
        </button>
      </div>

      {view === 'sets' ? (
        <MuscleBars sets={sets} />
      ) : reps.rows.length === 0 ? (
        <p className="faint">Add exercises to this plan to see rep volume.</p>
      ) : (
        <>
          <p className="faint" style={{ marginTop: 0 }}>
            Planned reps/week per muscle (sets × mid-range; secondary muscles
            count half). ~{grandTotal.toLocaleString()} reps/week total.
          </p>
          <div className="reps-table-wrap">
            <table className="reps-table">
              <thead>
                <tr>
                  <th className="sticky-col">Muscle</th>
                  {reps.days.map((d, i) => (
                    <th key={i}>{d}</th>
                  ))}
                  <th className="total-col">Week</th>
                </tr>
              </thead>
              <tbody>
                {reps.rows.map((r) => (
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
                  {reps.dayTotals.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                  <td className="total-col">{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
