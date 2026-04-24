import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useHouseholdMembers,
  useMemberProfiles,
  useHousehold,
  useChangeMemberRole,
  useRemoveHouseholdMember,
  useLeaveHousehold,
} from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'
import { RoleBadge } from './RoleBadge'
import { ConfirmDialog } from './ConfirmDialog'
import { MemberActionMenu, type MemberActionMenuItemProps } from './MemberActionMenu'

const LAST_ADMIN_TOOLTIP = 'Promote another member to admin first.'

type PendingAction =
  | { kind: 'promote'; memberRowId: string; displayName: string }
  | { kind: 'demote-other'; memberRowId: string; displayName: string }
  | { kind: 'demote-self'; memberRowId: string }
  | { kind: 'remove'; memberRowId: string; displayName: string }
  | { kind: 'leave' }

export function MemberList() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: members, isPending: membersLoading } = useHouseholdMembers()
  const { data: managedProfiles, isPending: profilesLoading } = useMemberProfiles()

  const changeRole = useChangeMemberRole()
  const removeMember = useRemoveHouseholdMember()
  const leaveHousehold = useLeaveHousehold()

  const [pending, setPending] = useState<PendingAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isAdmin = membership?.role === 'admin'
  const adminCount = useMemo(
    () => (members ?? []).filter((m) => m.role === 'admin').length,
    [members]
  )

  if (membersLoading || profilesLoading) {
    return (
      <ul className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-12 animate-pulse rounded-card bg-secondary" />
        ))}
      </ul>
    )
  }

  if (!members || members.length === 0) {
    return (
      <p className="text-sm text-text/50">No other members yet. Invite your family!</p>
    )
  }

  const isAnyPending = changeRole.isPending || removeMember.isPending || leaveHousehold.isPending

  function closeDialog() {
    if (isAnyPending) return
    setPending(null)
    setActionError(null)
  }

  function confirmPending() {
    if (!pending) return
    setActionError(null)
    const onErr = (err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    }
    if (pending.kind === 'promote') {
      changeRole.mutate(
        { member_row_id: pending.memberRowId, new_role: 'admin' },
        { onSuccess: () => { setPending(null); setActionError(null) }, onError: onErr }
      )
    } else if (pending.kind === 'demote-other' || pending.kind === 'demote-self') {
      changeRole.mutate(
        { member_row_id: pending.memberRowId, new_role: 'member' },
        { onSuccess: () => { setPending(null); setActionError(null) }, onError: onErr }
      )
    } else if (pending.kind === 'remove') {
      removeMember.mutate(pending.memberRowId, {
        onSuccess: () => { setPending(null); setActionError(null) },
        onError: onErr,
      })
    } else if (pending.kind === 'leave') {
      leaveHousehold.mutate(undefined, {
        onSuccess: () => { setPending(null); setActionError(null) },
        onError: onErr,
      })
    }
  }

  function dialogProps(action: PendingAction) {
    switch (action.kind) {
      case 'promote':
        return {
          title: `Promote ${action.displayName} to admin?`,
          message: `${action.displayName} will gain full admin rights including managing members, inviting others, and editing household settings.`,
          confirmLabel: 'Promote',
          destructive: false,
        }
      case 'demote-other':
        return {
          title: `Demote ${action.displayName} to member?`,
          message: `${action.displayName} will lose admin capabilities and will be able to log meals and view plans only.`,
          confirmLabel: 'Demote',
          destructive: true,
        }
      case 'demote-self':
        return {
          title: 'Demote yourself to member?',
          message: 'You will lose admin capabilities. You can be promoted back by another admin.',
          confirmLabel: 'Demote me',
          destructive: true,
        }
      case 'remove':
        return {
          title: `Remove ${action.displayName} from household?`,
          message: `${action.displayName} will lose access to this household's plans, recipes, and logs.`,
          confirmLabel: 'Remove',
          destructive: true,
        }
      case 'leave':
        return {
          title: 'Leave this household?',
          message: 'You will lose access to this household. You can create a new one or join another via invite afterwards.',
          confirmLabel: 'Leave',
          destructive: true,
        }
    }
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {members.map((member) => {
          const isCurrentUser = member.user_id === session?.user.id
          const displayName =
            member.profiles?.display_name ??
            (isCurrentUser ? 'You' : 'Member')
          const memberIsAdmin = member.role === 'admin'

          // Last-admin gating (D-04/D-05/D-06): disable actions that would drop admin count to zero.
          // adminCount already reflects the current server state via useHouseholdMembers.
          const wouldLeaveZeroAdmins = memberIsAdmin && adminCount <= 1
          const demoteDisabled = wouldLeaveZeroAdmins
          const removeDisabled = wouldLeaveZeroAdmins
          // For "Leave" on own row: if the user is the sole admin, they cannot leave (D-07 hard block).
          const leaveDisabled = isCurrentUser && memberIsAdmin && adminCount <= 1

          // Build the action item list per row
          const items: MemberActionMenuItemProps[] = []
          if (isCurrentUser) {
            // Own row: Leave (+ Demote if admin, not last admin)
            if (memberIsAdmin) {
              items.push({
                label: 'Demote to Member',
                disabled: demoteDisabled,
                disabledTooltip: demoteDisabled ? LAST_ADMIN_TOOLTIP : undefined,
                onSelect: () => setPending({ kind: 'demote-self', memberRowId: member.id }),
                destructive: true,
              })
            }
            items.push({
              label: 'Leave household',
              disabled: leaveDisabled,
              disabledTooltip: leaveDisabled ? LAST_ADMIN_TOOLTIP : undefined,
              onSelect: () => setPending({ kind: 'leave' }),
              destructive: true,
            })
          } else if (isAdmin) {
            // Admin viewing another member's row: Promote/Demote + Remove
            if (memberIsAdmin) {
              items.push({
                label: 'Demote to Member',
                disabled: demoteDisabled,
                disabledTooltip: demoteDisabled ? LAST_ADMIN_TOOLTIP : undefined,
                onSelect: () => setPending({ kind: 'demote-other', memberRowId: member.id, displayName }),
                destructive: true,
              })
            } else {
              items.push({
                label: 'Promote to Admin',
                onSelect: () => setPending({ kind: 'promote', memberRowId: member.id, displayName }),
              })
            }
            items.push({
              label: 'Remove from household',
              disabled: removeDisabled,
              disabledTooltip: removeDisabled ? LAST_ADMIN_TOOLTIP : undefined,
              onSelect: () => setPending({ kind: 'remove', memberRowId: member.id, displayName }),
              destructive: true,
            })
          }
          // Non-admin looking at another member's row: items is empty → no overflow menu rendered.

          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-card bg-secondary/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-text">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-text/40">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-text/50">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/members/${member.user_id}/targets`}
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  Set Targets
                </Link>
                <RoleBadge role={member.role} />
                {items.length > 0 && (
                  <MemberActionMenu
                    triggerAriaLabel={`Actions for ${displayName}`}
                    items={items}
                  />
                )}
              </div>
            </li>
          )
        })}

        {/* Managed child profiles */}
        {managedProfiles && managedProfiles.length > 0 && (
          <>
            <li className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text/40">
                Managed Profiles
              </p>
            </li>
            {managedProfiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between rounded-card border border-accent/30 bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-text">{profile.name}</p>
                    {profile.birth_year && (
                      <p className="text-xs text-text/50">Born {profile.birth_year}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/members/${profile.id}/targets`}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                  >
                    Set Targets
                  </Link>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                    Child
                  </span>
                </div>
              </li>
            ))}
          </>
        )}
      </ul>

      {pending && (
        <ConfirmDialog
          isOpen={true}
          {...dialogProps(pending)}
          cancelLabel="Cancel"
          isPending={isAnyPending}
          error={actionError}
          onConfirm={confirmPending}
          onCancel={closeDialog}
        />
      )}
    </>
  )
}
