import { useNutritionTargets } from '../../hooks/useNutritionTargets'
import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { ageInYears, pregnancyStatus, suggestTargets } from '../../utils/nutritionProfile'
import type { NutritionTarget } from '../../types/database'

interface ProfilesSectionProps {
  householdId: string
  currentUserId: string
  isAdmin: boolean
}

interface ProfileRow {
  id: string
  name: string
  isChild: boolean
  target: NutritionTarget | undefined
}

function buildSummary(target: NutritionTarget | undefined, isChild: boolean, today: Date) {
  if (!target || target.sex == null) return { text: 'No profile yet', suggested: false }

  const parts: string[] = []
  if (target.birth_date) parts.push(String(ageInYears(target.birth_date, today)))
  if (target.is_pregnant && target.due_date) {
    const status = pregnancyStatus(target.due_date, today)
    if ('trimester' in status) parts.push(`Pregnant, T${status.trimester}`)
  }

  let suggested = false
  if (target.calories != null) {
    parts.push(`${target.calories} kcal`)
  } else {
    const result = suggestTargets(target, isChild, today)
    if (result.ok) {
      parts.push(`${result.suggestion.calories} kcal (suggested)`)
      suggested = true
    }
  }
  return { text: parts.join(' · '), suggested }
}

export function ProfilesSection({ householdId, currentUserId, isAdmin }: ProfilesSectionProps) {
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
      isChild: false,
      target: (targets ?? []).find(t => t.user_id === m.user_id),
    })),
    ...(memberProfiles ?? []).map(p => ({
      id: p.id,
      name: p.name,
      isChild: p.is_child,
      target: (targets ?? []).find(t => t.member_profile_id === p.id),
    })),
  ]

  return (
    <div>
      {rows.map(row => {
        const summary = buildSummary(row.target, row.isChild, today)
        const canEdit = isAdmin || row.id === currentUserId
        return (
          <div
            key={row.id}
            className="flex items-baseline justify-between gap-3"
            style={{ padding: '12px 0', borderBottom: '1px dashed var(--rule-soft)' }}
          >
            <div className="min-w-0">
              <span className="serif" style={{ fontSize: 15 }} data-testid="profile-name">{row.name}</span>
              <span
                className="serif-italic ml-2"
                style={{ fontSize: 13, color: summary.suggested ? 'var(--ink-soft)' : 'var(--ink-dim)' }}
              >
                {summary.text}
              </span>
            </div>
            <a
              href={`/members/${row.id}/targets`}
              className="serif"
              style={{ fontSize: 14, color: 'var(--tomato)', textDecorationColor: 'var(--rule-c)' }}
            >
              {canEdit ? 'Edit profile' : 'View'}
            </a>
          </div>
        )
      })}
    </div>
  )
}
