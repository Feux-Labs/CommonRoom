// Common Room service worker. It makes the app installable and shows push alerts.
// It deliberately caches nothing: every request goes to the network exactly as before, so nobody ever sees a stale page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Pass-through: no respondWith, the browser handles the request normally.
});

// Alerts say what happened, never who did it. Tapping one opens the right screen.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/anonymous';
  event.waitUntil(self.registration.showNotification(data.title || 'Common Room', {
    body: data.body || '',
    icon: '/pwa-icon/192',
    badge: '/pwa-icon/192',
    tag: url,
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/anonymous';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) void client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
