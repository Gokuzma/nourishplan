import { useState } from 'react'
import { useNutritionTargets } from '../../hooks/useNutritionTargets'
import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { ageInYears, pregnancyStatus, suggestTargets } from '../../utils/nutritionProfile'
import type { NutritionTarget } from '../../types/database'
import { DietaryRestrictionsSection } from './DietaryRestrictionsSection'
import { WontEatSection } from './WontEatSection'
import { ScheduleSection } from './ScheduleSection'

interface ProfilesSectionProps {
  householdId: string
  currentUserId: string
  isAdmin: boolean
  weekStartDay?: number
}

interface ProfileRow {
  id: string
  name: string
  memberType: 'user' | 'profile'
  isChild: boolean
  target: NutritionTarget | undefined
}

function buildSummary(target: NutritionTarget | undefined, isChild: boolean, today: Date) {
  if (!target || target.sex == null) return { text: 'No profile yet', suggestion: null }

  const parts: string[] = []
  if (target.birth_date) parts.push(String(ageInYears(target.birth_date, today)))
  if (target.is_pregnant && target.due_date) {
    const status = pregnancyStatus(target.due_date, today)
    parts.push('trimester' in status ? `Pregnant, T${status.trimester}` : 'Pregnancy: check due date')
  } else if (target.is_pregnant) {
    parts.push('Pregnant')
  }

  let suggestion: string | null = null
  if (target.calories != null) {
    parts.push(`${target.calories} kcal`)
  } else {
    const result = suggestTargets(target, isChild, today)
    if (result.ok) suggestion = `${result.suggestion.calories} kcal (suggested)`
  }
  if (parts.length === 0 && suggestion == null) return { text: 'Profile incomplete', suggestion: null }
  return { text: parts.join(' · '), suggestion }
}

export function ProfilesSection({ householdId, currentUserId, isAdmin, weekStartDay }: ProfilesSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const { data: targets } = useNutritionTargets(householdId)
  const { data: members } = useHouseholdMembers()
  const { data: memberProfiles } = useMemberProfiles()
  const today = new Date()

  const authMembers = members ?? []
  const you = authMembers.filter(m => m.user_id === currentUserId)
  const others = authMembers.filter(m => m.user_id !== currentUserId)

  const rows: ProfileRow[] = [
    ...[...you, ...others].map(m => ({
      id: m.user_id,
      name: m.profiles?.display_name ?? 'Member',
      memberType: 'user' as const,
      isChild: false,
      target: (targets ?? []).find(t => t.user_id === m.user_id),
    })),
    ...(memberProfiles ?? []).map(p => ({
      id: p.id,
      name: p.name,
      memberType: 'profile' as const,
      isChild: p.is_child,
      target: (targets ?? []).find(t => t.member_profile_id === p.id),
    })),
  ]

  return (
    <div>
      {rows.map(row => {
        const summary = buildSummary(row.target, row.isChild, today)
        const canEdit = isAdmin || row.id === currentUserId
        const isSelf = row.id === currentUserId
        const showPreferences = isSelf || row.memberType === 'profile'
        const showSchedule = showPreferences || isAdmin
        const isOpen = openId === row.id
        const memberName = isSelf ? undefined : row.name
        return (
          <div key={row.id} style={{ borderBottom: '1px dashed var(--rule-soft)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2" style={{ padding: '12px 0' }}>
              <div className="min-w-0">
                <span className="serif" style={{ fontSize: 15 }} data-testid="profile-name">{row.name}</span>
                <span className="serif-italic" style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {' · '}
                  <span data-testid="profile-summary">{summary.text}</span>
                  {summary.suggestion && (
                    <>
                      {summary.text && ' · '}
                      <span data-testid="profile-suggestion" style={{ color: 'var(--ink-dim)' }}>{summary.suggestion}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-3 flex-shrink-0">
                {showSchedule && (
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : row.id)}
                    aria-expanded={isOpen}
                    aria-label={`${row.name}: ${showPreferences ? 'diet & schedule' : 'schedule'}`}
                    className="btn btn-sm"
                  >
                    {showPreferences ? 'Diet & schedule' : 'Schedule'} {isOpen ? '▴' : '▾'}
                  </button>
                )}
                <a
                  href={`/members/${row.id}/targets`}
                  className="serif"
                  style={{ fontSize: 14, color: 'var(--tomato)', textDecorationColor: 'var(--rule-c)' }}
                >
                  {canEdit ? 'Edit profile' : 'View'}
                </a>
              </div>
            </div>
            {isOpen && (
              <div style={{ paddingBottom: 14 }} data-testid="profile-details">
                {showPreferences && (
                  <>
                    <DietaryRestrictionsSection
                      householdId={householdId}
                      memberId={row.id}
                      memberType={row.memberType}
                      memberName={memberName}
                    />
                    <WontEatSection
                      householdId={householdId}
                      memberId={row.id}
                      memberType={row.memberType}
                      memberName={memberName}
                    />
                  </>
                )}
                <ScheduleSection
                  householdId={householdId}
                  memberId={row.id}
                  memberType={row.memberType}
                  memberName={memberName}
                  weekStartDay={weekStartDay}
                  isChild={row.isChild}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
