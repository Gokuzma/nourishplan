import { useWeeklyTrends } from '../../hooks/useWeeklyTrends'
import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { useNutritionTargets } from '../../hooks/useNutritionTargets'
import { SectionHead, Rule } from '../editorial'
import { formatCost } from '../../utils/cost'
import type { MemberWeekKcal } from '../../utils/trends'

interface WeeklyTrendsProps {
  householdId: string | undefined
  weekStartDay: number
  weeklyBudget: number | null
}

const BAR_MAX_RATIO = 1.25

function formatWeekLabel(weekStart: string): string {
  return new Date(weekStart + 'T00:00:00Z')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

interface MemberTrend {
  memberKey: string
  name: string
  target: number | null
  cellsByWeek: Map<string, MemberWeekKcal>
}

export function WeeklyTrends({ householdId, weekStartDay, weeklyBudget }: WeeklyTrendsProps) {
  const { data: trends } = useWeeklyTrends(householdId, weekStartDay)
  const { data: members } = useHouseholdMembers()
  const { data: profiles } = useMemberProfiles()
  const { data: targets } = useNutritionTargets(householdId)

  if (!trends) return null

  const { weeks, kcalCells, spendByWeek } = trends

  // Resolve display names for every member that appears in the logs
  const nameByKey = new Map<string, string>()
  for (const m of members ?? []) {
    nameByKey.set(`user:${m.user_id}`, m.profiles?.display_name ?? 'Member')
  }
  for (const p of profiles ?? []) {
    nameByKey.set(`profile:${p.id}`, p.name)
  }

  const targetByKey = new Map<string, number | null>()
  for (const t of targets ?? []) {
    const key = t.user_id ? `user:${t.user_id}` : t.member_profile_id ? `profile:${t.member_profile_id}` : null
    if (key) targetByKey.set(key, t.calories)
  }

  const memberTrends: MemberTrend[] = []
  const seen = new Set<string>()
  for (const cell of kcalCells) {
    if (seen.has(cell.memberKey)) continue
    seen.add(cell.memberKey)
    memberTrends.push({
      memberKey: cell.memberKey,
      name: nameByKey.get(cell.memberKey) ?? 'Member',
      target: targetByKey.get(cell.memberKey) ?? null,
      cellsByWeek: new Map(
        kcalCells.filter(c => c.memberKey === cell.memberKey).map(c => [c.weekStart, c])
      ),
    })
  }
  memberTrends.sort((a, b) => a.name.localeCompare(b.name))

  const spendWeeks = weeks.filter(w => spendByWeek[w] && spendByWeek[w].totalSpend > 0)
  const maxSpend = Math.max(...spendWeeks.map(w => spendByWeek[w].totalSpend), weeklyBudget ?? 0)

  const hasKcal = memberTrends.length > 0
  const hasSpend = spendWeeks.length > 0
  if (!hasKcal && !hasSpend) return null

  return (
    <div className="mt-8">
      {hasKcal && (
        <section aria-label="Weekly calories against targets">
          <SectionHead label="The Nourishment" aux="avg daily kcal · 8 weeks" />
          <div className="flex flex-col gap-5 mt-3">
            {memberTrends.map(member => {
              const latest = [...weeks].reverse().map(w => member.cellsByWeek.get(w)).find(Boolean)
              const scale = member.target ?? 2000
              return (
                <div key={member.memberKey}>
                  <div className="flex items-baseline justify-between">
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
                      {member.name}
                    </span>
                    <span className="mono tnum" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-soft)' }}>
                      {member.target != null ? `target ${formatKcal(member.target)}` : 'no target set'}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mt-1.5" style={{ height: 32, position: 'relative' }}>
                    {member.target != null && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: `${(1 / BAR_MAX_RATIO) * 100}%`,
                          borderTop: '1px dashed var(--rule-soft)',
                        }}
                      />
                    )}
                    {weeks.map(w => {
                      const cell = member.cellsByWeek.get(w)
                      const ratio = cell ? Math.min(cell.avgDailyKcal / scale, BAR_MAX_RATIO) : 0
                      return (
                        <div
                          key={w}
                          className="flex-1"
                          style={{ height: '100%', display: 'flex', alignItems: 'flex-end', background: 'var(--paper-2)' }}
                          title={cell
                            ? `Week of ${formatWeekLabel(w)} · avg ${formatKcal(cell.avgDailyKcal)} kcal · ${cell.daysLogged} day${cell.daysLogged !== 1 ? 's' : ''} logged`
                            : `Week of ${formatWeekLabel(w)} · nothing logged`}
                        >
                          {cell && (
                            <div
                              style={{
                                width: '100%',
                                height: `${(ratio / BAR_MAX_RATIO) * 100}%`,
                                minHeight: 2,
                                background: 'var(--tomato)',
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="mono" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                      {formatWeekLabel(weeks[0])} – {formatWeekLabel(weeks[weeks.length - 1])}
                    </span>
                    {latest && (
                      <span className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                        latest {formatKcal(latest.avgDailyKcal)} kcal · {latest.daysLogged}d
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Rule variant="soft" className="mt-5" />
        </section>
      )}

      {hasSpend && (
        <section aria-label="Weekly spend against budget" className={hasKcal ? 'mt-6' : ''}>
          <SectionHead label="The Purse" aux={weeklyBudget != null ? `weekly spend vs ${formatCost(weeklyBudget)}` : 'weekly spend'} />
          <div className="flex flex-col gap-3 mt-3">
            {spendWeeks.map(w => {
              const spend = spendByWeek[w]
              const isOver = weeklyBudget != null && spend.totalSpend > weeklyBudget
              const widthRatio = maxSpend > 0 ? spend.totalSpend / maxSpend : 0
              return (
                <div key={w}>
                  <div className="flex items-baseline justify-between">
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
                      {formatWeekLabel(w)}
                    </span>
                    <span className="mono tnum" style={{ fontSize: 12, color: isOver ? 'var(--sky)' : 'var(--ink)' }}>
                      {formatCost(spend.totalSpend)}
                      {weeklyBudget != null && (
                        <span style={{ color: 'var(--ink-soft)' }}> / {formatCost(weeklyBudget)}</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1" style={{ height: 4, background: 'var(--paper-2)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(widthRatio, 1) * 100}%`,
                        background: isOver ? 'var(--sky)' : 'var(--tomato)',
                      }}
                    />
                  </div>
                  {spend.grocerySpend > 0 && spend.cookSpend > 0 && (
                    <div className="mono mt-0.5" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                      bought {formatCost(spend.grocerySpend)} · cooked {formatCost(spend.cookSpend)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
