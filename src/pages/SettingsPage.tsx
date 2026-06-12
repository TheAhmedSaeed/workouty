import { useRef, useState } from 'react';
import { useStore } from '../state/store';

export function SettingsPage() {
  const { state, setSettings, exportData, importData } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    const res = importData(text);
    setMessage(res.ok ? '✓ Backup restored.' : `⚠ ${res.error}`);
  };

  return (
    <div>
      <div className="page-title">Settings</div>

      <div className="section-title">Units</div>
      <div className="seg">
        <button
          className={state.settings.unit === 'kg' ? 'active' : ''}
          onClick={() => setSettings({ unit: 'kg' })}
        >
          Kilograms (kg)
        </button>
        <button
          className={state.settings.unit === 'lb' ? 'active' : ''}
          onClick={() => setSettings({ unit: 'lb' })}
        >
          Pounds (lb)
        </button>
      </div>

      <div className="section-title">Your data</div>
      <p className="muted">
        Everything is stored locally in this browser. Export a backup before
        switching phones or clearing browser data.
      </p>
      <div className="row">
        <button className="btn grow" onClick={download}>
          ⬇ Export backup
        </button>
        <button className="btn grow" onClick={() => fileRef.current?.click()}>
          ⬆ Restore backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {message && (
        <p className="muted" style={{ marginTop: 10 }}>
          {message}
        </p>
      )}

      <div className="section-title">About</div>
      <p className="faint">
        Workouty — plan, log and analyse your training. Inspired by Strong.
        <br />
        {state.workouts.length} workouts · {state.templates.length} plans ·{' '}
        {state.customExercises.length} custom exercises stored.
      </p>
    </div>
  );
}
