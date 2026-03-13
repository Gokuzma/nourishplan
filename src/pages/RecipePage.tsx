import { useParams } from 'react-router-dom'
import { RecipeBuilder } from '../components/recipe/RecipeBuilder'

export function RecipePage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <div className="flex items-center justify-center py-16 font-sans">
        <p className="text-text/50 text-sm">Recipe not found.</p>
      </div>
    )
  }

  return <RecipeBuilder recipeId={id} />
}
