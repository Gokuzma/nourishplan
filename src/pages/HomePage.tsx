import { useAuth } from '../contexts/AuthContext'
import { useHousehold, useHouseholdMembers } from '../hooks/useHousehold'
import { InviteLink } from '../components/household/InviteLink'

function MemberListCard() {
  const { data: members, isPending, isError } = useHouseholdMembers()

  if (isPending) {
    return (
      <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
        <h2 className="font-semibold text-primary mb-3">Household Members</h2>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 rounded-[--radius-btn] bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
        <h2 className="font-semibold text-primary mb-3">Household Members</h2>
        <p className="text-sm text-red-500">Could not load members.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
      <h2 className="font-semibold text-primary mb-3">Household Members</h2>
      {members && members.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <span className="text-sm text-text">
                {member.profiles?.display_name ?? 'Unknown'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  member.role === 'admin'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-text/60'
                }`}
              >
                {member.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text/60">No members yet.</p>
      )}
    </div>
  )
}

function QuickInviteCard({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null

  return (
    <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
      <h2 className="font-semibold text-primary mb-3">Invite Someone</h2>
      <InviteLink />
    </div>
  )
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-text">{title}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
          Coming Soon
        </span>
      </div>
      <p className="text-sm text-text/60">This feature is coming in a future update.</p>
    </div>
  )
}

export function HomePage() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  const displayName =
    session?.user.user_metadata?.full_name ??
    session?.user.user_metadata?.name ??
    session?.user.email?.split('@')[0] ??
    'there'

  const householdName = membership?.households?.name
  const isAdmin = membership?.role === 'admin'

  return (
    <div className="px-4 py-8 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Welcome, {displayName}!</h1>
        {householdName && (
          <p className="text-sm text-text/60 mt-1">{householdName}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MemberListCard />
        <QuickInviteCard isAdmin={isAdmin} />
        <ComingSoonCard title="Meal Plans" />
        <ComingSoonCard title="Daily Log" />
      </div>
    </div>
  )
}
