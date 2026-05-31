import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useRecipes, useCreateRecipe, useDeleteRecipe } from '../hooks/useRecipes'
import { FreezerBadge } from '../components/plan/FreezerBadge'
import { ImportRecipeModal } from '../components/recipe/ImportRecipeModal'
import { FillGapsModal } from '../components/recipe/FillGapsModal'
import { Nameplate, StoryHead, Rule } from '../components/editorial'

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 0) return 'today'
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
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [fillGapsOpen, setFillGapsOpen] = useState(false)

  const isAdmin = membership?.role === 'admin'
  const recipeCount = recipes?.length ?? 0
  const lastEdited = recipes && recipes.length > 0
    ? relativeTime(recipes.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at)
    : null

  async function handleCreate() {
    const recipe = await createRecipe.mutateAsync({ name: 'Untitled Recipe', servings: 1 })
    navigate(`/recipes/${recipe.id}`)
  }

  function handleImportSuccess(recipeId: string) {
    setImportModalOpen(false)
    navigate(`/recipes/${recipeId}`)
  }

  async function handleDelete(id: string) {
    await deleteRecipe.mutateAsync(id)
    setDeleteConfirm(null)
  }

  function canDelete(createdBy: string) {
    return isAdmin || createdBy === session?.user.id
  }

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — desktop only */}
      <div className="hidden md:block">
        <Nameplate
          left={`${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'} on file`}
          title={<>The <span className="amp">Recipes</span></>}
          right={lastEdited ? `Last added ${lastEdited}` : 'Empty cookbook'}
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="LIBRARY"
        headline="The Recipes"
        byline={recipeCount > 0 ? `${recipeCount} on file` : 'Build the cookbook'}
        size="sm"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 flex-wrap mt-4 mb-2 no-print">
        <button
          onClick={() => setFillGapsOpen(true)}
          className="btn btn-sm"
        >
          Fill recipe gaps
        </button>
        <button
          onClick={() => setImportModalOpen(true)}
          className="btn btn-sm"
        >
          Import recipe
        </button>
        <button
          onClick={handleCreate}
          disabled={createRecipe.isPending}
          className="btn btn-primary btn-sm"
        >
          {createRecipe.isPending ? 'Creating…' : '+ New recipe'}
        </button>
      </div>

      <Rule />

      {/* Recipe list */}
      {isPending ? (
        <div className="flex flex-col gap-3 mt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-paper-2 animate-pulse" style={{ border: '1px solid var(--rule-soft)' }} />
          ))}
        </div>
      ) : !recipes || recipes.length === 0 ? (
        <p className="serif-italic text-base py-12 text-center" style={{ color: 'var(--ink-dim)' }}>
          No recipes yet. Add your first one above.
        </p>
      ) : (
        <div role="list" className="mt-1">
          {recipes.map((recipe) => (
            <div key={recipe.id} role="listitem">
              <div
                className="grid items-center gap-4 py-3 px-1 cursor-pointer hover:bg-paper-2 transition-colors"
                style={{ gridTemplateColumns: '1fr auto' }}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="serif text-lg" style={{ letterSpacing: '-0.01em' }}>{recipe.name}</span>
                    {recipe.freezer_friendly === true && <FreezerBadge variant="compact" />}
                  </div>
                  <p className="mono mt-0.5" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                    {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} · created {relativeTime(recipe.created_at)}
                  </p>
                  {recipe.notes && (
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-soft)' }}>{recipe.notes}</p>
                  )}
                </div>
                {canDelete(recipe.created_by) && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteConfirm(recipe.id) }}
                    className="shrink-0 p-2 transition-colors"
                    style={{ color: 'var(--ink-soft)' }}
                    title="Delete recipe"
                    aria-label="Delete recipe"
                  >
                    ×
                  </button>
                )}
              </div>
              {deleteConfirm === recipe.id && (
                <div className="flex items-center gap-2 text-xs px-4 py-2" style={{ background: 'var(--paper-2)', borderTop: '1px dashed var(--rule-c)' }}>
                  <span className="flex-1" style={{ color: 'var(--ink-dim)' }}>Delete {recipe.name.slice(0, 30)}?</span>
                  <button onClick={e => { e.stopPropagation(); handleDelete(recipe.id) }} disabled={deleteRecipe.isPending} className="btn btn-sm" style={{ color: 'var(--sky)', borderColor: 'var(--sky)' }}>
                    {deleteRecipe.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }} className="btn btn-sm">Keep it</button>
                </div>
              )}
              <Rule variant="soft" />
            </div>
          ))}
        </div>
      )}

      <ImportRecipeModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {fillGapsOpen && (
        <FillGapsModal recipes={recipes ?? []} onClose={() => setFillGapsOpen(false)} />
      )}
    </div>
  )
}
