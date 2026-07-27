import { useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { LengthUnit, Measurement, MeasureKey, Unit } from '../types';
import {
  fieldSeries,
  fieldTrend,
  MEASURE_FIELDS,
  MeasureField,
  measureUnitLabel,
} from '../lib/measurements';
import { formatDate } from '../lib/utils';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => formatDate(`${d}T12:00:00`);
const fmtDelta = (d: number) => `${d > 0 ? '+' : ''}${d}`;

/** Colour class for a change, given which direction is progress. */
function deltaClass(good: MeasureField['good'], delta: number): string {
  if (!good || delta === 0) return '';
  const improving = good === 'down' ? delta < 0 : delta > 0;
  return improving ? 'good' : 'bad';
}

/** Minimal inline trend line — no charting library needed. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="spark-empty">—</span>;
  const w = 84;
  const h = 26;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function MeasurePage() {
  const {
    state,
    setSettings,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  } = useStore();
  const unit = state.settings.unit;
  const lenUnit: LengthUnit = state.settings.measureUnit ?? 'cm';
  const measurements = state.measurements ?? [];
  const [editing, setEditing] = useState<Measurement | 'new' | null>(null);

  const byNewest = [...measurements].sort((a, b) => b.date.localeCompare(a.date));

  const summary = (m: Measurement): string =>
    MEASURE_FIELDS.filter((f) => typeof m[f.key] === 'number')
      .slice(0, 3)
      .map(
        (f) =>
          `${f.label} ${m[f.key]}${measureUnitLabel(f.kind, unit, lenUnit)}`,
      )
      .join(' · ') || 'No values';

  return (
    <div>
      <div className="page-title">
        Measurements
        <button className="btn small primary" onClick={() => setEditing('new')}>
          ＋ Add
        </button>
      </div>

      {measurements.length === 0 ? (
        <div className="empty">
          <span className="big">📏</span>
          Track your body with a tape measure to see fat loss and muscle gain.
          Tap <b>＋ Add</b> to log your first measurements — waist, arms, chest
          and more. Once a week is plenty, and you can back-date entries.
        </div>
      ) : (
        <>
          <div className="seg">
            {(['cm', 'in'] as const).map((u) => (
              <button
                key={u}
                className={lenUnit === u ? 'active' : ''}
                onClick={() => setSettings({ measureUnit: u })}
              >
                {u === 'cm' ? 'Centimeters' : 'Inches'}
              </button>
            ))}
          </div>

          <div className="section-title">Change over time</div>
          {MEASURE_FIELDS.map((f) => {
            const t = fieldTrend(measurements, f.key);
            if (!t) return null;
            const ul = measureUnitLabel(f.kind, unit, lenUnit);
            return (
              <div className="trend-row" key={f.key}>
                <div className="trend-main">
                  <div className="trend-label">{f.label}</div>
                  <div className="trend-value">
                    {t.latest} {ul}
                  </div>
                </div>
                <Sparkline values={fieldSeries(measurements, f.key).map((s) => s.value)} />
                <div className="trend-deltas">
                  {t.sincePrev !== null && (
                    <span className={`trend-badge ${deltaClass(f.good, t.sincePrev)}`}>
                      {fmtDelta(t.sincePrev)} {ul}
                    </span>
                  )}
                  {t.count > 1 && (
                    <div className="faint">
                      {fmtDelta(t.sinceFirst)} {ul} all-time
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="section-title">Entries ({measurements.length})</div>
          {byNewest.map((m) => (
            <div
              className="card clickable"
              key={m.id}
              onClick={() => setEditing(m)}
              style={{ padding: '10px 12px' }}
            >
              <div className="row between">
                <div style={{ fontWeight: 700 }}>{fmtDate(m.date)}</div>
                <div className="faint">{summary(m)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {editing && (
        <MeasurementModal
          existing={editing === 'new' ? null : editing}
          unit={unit}
          lenUnit={lenUnit}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addMeasurement(vals);
            else updateMeasurement(editing.id, vals);
            setEditing(null);
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  deleteMeasurement(editing.id);
                  setEditing(null);
                }
          }
        />
      )}
    </div>
  );
}

function MeasurementModal({
  existing,
  unit,
  lenUnit,
  onClose,
  onSave,
  onDelete,
}: {
  existing: Measurement | null;
  unit: Unit;
  lenUnit: LengthUnit;
  onClose: () => void;
  onSave: (vals: Omit<Measurement, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [vals, setVals] = useState<Partial<Record<MeasureKey, number>>>(() => {
    const v: Partial<Record<MeasureKey, number>> = {};
    for (const f of MEASURE_FIELDS) {
      const x = existing?.[f.key];
      if (typeof x === 'number') v[f.key] = x;
    }
    return v;
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showTips, setShowTips] = useState(!existing);

  const setVal = (k: MeasureKey, n: number) =>
    setVals((v) => {
      const nv = { ...v };
      if (Number.isNaN(n)) delete nv[k];
      else nv[k] = n;
      return nv;
    });

  const hasAny = Object.keys(vals).length > 0;

  return (
    <Modal
      title={existing ? 'Edit measurements' : 'New measurements'}
      onClose={onClose}
    >
      <div className="form-field">
        <label>Date (you can back-date)</label>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <label className="toggle-row">
        <span>❓ Show how to measure each one</span>
        <input
          type="checkbox"
          checked={showTips}
          onChange={(e) => setShowTips(e.target.checked)}
        />
      </label>

      {MEASURE_FIELDS.map((f) => (
        <div className="form-field" key={f.key}>
          <label>
            {f.label} ({measureUnitLabel(f.kind, unit, lenUnit)})
          </label>
          <NumberInput
            value={vals[f.key] ?? ''}
            placeholder="—"
            onValue={(n) => setVal(f.key, n)}
          />
          {showTips && (
            <p className="faint" style={{ margin: '4px 0 0' }}>
              {f.how}
            </p>
          )}
        </div>
      ))}

      <div className="form-field">
        <label>Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button
        className="btn primary block"
        disabled={!hasAny}
        style={{ opacity: hasAny ? 1 : 0.5 }}
        onClick={() =>
          onSave({ date, ...vals, notes: notes.trim() || undefined })
        }
      >
        {existing ? 'Save' : 'Add measurements'}
      </button>
      {onDelete && (
        <button
          className="btn danger ghost block"
          style={{ marginTop: 8 }}
          onClick={onDelete}
        >
          Delete entry
        </button>
      )}
    </Modal>
  );
}
