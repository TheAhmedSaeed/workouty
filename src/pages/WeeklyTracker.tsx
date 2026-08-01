import { Modal } from '../components/Modal';
import { Template, Workout } from '../types';
import {
  recentWeeks,
  weekAdherence,
  weekStartSunday,
} from '../lib/weeks';

/** Compact "this week" adherence card for the current plan, on the home screen. */
export function ThisWeekCard({
  plan,
  workouts,
  onOpenHistory,
}: {
  plan: Template;
  workouts: Workout[];
  onOpenHistory: () => void;
}) {
  const week = weekAdherence(workouts, plan, weekStartSunday(new Date()));
  const hit = week.done >= week.target && week.target > 0;
  const done = new Set(week.doneDayIds);

  return (
    <div className={`week-card${hit ? ' hit' : ''}`}>
      <div className="row between">
        <div style={{ minWidth: 0 }}>
          <div className="week-title">📅 {week.label}</div>
          <div className="faint">
            {week.range} · {plan.name}
          </div>
        </div>
        <div className="week-score">
          {week.done}
          <span className="week-score-sep">/{week.target}</span>
        </div>
      </div>
      <div className="week-days">
        {plan.days.map((d) => (
          <span
            key={d.id}
            className={`week-day${done.has(d.id) ? ' done' : ''}`}
          >
            {done.has(d.id) ? '✓' : '○'} {d.name}
          </span>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="faint">
          {hit
            ? '🎉 All workouts done this week!'
            : `${week.target - week.done} to go this week`}
        </span>
        <button className="btn small" onClick={onOpenHistory}>
          📈 Weekly history
        </button>
      </div>
    </div>
  );
}

/** Modal listing recent weeks with per-week adherence and a summary. */
export function WeeklyHistoryModal({
  plan,
  workouts,
  onClose,
}: {
  plan: Template;
  workouts: Workout[];
  onClose: () => void;
}) {
  const weeks = recentWeeks(workouts, plan, 8, Date.now());
  const onTarget = weeks.filter((w) => w.target > 0 && w.done >= w.target).length;
  const avg = weeks.length
    ? Math.round((weeks.reduce((s, w) => s + w.done, 0) / weeks.length) * 10) / 10
    : 0;

  return (
    <Modal title="Weekly adherence" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Target: <b>{plan.days.length}</b> workouts/week — the days in “{plan.name}
        ”. Weeks run Sunday → Saturday.
      </p>
      <div className="stat-grid" style={{ marginBottom: 10 }}>
        <div className="stat-box">
          <div className="value">
            {onTarget}
            <span style={{ fontSize: '0.6em' }}>/{weeks.length}</span>
          </div>
          <div className="label">Weeks on target</div>
        </div>
        <div className="stat-box">
          <div className="value">{avg}</div>
          <div className="label">Avg / week</div>
        </div>
      </div>
      {weeks.map((w) => {
        const hit = w.target > 0 && w.done >= w.target;
        return (
          <div className={`week-row${hit ? ' hit' : ''}`} key={w.start}>
            <div style={{ minWidth: 0 }}>
              <b>{w.label}</b>
              <div className="faint">{w.range}</div>
            </div>
            <div className="week-row-score">
              {w.done}/{w.target} {hit ? '✅' : ''}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}
