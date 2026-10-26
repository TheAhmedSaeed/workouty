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
  const optionalIds = new Set(
    plan.days.filter((d) => d.optional).map((d) => d.id),
  );
  const bonusDone = [...done].filter((id) => optionalIds.has(id)).length;

  return (
    <div className={`week-card${hit ? ' hit' : ''}`}>
      <div className="row between">
        <div style={{ minWidth: 0 }}>
          <div className="week-title">
            📅 Week #{week.weekNo} · {week.label}
          </div>
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
            className={`week-day${done.has(d.id) ? ' done' : ''}${d.optional ? ' bonus' : ''}`}
          >
            {done.has(d.id) ? '✓' : '○'} {d.name}
            {d.optional ? ' ⭐' : ''}
          </span>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="faint">
          {hit
            ? '🎉 All workouts done this week!'
            : `${week.target - week.done} to go this week`}
          {bonusDone > 0 ? ` · +${bonusDone} bonus ⭐` : ''}
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
  const requiredDays = plan.days.filter((d) => !d.optional).length;
  const optionalDays = plan.days.length - requiredDays;

  return (
    <Modal title="Weekly adherence" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Target: <b>{requiredDays}</b> workout{requiredDays === 1 ? '' : 's'}/week —
        the required days in “{plan.name}”.
        {optionalDays > 0
          ? ` ${optionalDays} optional day${optionalDays === 1 ? '' : 's'} don’t count toward the target.`
          : ''}{' '}
        Weeks run Sunday → Saturday.
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
              <b>Week #{w.weekNo} · {w.label}</b>
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
