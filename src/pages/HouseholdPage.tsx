import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { MemberList } from '../components/household/MemberList'
import { InviteLink } from '../components/household/InviteLink'
import { MemberProfileForm } from '../components/household/MemberProfileForm'

export function HouseholdPage() {
  const { session } = useAuth()
  const { data: membership, isPending } = useHousehold()

  if (isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 font-sans">
        <div className="mx-auto max-w-lg">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 font-sans">
        <div className="mx-auto max-w-lg">
          <p className="text-text/60">You are not in a household yet.</p>
        </div>
      </div>
    )
  }

  const household = membership.households
  const isAdmin = membership.role === 'admin'
  const userId = session?.user.id

  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <div className="mx-auto flex max-w-lg flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary">
            {household?.name ?? 'Household'}
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Your role: <span className="font-semibold capitalize text-text">{membership.role}</span>
          </p>
        </div>

        {/* Members section */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-primary">Members</h2>
          <MemberList />
        </section>

        {/* Admin-only: Invite Link */}
        {isAdmin && (
          <section className="rounded-card border border-accent/40 bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-primary">Invite Link</h2>
            <InviteLink />
          </section>
        )}

        {/* Admin-only: Manage Children's Profiles */}
        {isAdmin && (
          <section className="rounded-card border border-accent/40 bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-primary">Managed Profiles</h2>
            <p className="mb-4 text-sm text-text/60">
              Add children or other members whose nutrition you manage.
            </p>
            <MemberProfileForm />
          </section>
        )}
      </div>
    </div>
  )
}
