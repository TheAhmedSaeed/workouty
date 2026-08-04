import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { exerciseVolume, workoutSetCount, workoutVolume } from '../lib/stats';
import { formatDate, formatDuration, formatRest, formatTime } from '../lib/utils';
import { dateKey, monthMatrix, workoutsByDay } from '../lib/calendar';
import { Workout } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HistoryPage() {
  const { state, getExercise, deleteWorkout } = useStore();
  const unit = state.settings.unit;
  const [open, setOpen] = useState<Workout | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Workout | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const workouts = [...state.workouts].reverse();
  const byDay = useMemo(() => workoutsByDay(state.workouts), [state.workouts]);
  const matrix = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor],
  );
  const todayKey = dateKey(new Date());
  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const monthCount = state.workouts.filter((w) => {
    const d = new Date(w.startedAt);
    return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
  }).length;

  return (
    <div>
      <div className="page-title">History</div>

      {state.workouts.length > 0 && (
        <div className="cal">
          <div className="cal-head">
            <button className="btn small ghost" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <div className="cal-title">
              {MONTHS[cursor.month]} {cursor.year}
              <span className="faint"> · {monthCount} workouts</span>
            </div>
            <button className="btn small ghost" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
          <div className="cal-grid cal-dow">
            {DOW.map((d, i) => (
              <div className="cal-dow-cell" key={i}>
                {d}
              </div>
            ))}
          </div>
          {matrix.map((week, wi) => (
            <div className="cal-grid" key={wi}>
              {week.map((day) => {
                const key = dateKey(day);
                const dayWorkouts = byDay.get(key);
                const inMonth = day.getMonth() === cursor.month;
                const cls = [
                  'cal-cell',
                  inMonth ? '' : 'out',
                  dayWorkouts ? 'worked' : '',
                  key === todayKey ? 'today' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    className={cls}
                    key={key}
                    disabled={!dayWorkouts}
                    onClick={() => dayWorkouts && setOpen(dayWorkouts[0])}
                  >
                    {day.getDate()}
                    {dayWorkouts && dayWorkouts.length > 1 && (
                      <span className="cal-count">{dayWorkouts.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {workouts.length === 0 && (
        <div className="empty">
          <span className="big">🗓️</span>
          No workouts logged yet. Finish your first workout and it will show up
          here.
        </div>
      )}

      {workouts.map((w) => (
        <div className="card clickable" key={w.id} onClick={() => setOpen(w)}>
          <div className="row between">
            <div style={{ fontWeight: 700 }}>{w.name}</div>
            <div className="faint">{formatDate(w.startedAt)}</div>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            {w.exercises.length} exercises · {workoutSetCount(w)} sets ·{' '}
            {Math.round(workoutVolume(w)).toLocaleString()} {unit} volume
            {w.finishedAt ? ` · ${formatDuration(w.startedAt, w.finishedAt)}` : ''}
            {w.restSeconds ? ` · 🛋️ ${formatRest(w.restSeconds)} rest` : ''}
          </div>
        </div>
      ))}

      {open && (
        <Modal title={open.name} onClose={() => setOpen(null)}>
          <div className="muted" style={{ marginBottom: 12 }}>
            {formatDate(open.startedAt)} at {formatTime(open.startedAt)}
            {open.finishedAt
              ? ` · ${formatDuration(open.startedAt, open.finishedAt)}`
              : ''}{' '}
            · {Math.round(workoutVolume(open)).toLocaleString()} {unit} total
            {open.restSeconds ? ` · 🛋️ ${formatRest(open.restSeconds)} rest` : ''}
          </div>
          {open.exercises.map((we, i) => (
            <div className="card" key={i}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>
                  {getExercise(we.exerciseId)?.name ?? 'Unknown exercise'}
                </span>
                <span className="faint">
                  📊 {exerciseVolume(we.sets).toLocaleString()} {unit}
                </span>
              </div>
              {we.sets.map((s, j) => (
                <div className="row between" key={j} style={{ marginBottom: 3 }}>
                  <span className="faint">Set {j + 1}</span>
                  <span style={{ fontSize: '0.9rem' }}>
                    {s.weight} {unit} × {s.reps}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <button
            className="btn danger block"
            onClick={() => {
              setConfirmDelete(open);
              setOpen(null);
            }}
          >
            Delete workout
          </button>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete workout?" onClose={() => setConfirmDelete(null)}>
          <p className="muted">
            Permanently delete “{confirmDelete.name}” from{' '}
            {formatDate(confirmDelete.startedAt)}?
          </p>
          <div className="row">
            <button
              className="btn danger grow"
              onClick={() => {
                deleteWorkout(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </button>
            <button className="btn grow" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
