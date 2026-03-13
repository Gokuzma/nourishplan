import { useParams } from 'react-router-dom'
import { MealBuilder } from '../components/meal/MealBuilder'

export function MealPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <div className="flex items-center justify-center py-16 font-sans">
        <p className="text-text/50 text-sm">Meal not found.</p>
      </div>
    )
  }

  return <MealBuilder mealId={id} />
}
