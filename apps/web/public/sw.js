// Common Room service worker. It makes the app installable and is the place push notifications will plug in.
// It deliberately caches nothing: every request goes to the network exactly as before, so nobody ever sees a stale page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Pass-through: no respondWith, the browser handles the request normally.
});
