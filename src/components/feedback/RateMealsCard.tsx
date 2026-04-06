import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../hooks/useHousehold'
import { useUnratedCookedMeals, useRateMeal } from '../../hooks/useRatings'
import { MealRatingRow } from './MealRatingRow'

function todayUTC(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function RateMealsCard() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  const userId = session?.user.id

  const today = todayUTC()

  const { data: unratedMeals = [] } = useUnratedCookedMeals(householdId, userId, today)
  const rateMeal = useRateMeal()

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [fadeOut, setFadeOut] = useState(false)
  const [hidden, setHidden] = useState(false)

  const allRated = unratedMeals.length > 0 && unratedMeals.every(m => savedIds.has(m.recipeId))

  useEffect(() => {
    if (allRated) {
      setFadeOut(true)
    }
  }, [allRated])

  function handleTransitionEnd() {
    if (fadeOut) {
      setHidden(true)
    }
  }

  function handleRate(recipeId: string, rating: number) {
    if (!householdId || !userId) return
    const meal = unratedMeals.find(m => m.recipeId === recipeId)
    if (!meal) return
    rateMeal.mutate(
      { householdId, recipeId, recipeName: meal.recipeName, rating, userId },
      {
        onSuccess: () => {
          setSavedIds(prev => new Set([...prev, recipeId]))
        },
      }
    )
  }

  if (hidden) return null
  if (unratedMeals.length === 0 && savedIds.size === 0) return null

  return (
    <div
      className={`bg-secondary rounded-[--radius-card] border border-accent/30 p-4 transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <h3 className="text-base font-semibold text-text mb-3">How were today's meals?</h3>
      <div className="divide-y divide-secondary/50">
        {unratedMeals.map(meal => (
          <MealRatingRow
            key={meal.recipeId}
            recipeId={meal.recipeId}
            recipeName={meal.recipeName}
            onRate={handleRate}
            saved={savedIds.has(meal.recipeId)}
          />
        ))}
      </div>
    </div>
  )
}
