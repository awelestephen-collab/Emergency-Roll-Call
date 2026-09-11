// Service Worker for Emergency Roll Call PWA
const CACHE_NAME = 'emergency-roll-call-v6';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const scope = self.registration.scope;
      return cache.addAll([
        scope,
        scope + 'index.html',
        scope + 'manifest.json',
        scope + 'icon-192.png',
        scope + 'icon-512.png',
        scope + 'apple-touch-icon.png'
      ]).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Do not intercept or cache API, socket.io, or non-GET requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/socket.io/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-First for Navigation (HTML pages): Always get freshest app when online
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(self.registration.scope + 'index.html') || caches.match(self.registration.scope);
          });
        })
    );
    return;
  }

  // Cache-First with Network Fallback for static assets (hashed JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// ====================================================
// WEB PUSH NOTIFICATION HANDLER (Background / Locked Device Wakeup)
// ====================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🚨 EMERGENCY EVACUATION DRILL';
  const options = {
    body: data.body || 'Immediate evacuation ordered! Tap to open muster roll-call and check in.',
    icon: self.registration.scope + 'icon-192.png',
    badge: self.registration.scope + 'icon-192.png',
    vibrate: data.vibrate || [500, 200, 500, 200, 500, 200, 1000],
    tag: data.tag || 'emergency-alert',
    renotify: true,
    requireInteraction: data.requireInteraction !== false, // Stays prominently on lock screen
    silent: false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: (data.data && data.data.url) ? data.data.url : self.registration.scope,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: '📍 Open Roll Call' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
