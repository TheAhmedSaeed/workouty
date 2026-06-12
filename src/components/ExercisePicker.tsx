import { useMemo, useState } from 'react';
import { Exercise, MUSCLE_LABELS } from '../types';
import { useStore } from '../state/store';
import { Modal } from './Modal';

/** Searchable exercise list used everywhere an exercise is added. */
export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const { allExercises } = useStore();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const n = q.toLowerCase().trim();
    if (!n) return allExercises;
    return allExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(n) ||
        e.primaryMuscles.some((m) => MUSCLE_LABELS[m].toLowerCase().includes(n)),
    );
  }, [q, allExercises]);

  return (
    <Modal title="Add exercise" onClose={onClose}>
      <input
        className="search-input"
        placeholder="Search by name or muscle…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      {filtered.map((ex) => (
        <div
          key={ex.id}
          className="card clickable"
          onClick={() => onPick(ex)}
          style={{ padding: '10px 12px' }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{ex.name}</div>
          <div className="faint">
            {ex.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="empty">No exercises match “{q}”.</div>
      )}
    </Modal>
  );
}
