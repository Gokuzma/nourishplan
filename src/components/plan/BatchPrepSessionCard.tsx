import type { BatchPrepSession } from '../../hooks/useBatchPrepSummary'
import type { Recipe } from '../../types/database'
import { FreezerBadge } from './FreezerBadge'

interface BatchPrepSessionCardProps {
  session: BatchPrepSession
  recipes: Recipe[]
  onCookThisSession: (sessionId: string) => void
  isDueSoon?: boolean
}

export function BatchPrepSessionCard({ session, recipes, onCookThisSession, isDueSoon }: BatchPrepSessionCardProps) {
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  const totalMinutes = Math.max(0, Math.round(session.total_prep_minutes))

  return (
    <button
      type="button"
      onClick={() => onCookThisSession(session.session_id)}
      aria-label={`Cook ${session.label}, ${totalMinutes} minutes, ${session.recipe_ids.length} recipes`}
      className="w-full text-left bg-secondary rounded-[--radius-card] p-4 flex flex-col gap-3 hover:bg-secondary/80 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text font-sans flex-1 truncate">{session.label}</h4>
        <div className="flex items-center gap-1 shrink-0">
          {isDueSoon && (
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-full px-2 py-0.5 font-sans">Due soon</span>
          )}
          <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 font-sans">~{totalMinutes} min</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {session.recipe_ids.map(rid => {
          const recipe = recipeById.get(rid)
          if (!recipe) return null
          return (
            <div key={rid} className="flex items-center gap-2 text-xs text-text/70 font-sans">
              <span className="font-medium text-text truncate">{recipe.name}</span>
            </div>
          )
        })}
      </div>

      {session.shared_ingredients_callout && (
        <div className="bg-primary/10 text-primary text-xs rounded-[--radius-btn] px-3 py-2 font-sans">
          <span className="mr-1" aria-hidden="true">i</span>
          {session.shared_ingredients_callout}
        </div>
      )}

      {session.equipment_callout && (
        <div className="text-xs text-text/50 font-sans">
          <span className="mr-1" aria-hidden="true">⚒</span>
          {session.equipment_callout}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        {session.storage_hints.map(hint => {
          const recipe = recipeById.get(hint.recipe_id)
          if (!recipe) return null
          return (
            <div key={hint.recipe_id} className="flex items-center gap-1 text-xs text-text/60 font-sans">
              <span className="truncate max-w-[120px]">{recipe.name}</span>
              <span aria-hidden="true">→</span>
              {hint.storage === 'freezer' ? (
                <FreezerBadge variant="storage-freezer" />
              ) : (
                <FreezerBadge variant="storage-fridge" shelfLifeDays={hint.shelf_life_days} />
              )}
            </div>
          )
        })}
      </div>
    </button>
  )
}
