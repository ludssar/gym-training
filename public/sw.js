// Service worker di Gym Training: rende l'app disponibile anche senza rete.
// Pagina: prima la rete, poi la copia salvata. File statici: copia salvata, aggiornata in background.
const CACHE = 'gym-training-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const response = await fetch('./', { cache: 'no-store' })
      await cache.put('./', response.clone())
      const html = await response.text()
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|png|svg|webmanifest))"/g)].map((m) => m[1])
      await cache.addAll([...new Set(assets)])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Supabase e altri domini passano sempre dalla rete.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        try {
          const response = await fetch(request)
          if (response.ok) await cache.put('./', response.clone())
          return response
        } catch {
          return (await cache.match('./')) ?? Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    })(),
  )
})
