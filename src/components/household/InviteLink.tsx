import { useState } from 'react'
import { useCreateInvite } from '../../hooks/useHousehold'
import { RoleSegmentedControl } from './RoleSegmentedControl'
import { RoleBadge } from './RoleBadge'

export function InviteLink() {
  const createInvite = useCreateInvite()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [role, setRole] = useState<'admin' | 'member'>('member')

  function handleRoleChange(next: 'admin' | 'member') {
    setRole(next)
    // D-14: toggling the control AFTER generation clears the displayed link,
    // forcing the admin to regenerate so the badge + URL never go stale.
    setInviteUrl(null)
    setCopied(false)
  }

  function handleGenerate() {
    createInvite.mutate(role, {
      onSuccess: (invite) => {
        const url = `${window.location.origin}/join?invite=${invite.token}`
        setInviteUrl(url)
        setCopied(false)
      },
    })
  }

  function handleCopy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      const el = document.createElement('textarea')
      el.value = inviteUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text/60">
        Generate a shareable link. The link expires in 7 days and can only be used once.
      </p>

      <div className="flex items-center gap-3">
        {/* Visual heading only — NOT a <label htmlFor> (that would conflict with
            RoleSegmentedControl aria-label="Invite role" on its <div role="radiogroup">).
            Accessibility is handled by the radiogroup aria-label, not by this span. */}
        <span className="text-sm text-text/70" aria-hidden="true">
          Invite as:
        </span>
        <RoleSegmentedControl
          value={role}
          onChange={handleRoleChange}
          disabled={createInvite.isPending}
        />
      </div>

      {createInvite.error && (
        <p className="text-sm text-red-500">
          {createInvite.error instanceof Error
            ? createInvite.error.message
            : 'Failed to generate invite link.'}
        </p>
      )}

      {inviteUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-card border border-accent/40 bg-secondary/50 px-3 py-2">
            <p className="flex-1 break-all text-sm text-text">{inviteUrl}</p>
            <RoleBadge role={role} />
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 rounded-btn px-3 py-1.5 text-xs font-semibold transition-opacity ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-primary text-surface hover:opacity-90'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
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
