import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { useStore } from '../state/store';
import { CardioSession, CardioType } from '../types';
import {
  CARDIO_TYPES,
  cardioByWeek,
  cardioTypeInfo,
  cardioTotals,
} from '../lib/cardio';
import { formatDate } from '../lib/utils';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => formatDate(`${d}T12:00:00`);

/** Compact minutes → "45m" / "1h 05m". */
function fmtMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${String(rem).padStart(2, '0')}m` : `${h}h`;
}

const WEEKS_SHOWN = 8;

export function CardioModal({ onClose }: { onClose: () => void }) {
  const { state, addCardio, updateCardio, deleteCardio } = useStore();
  const sessions = state.cardio ?? [];
  const [editing, setEditing] = useState<CardioSession | 'new' | null>(
    sessions.length === 0 ? 'new' : null,
  );

  const weeks = useMemo(
    () => cardioByWeek(sessions, WEEKS_SHOWN, Date.now()),
    [sessions],
  );
  const maxMinutes = Math.max(1, ...weeks.map((w) => w.minutes));
  const totals = cardioTotals(sessions);

  return (
    <Modal title="🏃 Cardio" onClose={onClose}>
      {editing ? (
        <CardioForm
          existing={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addCardio(vals);
            else updateCardio(editing.id, vals);
            setEditing(null);
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  deleteCardio(editing.id);
                  setEditing(null);
                }
          }
        />
      ) : (
        <button className="btn primary block" onClick={() => setEditing('new')}>
          ＋ Log a cardio session
        </button>
      )}

      {sessions.length > 0 && (
        <>
          <div className="section-title">Week by week</div>
          <p className="faint" style={{ margin: '0 0 10px' }}>
            {totals.sessions} sessions · {fmtMinutes(totals.minutes)} total
            {totals.distanceKm > 0 ? ` · ${totals.distanceKm} km` : ''}
          </p>
          {weeks.map((w) => {
            const pct = Math.round((w.minutes / maxMinutes) * 100);
            const kinds = [...new Set(w.sessions.map((s) => s.type))]
              .map((t) => cardioTypeInfo(t).icon)
              .join(' ');
            return (
              <div className="cardio-week" key={w.start}>
                <div className="row between">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Week {w.weekNo} · {w.label}
                  </div>
                  <div className="faint">{w.range}</div>
                </div>
                <div className="cardio-bar-track">
                  <div
                    className={`cardio-bar-fill${w.minutes === 0 ? ' empty' : ''}`}
                    style={{ width: `${w.minutes === 0 ? 0 : Math.max(6, pct)}%` }}
                  />
                </div>
                <div className="faint" style={{ marginTop: 3 }}>
                  {w.sessions.length === 0 ? (
                    'No cardio'
                  ) : (
                    <>
                      {kinds} {w.sessions.length} session
                      {w.sessions.length === 1 ? '' : 's'} ·{' '}
                      {fmtMinutes(w.minutes)}
                      {w.distanceKm > 0 ? ` · ${w.distanceKm} km` : ''}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div className="section-title">Recent sessions</div>
          {[...sessions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 30)
            .map((s) => {
              const info = cardioTypeInfo(s.type);
              return (
                <div
                  className="card clickable"
                  key={s.id}
                  onClick={() => setEditing(s)}
                  style={{ padding: '10px 12px' }}
                >
                  <div className="row between">
                    <div style={{ fontWeight: 700 }}>
                      {info.icon} {info.label}
                    </div>
                    <div className="faint">{fmtDate(s.date)}</div>
                  </div>
                  <div className="faint" style={{ marginTop: 2 }}>
                    {fmtMinutes(s.minutes)}
                    {s.distanceKm ? ` · ${s.distanceKm} km` : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                </div>
              );
            })}
        </>
      )}
    </Modal>
  );
}

function CardioForm({
  existing,
  onCancel,
  onSave,
  onDelete,
}: {
  existing: CardioSession | null;
  onCancel: () => void;
  onSave: (vals: Omit<CardioSession, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [type, setType] = useState<CardioType>(existing?.type ?? 'run');
  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [minutes, setMinutes] = useState<number | ''>(existing?.minutes ?? '');
  const [distanceKm, setDistanceKm] = useState<number | ''>(
    existing?.distanceKm ?? '',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const canSave = typeof minutes === 'number' && minutes > 0;

  return (
    <div className="cardio-form">
      <div className="section-title" style={{ marginTop: 0 }}>
        {existing ? 'Edit session' : 'New session'}
      </div>

      <div className="form-field">
        <label>Type</label>
        <div className="cardio-type-grid">
          {CARDIO_TYPES.map((c) => (
            <button
              key={c.type}
              type="button"
              className={`cardio-type${type === c.type ? ' active' : ''}`}
              onClick={() => setType(c.type)}
            >
              <span className="cardio-type-icon">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label>Date (you can back-date)</label>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label>Minutes</label>
        <NumberInput
          value={minutes}
          placeholder="e.g. 30"
          onValue={(n) => setMinutes(Number.isNaN(n) ? '' : n)}
        />
      </div>

      <div className="form-field">
        <label>Distance in km (optional)</label>
        <NumberInput
          value={distanceKm}
          placeholder="—"
          onValue={(n) => setDistanceKm(Number.isNaN(n) ? '' : n)}
        />
      </div>

      <div className="form-field">
        <label>Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button
        className="btn primary block"
        disabled={!canSave}
        style={{ opacity: canSave ? 1 : 0.5 }}
        onClick={() =>
          canSave &&
          onSave({
            type,
            date,
            minutes,
            distanceKm: typeof distanceKm === 'number' ? distanceKm : undefined,
            notes: notes.trim() || undefined,
          })
        }
      >
        {existing ? 'Save' : 'Add session'}
      </button>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn ghost grow" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button className="btn danger ghost grow" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
