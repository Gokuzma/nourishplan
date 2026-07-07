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
  if (error) {
    // Roll back the browser subscription so the UI doesn't show "Enabled"
    // with no server row (which would silently deliver zero notifications).
    await subscription.unsubscribe().catch(() => {})
    throw error
  }
}

/**
 * If this browser is already subscribed, re-point the stored subscription at
 * the current household (households can change; sends are scoped by household).
 * Safe no-op when unsubscribed or unsupported.
 */
export async function refreshPushHousehold(userId: string, householdId: string): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase
    .from('push_subscriptions')
    .update({ user_id: userId, household_id: householdId })
    .eq('endpoint', subscription.endpoint)
}

/** Removes this browser's subscription both locally and from the table. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  // Unsubscribe the browser first; if the DB delete then failed, the endpoint
  // is already dead and gets pruned server-side on the next send (404/410).
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
