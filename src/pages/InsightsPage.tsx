import { useEffect } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { useHouseholdInsights, useTriggerAnalysis } from '../hooks/useAITags'
import { RecipeAITagPill } from '../components/feedback/RecipeAITagPill'
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
    <div className="px-4 py-6 font-sans pb-[64px]">
      <h1 className="text-2xl font-semibold text-text mb-1">Taste Insights</h1>
      <p className="text-sm text-text/50 mb-6">Rating patterns from your household's meals.</p>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-[--radius-card] bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : !hasData ? (
        <div className="py-8 text-center">
          <p className="text-sm text-text/50">Not enough data yet.</p>
          <p className="text-xs text-text/40 mt-1">Rate a few meals and check back.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {summaries.map(s => (
            <div
              key={s.recipeId}
              className="bg-surface rounded-[--radius-card] border border-secondary p-4 mb-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xl font-semibold text-text">
                    {s.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-text/60 ml-2">
                    avg rating — {s.recipeName}
                  </span>
                  <p className="text-xs text-text/40 mt-0.5">{s.count} rating{s.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.tags.map(t => (
                    <RecipeAITagPill key={t.id} tag={t.tag} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
