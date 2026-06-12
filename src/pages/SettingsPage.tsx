import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { SETUP_SQL } from '../lib/sync';

export function SettingsPage() {
  const { state, setSettings, exportData, importData, sync } = useStore();
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

      <div className="section-title">Cloud sync</div>
      <CloudSyncSection />

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
      <AboutCounts />
    </div>
  );
}

function AboutCounts() {
  const { state } = useStore();
  return (
    <p className="faint">
      Workouty — plan, log and analyse your training. Inspired by Strong.
      <br />
      {state.workouts.length} workouts · {state.templates.length} plans ·{' '}
      {state.customExercises.length} custom exercises stored.
    </p>
  );
}

/**
 * Sync to the user's own free Supabase project: one-time setup
 * (project + SQL + keys), then email/password sign-in on each device.
 */
function CloudSyncSection() {
  const { sync } = useStore();
  const [showSetup, setShowSetup] = useState(false);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      // textarea below allows manual copy
    }
  };

  const auth = async (mode: 'in' | 'up') => {
    setBusy(true);
    setAuthError(null);
    const err =
      mode === 'in'
        ? await sync.signIn(email.trim(), password)
        : await sync.signUp(email.trim(), password);
    setAuthError(err);
    setBusy(false);
  };

  // 3 — signed in and syncing
  if (sync.userEmail) {
    return (
      <div className="card">
        <div className="muted">
          ✅ Syncing as <b>{sync.userEmail}</b>
        </div>
        <div className="faint" style={{ margin: '6px 0 10px' }}>
          Changes upload automatically.
          {sync.lastSync
            ? ` Last sync ${sync.lastSync.toLocaleTimeString()}.`
            : ''}
        </div>
        {sync.error && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{sync.error}</p>
        )}
        <div className="row">
          <button
            className="btn small grow"
            disabled={sync.syncing}
            onClick={() => sync.syncNow()}
          >
            {sync.syncing ? 'Syncing…' : '🔄 Sync now'}
          </button>
          <button className="btn small" onClick={() => sync.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // 2 — configured, needs sign in
  if (sync.configured) {
    return (
      <div className="card">
        <div className="muted" style={{ marginBottom: 10 }}>
          Sign in to sync your plans and workouts across devices. Use the same
          email + password on your laptop and phone.
        </div>
        <div className="form-field">
          <label>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Password (min 6 characters)</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {authError && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{authError}</p>
        )}
        <div className="row">
          <button
            className="btn primary grow"
            disabled={busy || !email.trim() || password.length < 6}
            onClick={() => auth('in')}
          >
            Sign in
          </button>
          <button
            className="btn grow"
            disabled={busy || !email.trim() || password.length < 6}
            onClick={() => auth('up')}
          >
            Create account
          </button>
        </div>
        <button
          className="btn small ghost danger block"
          style={{ marginTop: 8 }}
          onClick={() => sync.configure(null)}
        >
          Disconnect Supabase project
        </button>
      </div>
    );
  }

  // 1 — not configured yet
  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 10 }}>
        Sync your data across laptop and phone using your own free{' '}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
          Supabase
        </a>{' '}
        project. Your data stays in <i>your</i> account.
      </div>
      {!showSetup ? (
        <button className="btn block" onClick={() => setShowSetup(true)}>
          ☁️ Set up cloud sync
        </button>
      ) : (
        <>
          <ol className="muted" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>
              Create a free project at <b>supabase.com</b> (any name/region).
            </li>
            <li>
              In the project: <b>SQL Editor → New query</b>, paste the setup
              SQL and press Run.
              <button
                className="btn small block"
                style={{ margin: '6px 0' }}
                onClick={copySql}
              >
                {sqlCopied ? '✓ Copied!' : '📋 Copy setup SQL'}
              </button>
            </li>
            <li>
              In <b>Authentication → Sign In / Providers → Email</b>, turn{' '}
              <b>off</b> “Confirm email” (so sign-up works instantly).
            </li>
            <li>
              From <b>Project Settings → API Keys</b>, copy the{' '}
              <b>Publishable key</b> (on older projects it's called the{' '}
              <b>anon public</b> key). Your Project URL is under{' '}
              <b>Project Settings → Data API</b>.
            </li>
          </ol>
          <div className="form-field">
            <label>Project URL</label>
            <input
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Publishable / anon key</label>
            <input
              placeholder="sb_publishable_… or eyJhbGciOi…"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
            />
          </div>
          <button
            className="btn primary block"
            disabled={!/^https:\/\/.+/.test(url.trim()) || anonKey.trim().length < 20}
            onClick={() =>
              sync.configure({ url: url.trim(), anonKey: anonKey.trim() })
            }
          >
            Save & continue
          </button>
        </>
      )}
    </div>
  );
}

