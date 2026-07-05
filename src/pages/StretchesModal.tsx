import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { MUSCLE_LABELS } from '../types';
import { morningStretchRoutine, stretchVideoUrl } from '../lib/stretches';

/**
 * Wake-up stretch routine. Targets the muscles you trained the previous day,
 * or falls back to a general full-body routine on a rest day. Each stretch
 * shows how to do it, with a one-tap how-to video.
 */
export function StretchesModal({ onClose }: { onClose: () => void }) {
  const { state, getExercise } = useStore();
  const routine = useMemo(
    () => morningStretchRoutine(state.workouts, getExercise, Date.now()),
    [state.workouts, getExercise],
  );
  const [done, setDone] = useState<Record<string, boolean>>({});
  const doneCount = routine.stretches.filter((s) => done[s.id]).length;

  return (
    <Modal title="🧘 Morning stretches" onClose={onClose}>
      {routine.general ? (
        <p className="muted" style={{ marginTop: 0 }}>
          No workout logged yesterday — here's a gentle full-body routine to wake
          up with. Ease into each one and breathe; never force a stretch.
        </p>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
            Loosening up what you trained yesterday:
          </p>
          <div style={{ marginBottom: 10 }}>
            {routine.targetMuscles.map((m) => (
              <span className="chip primary" key={m}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="faint" style={{ marginBottom: 8 }}>
        {doneCount}/{routine.stretches.length} done
      </div>

      {routine.stretches.map((s) => (
        <div className={`stretch${done[s.id] ? ' done' : ''}`} key={s.id}>
          <label className="stretch-head">
            <input
              type="checkbox"
              checked={!!done[s.id]}
              onChange={() =>
                setDone((d) => ({ ...d, [s.id]: !d[s.id] }))
              }
            />
            <span className="stretch-title">{s.name}</span>
            <span className="stretch-hold">
              {s.hold}s{s.perSide ? ' / side' : ''}
            </span>
          </label>
          <p className="stretch-how">{s.how}</p>
          <a
            className="btn small block youtube"
            href={stretchVideoUrl(s)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ Watch how-to
          </a>
        </div>
      ))}

      <button className="btn success block" style={{ marginTop: 12 }} onClick={onClose}>
        ✓ Done
      </button>
    </Modal>
  );
}
