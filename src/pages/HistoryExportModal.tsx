import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { Exercise, Unit, Workout } from '../types';
import {
  HISTORY_PERIODS,
  buildHistoryExport,
  filterWorkoutsByDays,
} from '../lib/historyExport';

/** Export the workout history over a chosen period, with copy + download. */
export function HistoryExportModal({
  workouts,
  unit,
  getExercise,
  onClose,
}: {
  workouts: Workout[];
  unit: Unit;
  getExercise: (id: string) => Exercise | undefined;
  onClose: () => void;
}) {
  // selected preset index, or 'custom' for the "last N days" field
  const [sel, setSel] = useState<number | 'custom'>(1); // default 30 days
  const [customDays, setCustomDays] = useState<number | ''>(14);
  const [copied, setCopied] = useState(false);

  const days =
    sel === 'custom'
      ? typeof customDays === 'number' && customDays > 0
        ? customDays
        : 0
      : HISTORY_PERIODS[sel].days;
  const label =
    sel === 'custom'
      ? `last ${days || 0} day${days === 1 ? '' : 's'}`
      : HISTORY_PERIODS[sel].label;

  const { md, count } = useMemo(() => {
    const inRange = filterWorkoutsByDays(workouts, days, Date.now());
    return {
      md: buildHistoryExport(
        inRange,
        unit,
        getExercise,
        label,
        new Date().toISOString(),
      ),
      count: inRange.length,
    };
  }, [workouts, days, label, unit, getExercise]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the textarea is selectable for manual copy
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouty-history-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal title="Export history" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Pick a period, then <b>📋 Copy</b> or <b>⬇ Download</b>. The text is
        ready to paste into any AI assistant — it includes the question to ask.
      </p>

      <div className="form-field">
        <label>Period</label>
        <div className="row wrap" style={{ gap: 6 }}>
          {HISTORY_PERIODS.map((p, i) => (
            <button
              key={p.label}
              className={`btn small${sel === i ? ' primary' : ''}`}
              onClick={() => setSel(i)}
            >
              {p.label}
            </button>
          ))}
          <button
            className={`btn small${sel === 'custom' ? ' primary' : ''}`}
            onClick={() => setSel('custom')}
          >
            Custom
          </button>
        </div>
      </div>

      {sel === 'custom' && (
        <div className="form-field">
          <label>Last how many days?</label>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <NumberInput
              decimal={false}
              style={{ width: 90, textAlign: 'center' }}
              value={customDays}
              placeholder="14"
              onValue={(n) => setCustomDays(Number.isNaN(n) ? '' : n)}
            />
            <span className="faint">days</span>
          </div>
        </div>
      )}

      <div className="faint" style={{ margin: '2px 0 8px' }}>
        {count} workout{count === 1 ? '' : 's'} in {label}
      </div>

      <textarea
        className="code"
        rows={13}
        readOnly
        value={md}
        onFocus={(e) => e.target.select()}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary grow" onClick={copy}>
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button className="btn grow" onClick={download}>
          ⬇ Download .md
        </button>
      </div>
    </Modal>
  );
}
