import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useRecipes, useCreateRecipe, useDeleteRecipe } from '../hooks/useRecipes'

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
            <div
              key={recipe.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[--radius-card] border border-secondary/50 bg-surface hover:border-accent/40 transition-colors cursor-pointer"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{recipe.name}</p>
                <p className="text-xs text-text/50 mt-0.5">
                  {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} ·{' '}
                  {new Date(recipe.created_at).toLocaleDateString()}
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
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="font-semibold text-text mb-2">Delete recipe?</h3>
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
                disabled={deleteRecipe.isPending}
                className="flex-1 rounded-[--radius-btn] bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteRecipe.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
