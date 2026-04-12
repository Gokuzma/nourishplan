import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCookSessions } from '../hooks/useCookSession'
import { useRecipes } from '../hooks/useRecipes'
import { FreezerBadge } from '../components/plan/FreezerBadge'
import type { CookSession } from '../types/database'

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SessionResumeCard({ session }: { session: CookSession }) {
  const navigate = useNavigate()
  const recipeCount = session.recipe_ids.length
  const stepsDone = Object.values(session.step_state.steps).filter(s => s.completed_at != null).length
  const stepsTotal = session.step_state.order.length

  return (
    <button
      type="button"
      onClick={() => navigate(`/cook/session/${session.id}`)}
      className="w-full text-left bg-surface border border-accent/30 rounded-[--radius-card] px-4 py-3 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text font-sans truncate">
          {recipeCount > 1 ? `${recipeCount} recipes` : 'Recipe cook'}
        </p>
        <p className="text-xs text-text/50 font-sans">
          {stepsTotal > 0 ? `${stepsDone} of ${stepsTotal} steps` : 'Just started'} · {formatRelative(session.started_at)}
        </p>
      </div>
      <span className="text-xs text-primary font-semibold font-sans whitespace-nowrap">Resume →</span>
    </button>
  )
}

export function StandaloneCookPickerPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: cookSessions = [] } = useActiveCookSessions()
  const { data: recipes = [] } = useRecipes()

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-surface border-b border-accent/20 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-1 -ml-1 text-text/60 hover:text-text transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary leading-none">Cook mode</h1>
          <p className="text-sm text-text/60 font-sans">Pick a recipe to cook without a plan slot</p>
        </div>
      </div>

      <div className="px-4 py-6 pb-[64px] flex flex-col gap-6">
        {/* Resume in-progress section */}
        {cookSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text mb-2">Resume in progress</h2>
            <div className="flex flex-col gap-2">
              {cookSessions.map(s => (
                <SessionResumeCard key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

        {/* Recipe search + list */}
        <section>
          <input
            type="search"
            placeholder="Search recipes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-accent/30 rounded-[--radius-btn] px-3 py-2.5 text-sm font-sans text-text placeholder:text-text/40 focus:outline-none focus:border-primary/50 mb-4"
          />

          {filtered.length === 0 && (
            <div className="text-center py-8">
              {recipes.length === 0 ? (
                <>
                  <p className="text-text/60 font-sans mb-2">No recipes yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/recipes/new')}
                    className="text-primary underline text-sm font-sans"
                  >
                    Create a recipe first.
                  </button>
                </>
              ) : (
                <p className="text-text/60 font-sans">No recipes match your search.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filtered.map(recipe => (
              <div
                key={recipe.id}
                className="bg-surface border border-accent/30 rounded-[--radius-card] px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-2">
                  {recipe.freezer_friendly && (
                    <FreezerBadge variant="icon-only" />
                  )}
                  <p className="text-sm font-medium text-text font-sans truncate">{recipe.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/cook/${recipe.id}?source=recipe`)}
                  className="bg-primary text-white rounded-[--radius-btn] px-3 py-1.5 text-xs font-semibold shrink-0"
                >
                  Cook
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
