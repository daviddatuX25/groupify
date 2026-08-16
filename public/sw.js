/* Groupify service worker (CAP-12): offline app shell + resilient API reads.
 * Network-first for every dynamic same-origin GET (pages, API, admin
 * endpoints) — cache is the offline fallback, never the primary source.
 * Cache-first only for the precached app shell. Versioned precache.
 *
 * History: v1 matched only /api/sessions/ as "API"; every other dynamic
 * endpoint (admin panel, moderation queue, board APIs) fell into the
 * cache-first branch and silently served one-request-stale responses —
 * the moderation queue never refreshed and reject read stale pending lists.
 */
const VERSION = 'groupify-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Precached app shell: cache-first (offline entry point).
  if (SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  // Pages + API: network-first, cache as the offline fallback. The cache
  // is updated in the background so a dropped connection still serves the
  // last good state.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
