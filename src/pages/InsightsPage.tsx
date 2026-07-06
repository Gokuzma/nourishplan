import { useEffect } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { useHouseholdInsights, useTriggerAnalysis } from '../hooks/useAITags'
import { RecipeAITagPill } from '../components/feedback/RecipeAITagPill'
import { Nameplate, StoryHead, Rule } from '../components/editorial'
import type { RecipeRating, AIRecipeTag } from '../types/database'

interface RecipeSummary {
  recipeId: string
  recipeName: string
  avgRating: number
  count: number
  tags: AIRecipeTag[]
}

function buildRecipeSummaries(ratings: RecipeRating[], tags: AIRecipeTag[]): RecipeSummary[] {
  const map = new Map<string, { name: string; total: number; count: number }>()
  for (const r of ratings) {
    const existing = map.get(r.recipe_id)
    if (existing) {
      existing.total += r.rating
      existing.count++
    } else {
      map.set(r.recipe_id, { name: r.recipe_name, total: r.rating, count: 1 })
    }
  }

  return [...map.entries()]
    .map(([recipeId, v]) => ({
      recipeId,
      recipeName: v.name,
      avgRating: v.total / v.count,
      count: v.count,
      tags: tags.filter(t => t.recipe_id === recipeId),
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
}

export function InsightsPage() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  const { data: insights, isPending } = useHouseholdInsights(householdId)
  const triggerAnalysis = useTriggerAnalysis()

  useEffect(() => {
    if (!householdId || !insights) return
    const tags = insights.tags
    if (tags.length === 0) {
      triggerAnalysis.mutate({ householdId })
      return
    }
    const mostRecent = tags.reduce((latest, t) => {
      return t.generated_at > latest ? t.generated_at : latest
    }, tags[0].generated_at)
    const hoursSince = (Date.now() - new Date(mostRecent).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 24) {
      triggerAnalysis.mutate({ householdId })
    }
  }, [householdId, insights])

  const summaries = insights
    ? buildRecipeSummaries(insights.ratings, insights.tags)
    : []

  const hasData = summaries.length > 0

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — desktop only */}
      <div className="hidden md:block">
        <Nameplate
          left={hasData ? `${summaries.length} ${summaries.length === 1 ? 'recipe' : 'recipes'} rated` : 'No ratings yet'}
          title={<>The <span className="amp">Taste</span></>}
          right="Rating patterns from the table"
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="INSIGHTS"
        headline="The Taste"
        byline="What the household loves"
        size="sm"
      />

      <Rule className="mt-4" />

      {isPending ? (
        <div className="flex flex-col gap-3 mt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-paper-2 animate-pulse" style={{ border: '1px solid var(--rule-soft)' }} />
          ))}
        </div>
      ) : !hasData ? (
        <p className="serif-italic text-base py-12 text-center" style={{ color: 'var(--ink-dim)' }}>
          Not enough data yet. Rate a few meals and check back.
        </p>
      ) : (
        <div role="list" className="mt-1">
          {summaries.map(s => (
            <div key={s.recipeId} role="listitem">
              <div className="py-3 px-1">
                <div className="flex items-baseline gap-3">
                  <span className="mono tnum" style={{ fontSize: 20, color: 'var(--tomato)', letterSpacing: '-0.02em' }}>
                    {s.avgRating.toFixed(1)}
                  </span>
                  <span className="serif text-lg min-w-0" style={{ letterSpacing: '-0.01em' }}>
                    {s.recipeName}
                  </span>
                </div>
                <p className="mono mt-0.5" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                  {s.count} rating{s.count !== 1 ? 's' : ''} · avg
                </p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.tags.map(t => (
                      <RecipeAITagPill key={t.id} tag={t.tag} />
                    ))}
                  </div>
                )}
              </div>
              <Rule variant="soft" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
