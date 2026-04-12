import type { RecipeStep } from '../types/database'

export function isValidRecipeStep(v: unknown): v is RecipeStep {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    s.id.length > 0 &&
    typeof s.text === 'string' &&
    typeof s.duration_minutes === 'number' &&
    Number.isFinite(s.duration_minutes) &&
    s.duration_minutes >= 0 &&
    typeof s.is_active === 'boolean' &&
    Array.isArray(s.ingredients_used) &&
    s.ingredients_used.every(x => typeof x === 'string') &&
    Array.isArray(s.equipment) &&
    s.equipment.every(x => typeof x === 'string')
  )
}

export function parseStepsSafely(raw: unknown): RecipeStep[] | null {
  if (raw === null || raw === undefined) return null
  if (!Array.isArray(raw)) return null
  if (!raw.every(isValidRecipeStep)) return null
  return raw as RecipeStep[]
}

// Generate a stable step id. Used by generate-recipe-steps edge function AND by
// the recipe editor when the user manually adds a step (R-02: stable ids, not indexes).
export function generateStepId(): string {
  // crypto.randomUUID is available in all modern browsers + Deno 1.35+
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `step_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
