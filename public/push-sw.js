/*
 * Push handlers imported into the generated workbox service worker via
 * workbox.importScripts (vite.config.ts). Payload shape is defined by
 * supabase/functions/_shared/push.ts: { title, body, url }.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'NourishPlan', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Prefer a window already on the target URL; otherwise navigate one there.
      const onTarget = windows.find((c) => {
        try { return new URL(c.url).pathname === url } catch { return false }
      })
      if (onTarget) return onTarget.focus()
      const existing = windows.find((c) => 'focus' in c)
      if (existing) return existing.navigate(url).then((c) => (c || existing).focus())
      return clients.openWindow(url)
    })
  )
})
