import { supabase } from './supabase'

export type PushStatus = 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Converts a base64url VAPID public key to the Uint8Array subscribe() expects. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'subscribed' : 'unsubscribed'
}

/**
 * Asks for notification permission, subscribes this browser, and stores the
 * subscription for the household's senders. Throws with a readable message
 * when permission is refused or push is unavailable.
 */
export async function subscribeToPush(userId: string, householdId: string): Promise<void> {
  if (!pushSupported()) throw new Error('Notifications are not supported on this device/browser.')
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidKey) throw new Error('Notifications are not configured.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('Subscription is missing keys.')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      household_id: householdId,
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

/** Removes this browser's subscription both locally and from the table. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
