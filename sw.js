// Service worker: permite abrir la app sin conexión. Los datos los gestiona Firebase (con su propia caché offline).
const CACHE = 'yabiz-v1'
const CDN = ['cdn.jsdelivr.net', 'www.gstatic.com']

self.addEventListener('install', e => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
))

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const same = url.origin === location.origin
  if (!same && !CDN.includes(url.hostname)) return // Firestore, Apps Script, etc. van directos
  if (same) {
    // Primero red (para recibir siempre la última versión) y si no hay conexión, la copia guardada
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))))
  } else {
    // Librerías con versión fija: caché primero
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    })))
  }
})
