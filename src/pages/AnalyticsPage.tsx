import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../state/store';
import { MuscleBars } from '../components/MuscleBars';
import {
  exerciseHistory,
  loggedMuscleSets,
  personalRecord,
  weeklySeries,
  workoutSetCount,
  workoutVolume,
} from '../lib/stats';
import { computeAchievements } from '../lib/trophies';

const AXIS = { stroke: '#5f6c7a', fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  background: '#1e262e',
  border: '1px solid #2a333d',
  borderRadius: 8,
  fontSize: 12,
} as const;

type View = 'overview' | 'trophies' | 'exercise' | 'muscles';

export function AnalyticsPage() {
  const { state, getExercise, allExercises } = useStore();
  const unit = state.settings.unit;
  const [view, setView] = useState<View>('overview');
  const [exerciseId, setExerciseId] = useState<string>('');
  const [muscleWindow, setMuscleWindow] = useState<7 | 30>(7);

  const weekly = useMemo(() => weeklySeries(state.workouts), [state.workouts]);

  // only offer exercises that actually have logged history
  const loggedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of state.workouts)
      for (const e of w.exercises) ids.add(e.exerciseId);
    return ids;
  }, [state.workouts]);
  const exerciseOptions = allExercises.filter((e) => loggedExerciseIds.has(e.id));

  const history = useMemo(
    () => (exerciseId ? exerciseHistory(state.workouts, exerciseId) : []),
    [state.workouts, exerciseId],
  );

  const achievements = useMemo(
    () => computeAchievements(state.workouts, unit),
    [state.workouts, unit],
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const totals = useMemo(() => {
    let volume = 0;
    let sets = 0;
    for (const w of state.workouts) {
      volume += workoutVolume(w);
      sets += workoutSetCount(w);
    }
    return { workouts: state.workouts.length, volume, sets };
  }, [state.workouts]);

  if (state.workouts.length === 0) {
    return (
      <div>
        <div className="page-title">Analytics</div>
        <div className="empty">
          <span className="big">📈</span>
          Charts appear here after you log your first workout: volume and sets
          per week, progress per exercise, and which muscles you actually
          trained.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Analytics</div>

      <div className="seg">
        {(
          [
            ['overview', 'Overview'],
            ['trophies', '🏆'],
            ['exercise', 'Per exercise'],
            ['muscles', 'Muscles'],
          ] as [View, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="value">{totals.workouts}</div>
              <div className="label">Workouts</div>
            </div>
            <div className="stat-box">
              <div className="value">{totals.sets}</div>
              <div className="label">Total sets</div>
            </div>
            <div className="stat-box">
              <div className="value">
                {totals.volume >= 1000
                  ? `${Math.round(totals.volume / 1000)}k`
                  : Math.round(totals.volume)}
              </div>
              <div className="label">Volume ({unit})</div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Volume per week ({unit})</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly}>
                <CartesianGrid stroke="#222b34" vertical={false} />
                <XAxis dataKey="label" {...AXIS} tickLine={false} interval={1} />
                <YAxis {...AXIS} tickLine={false} width={42} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e262e' }} />
                <Bar dataKey="volume" fill="#2f81f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Sets per week</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly}>
                <CartesianGrid stroke="#222b34" vertical={false} />
                <XAxis dataKey="label" {...AXIS} tickLine={false} interval={1} />
                <YAxis {...AXIS} tickLine={false} width={42} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e262e' }} />
                <Bar dataKey="sets" fill="#3fb950" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Workouts per week</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekly}>
                <CartesianGrid stroke="#222b34" vertical={false} />
                <XAxis dataKey="label" {...AXIS} tickLine={false} interval={1} />
                <YAxis {...AXIS} tickLine={false} width={42} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e262e' }} />
                <Bar dataKey="workouts" fill="#d29922" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {view === 'trophies' && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            🏆 {unlockedCount} of {achievements.length} trophies unlocked. Keep
            training to earn the rest.
          </p>
          <div className="trophy-grid">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`trophy${a.unlocked ? ' won' : ' locked'}`}
                title={a.description}
              >
                <div className="trophy-icon">{a.unlocked ? a.icon : '🔒'}</div>
                <div className="trophy-title">{a.title}</div>
                <div className="trophy-sub">{a.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'exercise' && (
        <>
          <div className="form-field">
            <label>Exercise</label>
            <select
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              <option value="">Choose an exercise…</option>
              {exerciseOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {exerciseId && history.length > 0 && (
            <>
              {(() => {
                const pr = personalRecord(state.workouts, exerciseId);
                const last = history[history.length - 1];
                return (
                  <div className="stat-grid">
                    <div className="stat-box">
                      <div className="value">
                        {pr ? `${pr.weight}` : '—'}
                      </div>
                      <div className="label">Best {unit} ({pr ? `×${pr.reps}` : ''})</div>
                    </div>
                    <div className="stat-box">
                      <div className="value">{pr ? pr.est1RM : '—'}</div>
                      <div className="label">Est. 1RM ({unit})</div>
                    </div>
                    <div className="stat-box">
                      <div className="value">{last.sets}</div>
                      <div className="label">Sets last time</div>
                    </div>
                  </div>
                );
              })()}

              <div className="chart-card">
                <h3>Heaviest set per workout ({unit})</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history}>
                    <CartesianGrid stroke="#222b34" vertical={false} />
                    <XAxis dataKey="label" {...AXIS} tickLine={false} />
                    <YAxis {...AXIS} tickLine={false} width={42} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="bestWeight"
                      stroke="#2f81f7"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2f81f7' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Estimated 1RM ({unit})</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history}>
                    <CartesianGrid stroke="#222b34" vertical={false} />
                    <XAxis dataKey="label" {...AXIS} tickLine={false} />
                    <YAxis {...AXIS} tickLine={false} width={42} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="est1RM"
                      stroke="#3fb950"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3fb950' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Volume per workout ({unit})</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={history}>
                    <CartesianGrid stroke="#222b34" vertical={false} />
                    <XAxis dataKey="label" {...AXIS} tickLine={false} />
                    <YAxis {...AXIS} tickLine={false} width={42} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1e262e' }} />
                    <Bar dataKey="volume" fill="#d29922" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {exerciseId && history.length === 0 && (
            <div className="empty">No logged sets for this exercise yet.</div>
          )}
          {!exerciseId && (
            <div className="empty">
              Pick an exercise to see your strength and volume progress over
              time — like “{getExercise('bench-press')?.name}”.
            </div>
          )}
        </>
      )}

      {view === 'muscles' && (
        <>
          <div className="seg">
            <button
              className={muscleWindow === 7 ? 'active' : ''}
              onClick={() => setMuscleWindow(7)}
            >
              Last 7 days
            </button>
            <button
              className={muscleWindow === 30 ? 'active' : ''}
              onClick={() => setMuscleWindow(30)}
            >
              Last 30 days
            </button>
          </div>
          <div className="card">
            <MuscleBars
              sets={(() => {
                const sets = loggedMuscleSets(
                  state.workouts,
                  getExercise,
                  muscleWindow,
                );
                if (muscleWindow === 30) {
                  // normalise to weekly so the verdict thresholds apply
                  for (const k of Object.keys(sets) as (keyof typeof sets)[])
                    sets[k] = (sets[k] / 30) * 7;
                }
                return sets;
              })()}
            />
          </div>
        </>
      )}
    </div>
  );
}
