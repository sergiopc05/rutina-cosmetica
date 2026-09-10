/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Base de la app (raíz o subpath tipo GitHub Pages). scope termina en "/".
const BASE = self.registration.scope
const at = (path: string) => new URL(path, BASE).href

// Fotos de producto (Open Beauty Facts + Storage firmado): cache-first.
registerRoute(
  ({ url }) =>
    url.hostname.endsWith('openbeautyfacts.org') ||
    url.pathname.includes('/storage/v1/object/'),
  new CacheFirst({
    cacheName: 'product-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
)

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title ?? 'Rutina Cosmética'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? 'Toca para ver tu rutina de ahora.',
      tag: payload.tag ?? 'rutina',
      icon: at('icons/icon-192.png'),
      badge: at('icons/icon-monochrome-96.png'),
      data: { url: payload.url ? at(payload.url.replace(/^\//, '')) : BASE },
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const target =
    (event.notification.data?.url as string | undefined) ?? BASE
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existing = clientsArr.find((c) => 'focus' in c)
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(target)
      } else {
        await self.clients.openWindow(target)
      }
    })(),
  )
})
