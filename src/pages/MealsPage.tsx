import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals, useCreateMeal, useDeleteMeal } from '../hooks/useMeals'
import { MealCard } from '../components/meal/MealCard'

export function MealsPage() {
  const navigate = useNavigate()
  const { data: meals, isPending } = useMeals()
  const createMeal = useCreateMeal()
  const deleteMeal = useDeleteMeal()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleCreate() {
    const meal = await createMeal.mutateAsync({ name: 'Untitled Meal' })
    navigate(`/meals/${meal.id}`)
  }

  async function handleDelete(id: string) {
    await deleteMeal.mutateAsync(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="px-4 py-8 font-sans pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Meals</h1>
          <p className="text-sm text-text/60 mt-1">Create and manage your household meals.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={createMeal.isPending}
          className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createMeal.isPending ? 'Creating…' : '+ New Meal'}
        </button>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[--radius-card] bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : !meals || meals.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text/50 text-sm">No meals yet — create your first meal.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {meals.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onDelete={() => setDeleteConfirm(meal.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="font-semibold text-text mb-2">Delete meal?</h3>
            <p className="text-sm text-text/60 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMeal.isPending}
                className="flex-1 rounded-[--radius-btn] bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteMeal.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
