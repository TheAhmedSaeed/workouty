import { useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { workoutSetCount, workoutVolume } from '../lib/stats';
import { formatDate, formatDuration, formatTime } from '../lib/utils';
import { Workout } from '../types';

export function HistoryPage() {
  const { state, getExercise, deleteWorkout } = useStore();
  const unit = state.settings.unit;
  const [open, setOpen] = useState<Workout | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Workout | null>(null);

  const workouts = [...state.workouts].reverse();

  return (
    <div>
      <div className="page-title">History</div>

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
          </div>
          {open.exercises.map((we, i) => (
            <div className="card" key={i}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {getExercise(we.exerciseId)?.name ?? 'Unknown exercise'}
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
