const CACHE_NAME = 'middle-school-math-v4-drive-attempts'
const scopeUrl = new URL(self.registration.scope)
const appShell = [
  scopeUrl.href,
  new URL('prototype.html', scopeUrl).href,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('icons/icon-192.png', scopeUrl).href,
  new URL('icons/icon-512.png', scopeUrl).href,
  new URL('icons/icon-maskable-512.png', scopeUrl).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(appShell))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.registration.scope)) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached

        if (event.request.mode === 'navigate') {
          return caches.match(scopeUrl.href)
        }

        return Response.error()
      }),
  )
})
