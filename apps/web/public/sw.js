const CACHE_NAME = 'finnbiz-static-v1'
const ASSETS = [
  '/',
  '/manifest.json',
  '/login',
  '/register',
  '/dashboard'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  // Let the offline IndexedDB sync queue handle dynamic API mutations.
  // The service worker only caches static page structures (JS/CSS/HTML).
  if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone())
            return response
          })
        }).catch(() => caches.match('/'))
      })
    )
  }
})
