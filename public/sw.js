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
