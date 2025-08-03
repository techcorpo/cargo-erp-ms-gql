const STATIC='layout-pwa-v3';
const SHELL=[
  './index.html',
  './login.html',
  './register.html',
  './admin-login.html',
  './admin-dashboard.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/router.js',
  './assets/register.js',
  './assets/admin-login.js',
  './assets/admin-dashboard.js',
  './assets/login.js',
  './assets/settings.js',
  './pages/layout.html',
  './pages/settings.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC).then(cache => {
      // Try to cache files individually to identify which one fails
      return Promise.allSettled(
        SHELL.map(url => 
          fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            } else {
              console.warn(`Failed to cache ${url}: ${response.status}`);
            }
          }).catch(err => {
            console.warn(`Failed to fetch ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(k => k !== STATIC && caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const u = new URL(event.request.url);
  if (u.hostname.endsWith('.supabase.co')) {
    event.respondWith(fetch(event.request)); // network-only
    return;
  }
  const req=event.request;
  if(req.mode==='navigate'){ event.respondWith(fetch(req).catch(()=>caches.match('./pages/layout.html'))); return; }
  event.respondWith(caches.match(req).then(c=>c||fetch(req)));
});
