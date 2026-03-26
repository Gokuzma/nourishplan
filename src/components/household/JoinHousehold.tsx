import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJoinHousehold } from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'

interface JoinHouseholdProps {
  /** Pre-filled invite token from URL query param — auto-joins immediately */
  initialToken?: string
  onSuccess?: () => void
}

export function JoinHousehold({ initialToken, onSuccess }: JoinHouseholdProps) {
  const [token, setToken] = useState(initialToken ?? '')
  const joinHousehold = useJoinHousehold()
  const autoJoinAttempted = useRef(false)

  const { signOut } = useAuth()
  const navigate = useNavigate()

  // Auto-join when arriving via invite link
  useEffect(() => {
    if (initialToken && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      joinHousehold.mutate(initialToken, {
        onSuccess: () => onSuccess?.(),
        onError: (err) => {
          // If the error looks auth-related (stale session, deleted account),
          // sign out and redirect to auth so user can log in fresh
          const msg = err instanceof Error ? err.message : String(err)
          const isAuthError = msg.includes('Not authenticated') ||
            msg.includes('JWT') || msg.includes('token') ||
            msg.includes('violates foreign key')
          if (isAuthError) {
            signOut().then(() => {
              navigate('/auth', { state: { from: { pathname: '/join', search: `?invite=${initialToken}` } }, replace: true })
            })
          }
        },
      })
    }
  }, [initialToken])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return

    // Accept both raw tokens and full invite URLs
    const extracted = trimmed.includes('invite=')
      ? new URL(trimmed).searchParams.get('invite') ?? trimmed
      : trimmed

    joinHousehold.mutate(extracted, {
      onSuccess: () => onSuccess?.(),
    })
  }

  // Show joining state when auto-joining via link
  if (initialToken && (joinHousehold.isPending || !joinHousehold.isError)) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-text/70">Joining household…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {initialToken && joinHousehold.isError ? (
        <p className="text-sm text-red-500">
          {joinHousehold.error instanceof Error
            ? joinHousehold.error.message
            : 'Failed to join household. Please try again.'}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-token" className="text-sm font-semibold text-text">
            Invite code
          </label>
          <input
            id="invite-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your invite code here"
            required
            className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {!initialToken && joinHousehold.error && (
        <p className="text-sm text-red-500">
          {joinHousehold.error instanceof Error
            ? joinHousehold.error.message
            : 'Failed to join household. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={joinHousehold.isPending || !token.trim()}
        className="rounded-btn bg-primary px-4 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {joinHousehold.isPending ? 'Joining…' : 'Join Household'}
      </button>
    </form>
  )
}
