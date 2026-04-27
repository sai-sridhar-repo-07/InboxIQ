const CACHE = 'mailair-v1';
const STATIC = [
  '/',
  '/dashboard',
  '/email',
  '/actions',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC).catch(() => {}))
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET, skip chrome-extension and non-http
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;
  // Skip API calls — always go to network
  if (request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful page/asset responses
        if (response.ok && (request.destination === 'document' || request.destination === 'image' || request.destination === 'style' || request.destination === 'script')) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Mailair', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Mailair', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'mailair',
      data: { url: data.url || '/email' },
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data || {}).url || '/email';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
