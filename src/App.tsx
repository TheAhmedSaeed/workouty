import { lazy, Suspense, useState } from 'react';
import { useStore } from './state/store';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkoutPage } from './pages/WorkoutPage';

// Analytics pulls in the heavy charting library — load it only when opened so
// it stays out of the initial bundle.
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);

type Tab = 'home' | 'history' | 'analytics' | 'exercises' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Start', icon: '🏋️' },
  { id: 'history', label: 'History', icon: '🗓️' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'exercises', label: 'Exercises', icon: '💪' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const showWorkout = workoutOpen && state.activeWorkout;

  return (
    <>
      <main className="app-main">
        {showWorkout ? (
          <WorkoutPage onClose={() => setWorkoutOpen(false)} />
        ) : (
          <>
            {tab === 'home' && (
              <HomePage onOpenWorkout={() => setWorkoutOpen(true)} />
            )}
            {tab === 'history' && <HistoryPage />}
            {tab === 'analytics' && (
              <Suspense fallback={<div className="empty">Loading…</div>}>
                <AnalyticsPage />
              </Suspense>
            )}
            {tab === 'exercises' && <ExercisesPage />}
            {tab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>

      {state.activeWorkout && !showWorkout && (
        <div className="active-banner" onClick={() => setWorkoutOpen(true)}>
          <span>▶ {state.activeWorkout.name}</span>
          <span>Resume</span>
        </div>
      )}

      {!showWorkout && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              <span className="icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
