import { useEffect, useState } from 'react'
import { getPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from '../../lib/push'

interface NotificationsSectionProps {
  userId: string
  householdId: string
}

export function NotificationsSection({ userId, householdId }: NotificationsSectionProps) {
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPushStatus().then(s => {
      if (!cancelled) setStatus(s)
    })
    return () => { cancelled = true }
  }, [])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      await subscribeToPush(userId, householdId)
      setStatus('subscribed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable notifications.')
      setStatus(await getPushStatus())
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    try {
      await unsubscribeFromPush()
      setStatus('unsubscribed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '14px 0' }}>
      <p className="serif-italic mb-3" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
        Get a nudge when a draft plan is ready or leftovers are about to expire.
      </p>
      {status === 'loading' ? null : status === 'unsupported' ? (
        <p className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
          Notifications aren&apos;t supported in this browser. On iPhone, add NourishPlan to your Home Screen first.
        </p>
      ) : status === 'denied' ? (
        <p className="serif-italic" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
          Notifications are blocked for this site — allow them in your browser settings to enable.
        </p>
      ) : status === 'subscribed' ? (
        <div className="flex items-center gap-3">
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tomato)' }}>
            Enabled on this device
          </span>
          <button onClick={handleDisable} disabled={busy} className="btn btn-sm">
            {busy ? 'Disabling...' : 'Disable'}
          </button>
        </div>
      ) : (
        <button onClick={handleEnable} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? 'Enabling...' : 'Enable on this device'}
        </button>
      )}
      {error && <p className="serif-italic mt-2" style={{ fontSize: 12, color: 'var(--tomato)' }}>{error}</p>}
    </div>
  )
}
