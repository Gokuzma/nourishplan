import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'

function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        isAdmin
          ? 'bg-primary/20 text-primary'
          : 'bg-secondary text-text/60'
      }`}
    >
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  )
}

export function MemberList() {
  const { session } = useAuth()
  const { data: members, isPending: membersLoading } = useHouseholdMembers()
  const { data: managedProfiles, isPending: profilesLoading } = useMemberProfiles()

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

  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => {
        const isCurrentUser = member.user_id === session?.user.id
        const displayName =
          member.profiles?.display_name ??
          (isCurrentUser ? 'You' : 'Member')

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
            <RoleBadge role={member.role} />
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
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                Child
              </span>
            </li>
          ))}
        </>
      )}
    </ul>
  )
}
