import { useNotificationPermission, type NotificationPermissionState } from '../../hooks/useNotificationPermission'

const COOLDOWN_KEY = 'cook-notification-dismissed-at'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface NotificationPermissionBannerProps {
  onPermissionChange: (permission: NotificationPermissionState) => void
}

export function NotificationPermissionBanner({ onPermissionChange }: NotificationPermissionBannerProps) {
  const { permission, request, dismiss } = useNotificationPermission()

  // The hook manages the cooldown via its own dismiss(), but the plan spec requires
  // we also write cook-notification-dismissed-at for the parent to check.
  function handleDismiss() {
    try {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    } catch {
      // localStorage unavailable — fail silent
    }
    dismiss()
  }

  async function handleAllow() {
    const result = await request()
    onPermissionChange(result)
    if (result === 'denied') {
      handleDismiss()
    }
  }

  // Never show if granted or unsupported
  if (permission === 'granted' || permission === 'unsupported') return null

  // Check 7-day cooldown via the same localStorage key the hook uses
  const lastDismissed = (() => {
    try {
      const raw = localStorage.getItem(COOLDOWN_KEY)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  })()
  if (lastDismissed !== null && Date.now() - lastDismissed < COOLDOWN_MS) return null

  // Denied state — show blocked banner
  if (permission === 'denied') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-[--radius-card] p-4 flex items-start gap-3">
        <span className="text-amber-500 flex-shrink-0 mt-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2L2 22h20L12 2zM12 9v4M12 17h.01"/>
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-sans">
            Notifications blocked. Turn them on in your browser settings to hear timers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-text/40 hover:text-text flex-shrink-0"
          aria-label="Dismiss notification warning"
        >
          &times;
        </button>
      </div>
    )
  }

  // Default state — prompt to allow
  return (
    <div className="bg-secondary border border-primary/30 rounded-[--radius-card] p-4 flex items-start gap-3">
      <span className="text-primary flex-shrink-0 mt-0.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text">Get notified when timers finish</p>
        <p className="text-sm text-text/70 font-sans mt-0.5">
          Allow notifications so you'll hear when passive steps are done — even if the app is in the background.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleAllow}
            className="bg-primary text-white rounded-[--radius-btn] px-3 py-2 text-xs font-semibold"
          >
            Allow notifications
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-text/60 hover:text-text underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
