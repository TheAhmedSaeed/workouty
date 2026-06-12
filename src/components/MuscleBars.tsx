import { MUSCLE_GROUPS, MUSCLE_LABELS, MuscleGroup } from '../types';
import { coverageVerdict } from '../lib/stats';

const VERDICT_COLOR: Record<string, string> = {
  none: 'var(--red)',
  low: 'var(--orange)',
  good: 'var(--green)',
  high: 'var(--accent)',
};

/**
 * Weekly-sets-per-muscle bars with a verdict, used for both template
 * coverage analysis and "what did I actually train" analytics.
 */
export function MuscleBars({ sets }: { sets: Record<MuscleGroup, number> }) {
  const max = Math.max(12, ...MUSCLE_GROUPS.map((m) => sets[m]));
  return (
    <div>
      {MUSCLE_GROUPS.map((m) => {
        const v = coverageVerdict(sets[m]);
        return (
          <div className="muscle-row" key={m}>
            <span>{MUSCLE_LABELS[m]}</span>
            <div className="muscle-bar">
              <div
                style={{
                  width: `${Math.min(100, (sets[m] / max) * 100)}%`,
                  background: VERDICT_COLOR[v.level],
                }}
              />
            </div>
            <span className={`verdict-${v.level}`} style={{ textAlign: 'right' }}>
              {Math.round(sets[m] * 10) / 10} · {v.label}
            </span>
          </div>
        );
      })}
      <p className="faint" style={{ marginTop: 10 }}>
        Sets per week per muscle (secondary muscles count half). ~8–22 weekly
        sets is a good range for growth; red means a muscle isn't being
        trained at all.
      </p>
    </div>
  );
}
