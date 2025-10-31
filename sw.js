// sw.js
const CACHE_VERSION = 'v1.0.1';
const APP_CACHE = `qaqc-app-${CACHE_VERSION}`;

// Precache (adjust entry file name if needed)
const APP_SHELL = [
  './',
  './index.html',  // <— if you didn’t rename, use your HTML name here
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './Images/Logo_ArcelorMittal.png',
  './Images/Grease-Evaluation_Chart.png',
  // Optional: cache the html2pdf bundle so Print to PDF works offline
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== APP_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (e.g., CDN): cache-first but don’t try to put into our cache on failure.
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
    );
    return;
  }

  // HTML navigations: network-first, fallback to cache, then to index.html
  const acceptsHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (acceptsHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  // Static assets: cache-first with runtime fill
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(APP_CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});

