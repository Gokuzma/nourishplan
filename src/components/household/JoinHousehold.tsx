import { useState } from 'react'
import { useJoinHousehold } from '../../hooks/useHousehold'

interface JoinHouseholdProps {
  /** Pre-filled invite token from URL query param */
  initialToken?: string
  onSuccess?: () => void
}

export function JoinHousehold({ initialToken, onSuccess }: JoinHouseholdProps) {
  const [token, setToken] = useState(initialToken ?? '')
  const joinHousehold = useJoinHousehold()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return

    // Accept both raw tokens and full invite URLs
    const extracted = trimmed.includes('invite=')
      ? new URL(trimmed).searchParams.get('invite') ?? trimmed
      : trimmed

    joinHousehold.mutate(extracted, {
      onSuccess: () => {
        onSuccess?.()
      },
    })
  }

  const hasPrefilledToken = !!initialToken

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hasPrefilledToken ? (
        <p className="text-sm text-text/70">
          You've been invited to join a household. Click the button below to accept.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-token" className="text-sm font-semibold text-text">
            Invite link or code
          </label>
          <input
            id="invite-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your invite link here"
            required
            className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {joinHousehold.error && (
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
