import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'cook-notification-dismissed-at'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000  // 7 days (UI-SPEC line 315)

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export type FireResult = { delivered: 'os' | 'inapp' | 'none'; reason?: string }

function readCurrentPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotificationPermissionState
}

function readDismissedAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>(() => readCurrentPermission())
  const [dismissedAt, setDismissedAt] = useState<number | null>(() => readDismissedAt())

  useEffect(() => {
    setPermission(readCurrentPermission())
  }, [])

  const request = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof Notification === 'undefined') return 'unsupported'
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermissionState)
      return result as NotificationPermissionState
    } catch {
      return permission
    }
  }, [permission])

  const dismiss = useCallback(() => {
    const now = Date.now()
    try {
      window.localStorage.setItem(DISMISS_KEY, String(now))
    } catch {
      // localStorage may be unavailable (private mode) — fail silent
    }
    setDismissedAt(now)
  }, [])

  const shouldShowPrompt = (() => {
    if (permission === 'granted' || permission === 'unsupported') return false
    const now = Date.now()
    if (dismissedAt !== null && now - dismissedAt < COOLDOWN_MS) return false
    return true
  })()

  // R-03: primary = SW showNotification, fallback = in-app banner (caller renders)
  const fire = useCallback(async (title: string, body: string, tag: string): Promise<FireResult> => {
    if (typeof Notification === 'undefined') return { delivered: 'none', reason: 'unsupported' }
    if (Notification.permission !== 'granted') return { delivered: 'inapp', reason: 'permission' }
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(title, {
          body,
          tag,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: false,
        })
        return { delivered: 'os' }
      }
      new Notification(title, { body, tag })
      return { delivered: 'os' }
    } catch (err) {
      return { delivered: 'inapp', reason: err instanceof Error ? err.message : 'unknown' }
    }
  }, [])

  return { permission, request, dismiss, shouldShowPrompt, fire }
}
