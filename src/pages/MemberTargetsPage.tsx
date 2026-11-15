import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHousehold, useHouseholdMembers, useMemberProfiles } from '../hooks/useHousehold'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { NutritionTargetsForm } from '../components/targets/NutritionTargetsForm'
import { ProfileForm } from '../components/targets/ProfileForm'
import { SuggestedTargetsCard } from '../components/targets/SuggestedTargetsCard'

export function MemberTargetsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: members } = useHouseholdMembers()
  const { data: profiles } = useMemberProfiles()
  const membersLoaded = members !== undefined && profiles !== undefined
  const { data: target } = useNutritionTarget(
    membersLoaded ? membership?.household_id : undefined,
    id,
    members?.some((m) => m.user_id === id) ? 'user' : 'profile',
  )

  if (!id) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 font-sans flex items-center justify-center">
        <p className="text-text/50">Member not found.</p>
      </div>
    )
  }

  const householdId = membership?.household_id
  const isAdmin = membership?.role === 'admin'
  const currentUserId = session?.user.id

  // Determine member name and type
  const authMember = members?.find((m) => m.user_id === id)
  const managedProfile = profiles?.find((p) => p.id === id)

  const memberName = authMember?.profiles?.display_name
    ?? authMember?.user_id?.slice(0, 8)
    ?? managedProfile?.name
    ?? id.slice(0, 8)

  const memberType: 'user' | 'profile' = authMember ? 'user' : 'profile'
  const isChild = managedProfile?.is_child ?? false

  // canEdit: current user is the member themselves, or is admin
  const canEdit = isAdmin || currentUserId === id

  if (!householdId || !membersLoaded) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 font-sans flex items-center justify-center">
        <p className="text-text/50">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/household')}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 w-fit"
        >
          ← Back to household
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary">Profile & Targets</h1>
          <p className="mt-1 text-sm text-text/60">{memberName}</p>
        </div>

        <ProfileForm
          householdId={householdId}
          memberId={id}
          memberType={memberType}
          isChild={isChild}
          canEdit={canEdit}
          birthYearFallback={managedProfile?.birth_year}
        />

        <SuggestedTargetsCard
          householdId={householdId}
          memberId={id}
          memberType={memberType}
          isChild={isChild}
          target={target ?? null}
          canEdit={canEdit}
        />

        <NutritionTargetsForm
          householdId={householdId}
          memberId={id}
          memberType={memberType}
          canEdit={canEdit}
          hasProfile={!!target?.sex}
        />
      </div>
    </div>
  )
}
