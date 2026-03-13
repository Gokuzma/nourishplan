import { useState } from 'react'
import { useCreateInvite } from '../../hooks/useHousehold'

export function InviteLink() {
  const createInvite = useCreateInvite()
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  function handleGenerate() {
    createInvite.mutate(undefined, {
      onSuccess: (invite) => {
        const url = `${window.location.origin}/join?invite=${invite.token}`
        setCopiedUrl(url)
      },
    })
  }

  function handleCopy() {
    if (!copiedUrl) return
    navigator.clipboard.writeText(copiedUrl).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = copiedUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text/60">
        Generate a shareable link. The link expires in 7 days and can only be used once.
      </p>

      {createInvite.error && (
        <p className="text-sm text-red-500">
          {createInvite.error instanceof Error
            ? createInvite.error.message
            : 'Failed to generate invite link.'}
        </p>
      )}

      {copiedUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-card border border-accent/40 bg-secondary/50 px-3 py-2">
            <p className="flex-1 break-all text-sm text-text">{copiedUrl}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-btn bg-primary px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-90"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-text/40">Expires in 7 days · Single use</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={createInvite.isPending}
            className="self-start text-xs text-primary underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
          >
            Generate a new link
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={createInvite.isPending}
          className="rounded-btn bg-primary px-4 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createInvite.isPending ? 'Generating…' : 'Generate Invite Link'}
        </button>
      )}
    </div>
  )
}
