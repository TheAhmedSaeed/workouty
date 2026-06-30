import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { SETUP_SQL } from '../lib/sync';
import { DEFAULT_REST_SECONDS } from '../types';

const REST_PRESETS = [0, 60, 90, 120, 180];

function restLabel(s: number): string {
  if (s === 0) return 'Off';
  if (s % 60 === 0) return `${s / 60} min`;
  return `${s}s`;
}

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

      <div className="section-title">Logging</div>
      <label className="toggle-row">
        <span>🙈 Hide last time's results</span>
        <input
          type="checkbox"
          checked={!!state.settings.hidePrevious}
          onChange={(e) => setSettings({ hidePrevious: e.target.checked })}
        />
      </label>
      <p className="faint" style={{ marginTop: 0 }}>
        Hides what you did last time while logging — the “last time” line, the
        Previous column and pre-filled reps — so past numbers don't anchor you.
        Weight is still pre-filled and your full history is always saved.
      </p>

      <div className="section-title">Rest timer</div>
      <p className="muted" style={{ marginTop: 0 }}>
        After you tick a set off, the workout screen counts down your rest and
        alerts you when it's time for the next set.
      </p>
      <div className="seg">
        {REST_PRESETS.map((s) => {
          const active = (state.settings.restTimerSeconds ?? DEFAULT_REST_SECONDS) === s;
          return (
            <button
              key={s}
              className={active ? 'active' : ''}
              onClick={() => setSettings({ restTimerSeconds: s })}
            >
              {restLabel(s)}
            </button>
          );
        })}
      </div>
      <RestNotifyToggle />

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

/**
 * Opt-in to a browser notification when the rest timer ends. Toggling it on
 * asks for notification permission; we surface the browser's verdict so the
 * user knows if alerts are blocked at the OS/browser level.
 */
function RestNotifyToggle() {
  const { state, setSettings } = useStore();
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState<NotificationPermission | null>(
    supported ? Notification.permission : null,
  );
  const on = !!state.settings.restNotify;

  if (!supported) {
    return (
      <p className="faint">
        This browser doesn't support notifications — you'll still get the chime
        and vibration when rest ends.
      </p>
    );
  }

  const ensurePermission = async (): Promise<NotificationPermission> => {
    let p = Notification.permission;
    if (p === 'default') {
      p = await Notification.requestPermission();
      setPerm(p);
    }
    return p;
  };

  const toggle = async () => {
    const next = !on;
    if (next) await ensurePermission();
    setSettings({ restNotify: next });
  };

  const sendTest = async () => {
    const p = await ensurePermission();
    if (p !== 'granted') return;
    const options: NotificationOptions = {
      body: 'Notifications are working ✅',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'workouty-test',
    };
    try {
      const reg =
        'serviceWorker' in navigator
          ? await navigator.serviceWorker.getRegistration()
          : undefined;
      if (reg) await reg.showNotification('Workouty', options);
      else new Notification('Workouty', options);
    } catch {
      // ignore — the verdict text below tells the user if it's blocked
    }
  };

  return (
    <>
      <label className="toggle-row">
        <span>🔔 Notify me when rest is over</span>
        <input type="checkbox" checked={on} onChange={toggle} />
      </label>
      {perm === 'denied' ? (
        <p className="faint">
          Notifications are blocked for this site. Enable them in your browser's
          site settings to get rest alerts (the chime still plays meanwhile).
        </p>
      ) : (
        <button className="btn small" onClick={sendTest}>
          Send a test notification
        </button>
      )}
      {on && perm === 'granted' && (
        <p className="faint" style={{ marginTop: 8 }}>
          You'll get a notification when the rest countdown ends. On phones,
          install the app (Add to Home Screen) and keep it open for the most
          reliable alerts.
        </p>
      )}
    </>
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

