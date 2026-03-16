import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals, useCreateMeal, useDeleteMeal } from '../hooks/useMeals'
import { MealCard } from '../components/meal/MealCard'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'

export function MealsPage() {
  const navigate = useNavigate()
  const { data: meals, isPending } = useMeals()
  const createMeal = useCreateMeal()
  const deleteMeal = useDeleteMeal()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const isAdmin = membership?.role === 'admin'

  function canDelete(createdBy: string) {
    return isAdmin || createdBy === session?.user.id
  }

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
              canDelete={canDelete(meal.created_by)}
              isConfirming={deleteConfirm === meal.id}
              onDeleteClick={() => setDeleteConfirm(meal.id)}
              onConfirmDelete={() => handleDelete(meal.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
              isDeleting={deleteMeal.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
