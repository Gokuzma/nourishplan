import { useNavigate, useSearchParams } from 'react-router-dom'
import { CreateHousehold } from '../components/household/CreateHousehold'
import { JoinHousehold } from '../components/household/JoinHousehold'

export function HouseholdSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? undefined

  function handleSuccess() {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 font-sans">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-3xl font-bold text-primary">Welcome to NourishPlan</h1>
        <p className="mb-8 text-text/70">
          Get started by creating a new household or joining an existing one.
        </p>

        <div className="flex flex-col gap-6">
          {/* Create card */}
          <div className="rounded-card border border-accent/30 bg-surface p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-text">Create a Household</h2>
            <p className="mb-4 text-sm text-text/60">
              Start fresh. You'll be the admin and can invite family members.
            </p>
            <CreateHousehold onSuccess={handleSuccess} />
          </div>

          {/* Join card */}
          <div className="rounded-card border border-accent/30 bg-surface p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-text">Join a Household</h2>
            <p className="mb-4 text-sm text-text/60">
              Have an invite link? Paste it below to join an existing household.
            </p>
            <JoinHousehold initialToken={inviteToken} onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </div>
  )
}
