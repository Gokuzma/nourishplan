import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useRecipes, useCreateRecipe, useDeleteRecipe } from '../hooks/useRecipes'

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function RecipesPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: recipes, isPending } = useRecipes()
  const createRecipe = useCreateRecipe()
  const deleteRecipe = useDeleteRecipe()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const isAdmin = membership?.role === 'admin'

  async function handleCreate() {
    const recipe = await createRecipe.mutateAsync({ name: 'Untitled Recipe', servings: 1 })
    navigate(`/recipes/${recipe.id}`)
  }

  async function handleDelete(id: string) {
    await deleteRecipe.mutateAsync(id)
    setDeleteConfirm(null)
  }

  function canDelete(createdBy: string) {
    return isAdmin || createdBy === session?.user.id
  }

  return (
    <div className="px-4 py-8 font-sans pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Recipes</h1>
          <p className="text-sm text-text/60 mt-1">Create and manage your household recipes.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={createRecipe.isPending}
          className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createRecipe.isPending ? 'Creating…' : '+ New Recipe'}
        </button>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[--radius-card] bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : !recipes || recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text/50 text-sm">No recipes yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map(recipe => (
            <div key={recipe.id}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-[--radius-card] border border-secondary/50 bg-surface hover:border-accent/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{recipe.name}</p>
                  {recipe.notes && (
                    <p className="text-xs text-text/40 truncate">{recipe.notes}</p>
                  )}
                  <p className="text-xs text-text/50 mt-0.5">
                    {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} ·{' '}
                    <span title={new Date(recipe.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}>
                      Created {relativeTime(recipe.created_at)}
                    </span>
                  </p>
                </div>
                {canDelete(recipe.created_by) && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteConfirm(recipe.id) }}
                    className="shrink-0 text-text/30 hover:text-red-500 transition-colors p-1.5"
                    title="Delete recipe"
                    aria-label="Delete recipe"
                  >
                    ×
                  </button>
                )}
              </div>
              {deleteConfirm === recipe.id && (
                <div className="flex items-center gap-2 text-xs px-4 py-1.5 bg-surface rounded-b-[--radius-card] border border-t-0 border-secondary/50 -mt-2">
                  <span className="text-text/60 flex-1">Delete {recipe.name.slice(0, 30)}?</span>
                  <button onClick={e => { e.stopPropagation(); handleDelete(recipe.id) }} disabled={deleteRecipe.isPending} className="text-red-500 font-semibold min-h-[44px] px-2">
                    {deleteRecipe.isPending ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-primary min-h-[44px] px-2">Keep it</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
