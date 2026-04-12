// Cook Mode: V-05 nav count, V-06 RLS isolation, V-07 regeneration scoping,
// V-08 JSONB merge, V-09 debounce, V-10 rate limit sharing
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')

describe('Cook Mode route registration', () => {
  const appSource = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8')

  it('registers /cook/:mealId route', () => {
    expect(appSource).toContain('path="/cook/:mealId"')
  })

  it('registers /cook/session/:sessionId route', () => {
    expect(appSource).toContain('path="/cook/session/:sessionId"')
  })

  it('registers /cook standalone route', () => {
    expect(appSource).toContain('path="/cook"')
  })
})

describe('Nav items unchanged after Phase 23 (V-05, L-021)', () => {
  it('Sidebar does not contain Cook or Prep nav items', () => {
    const sidebar = fs.readFileSync(path.join(ROOT, 'src/components/layout/Sidebar.tsx'), 'utf8')
    expect(sidebar).not.toMatch(/label:\s*['"]Cook/i)
    expect(sidebar).not.toMatch(/to:\s*['"]\/cook/i)
  })

  it('TabBar does not contain Cook or Prep nav items', () => {
    const tabbar = fs.readFileSync(path.join(ROOT, 'src/components/layout/TabBar.tsx'), 'utf8')
    expect(tabbar).not.toMatch(/label:\s*['"]Cook/i)
    expect(tabbar).not.toMatch(/to:\s*['"]\/cook/i)
  })
})

describe('Step regeneration scoping (V-07)', () => {
  it('useRegenerateRecipeSteps is only used within the recipe editor components (RecipeBuilder + RecipeStepsSection)', () => {
    const srcDir = path.join(ROOT, 'src')
    const importingFiles: string[] = []

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const content = fs.readFileSync(full, 'utf8')
          if (content.includes('useRegenerateRecipeSteps') && !full.includes('useRecipeSteps.ts')) {
            importingFiles.push(full.replace(srcDir + path.sep, ''))
          }
        }
      }
    }
    walk(srcDir)

    // Only consumer components (not the hook definition file itself)
    const consumers = importingFiles.filter(f => !f.includes('hooks/'))

    // At least RecipeBuilder must consume it (it's the entry point per V-07)
    expect(consumers).toEqual(expect.arrayContaining([expect.stringContaining('RecipeBuilder')]))

    // No consumers outside the recipe editor components — RecipeStepsSection is
    // a sub-component of RecipeBuilder (only imported there), so both are acceptable
    const outsideRecipeEditor = consumers.filter(
      f => !f.includes('RecipeBuilder') && !f.includes('RecipeStepsSection')
    )
    expect(outsideRecipeEditor).toHaveLength(0)
  })
})

describe('cook_sessions RLS isolation (V-06)', () => {
  it('cook_sessions migration enforces household_id via get_user_household_id() on all four RLS policies', () => {
    const migration = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/029_prep_optimisation.sql'),
      'utf8'
    )
    expect(migration).toContain('household_id = get_user_household_id()')
    // All four RLS policies (select, insert, update, delete) use this check
    const policyCount = (migration.match(/household_id = get_user_household_id\(\)/g) || []).length
    expect(policyCount).toBeGreaterThanOrEqual(4)
  })
})

describe('JSONB concurrent write safety (V-08)', () => {
  it('useUpdateCookStep merges partial state into steps[stepId] using spread', () => {
    const hookSource = fs.readFileSync(path.join(ROOT, 'src/hooks/useCookSession.ts'), 'utf8')
    // Spread of existing steps plus merge of patch into the target step
    expect(hookSource).toContain('...currentState.steps')
    expect(hookSource).toContain('...existing, ...params.patch')
    // Optimistic update path also merges correctly
    expect(hookSource).toContain('onMutate')
    expect(hookSource).toContain('setQueryData')
  })
})

describe('Batch prep 30s debounce (V-09)', () => {
  it('useBatchPrepSummary hook contains 30-second debounce logic', () => {
    const hookSource = fs.readFileSync(path.join(ROOT, 'src/hooks/useBatchPrepSummary.ts'), 'utf8')
    // 30_000 or 30000 or a DEBOUNCE constant that equals 30 seconds
    expect(hookSource).toMatch(/30\s*_?\s*000|30000|DEBOUNCE/)
    // Uses timeout/interval for the debounce
    expect(hookSource).toMatch(/setTimeout|useEffect/)
    // Clears timer on reset (ensures reset behavior)
    expect(hookSource).toMatch(/clearTimeout|timerRef|debounceTimerRef/)
  })
})

describe('Rate limit sharing (V-10)', () => {
  it('generate-recipe-steps writes kind column to plan_generations (shares Phase 22 counter)', () => {
    const edgeFn = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/generate-recipe-steps/index.ts'),
      'utf8'
    )
    // V-10: Phase 23 step generation reuses the plan_generations rate-limit table
    expect(edgeFn).toContain('plan_generations')
    // kind column identifies this as a 'steps' generation (not a plan generation)
    expect(edgeFn).toMatch(/kind.*steps|steps.*kind/)
  })
})
