// Minimal service worker for Workouty.
//
// It intentionally does NOT cache anything (no `fetch` handler), so it can
// never serve stale content. Its only job is to make notifications reliable —
// on Android Chrome the `new Notification()` constructor is forbidden and you
// must use registration.showNotification(), which requires an active worker.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Background rest-timer notification ──────────────────────────────────────
// The page can't fire the "rest's up" notification while it's backgrounded
// (its JS is suspended). So when a rest starts, the page hands the fire time
// to the worker; we hold the worker alive with waitUntil until then and show
// the notification ourselves — this works even if the tab/app is in the
// background. Skipping/adjusting rest cancels or reschedules it.
let pendingRest = null; // { timeout, resolve }

function clearPendingRest() {
  if (pendingRest) {
    clearTimeout(pendingRest.timeout);
    pendingRest.resolve();
    pendingRest = null;
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'schedule-rest') {
    clearPendingRest();
    const delay = Math.max(0, (data.at || 0) - Date.now());
    event.waitUntil(
      new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pendingRest = null;
          self.registration
            .showNotification("Rest's up! 💪", {
              body: 'Time for your next set.',
              tag: 'workouty-rest',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              renotify: true,
            })
            .finally(resolve);
        }, delay);
        pendingRest = { timeout, resolve };
      }),
    );
  } else if (data.type === 'cancel-rest') {
    clearPendingRest();
  }
});

// Tapping a notification focuses the app (or opens it if it's closed).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })(),
  );
});
