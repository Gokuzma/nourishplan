// Phase 28 anti-regression test — encodes UI-SPEC §Anti-Regression Contract (lines 291-304)
// as executable assertions. Protects the wire-in of generate-cook-sequence +
// generate-reheat-sequence into CookModePage from silent truncation by future
// worktree agents (L-020 / L-027 failure mode that produced the orphan originally).
//
// Test style: fs.readFileSync + string-match assertions, no React rendering.
// Follows the pattern of tests/cookMode.test.tsx and tests/PlanGrid.schedule.test.tsx.
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const COOK_MODE_PAGE_PATH = path.join(ROOT, 'src/pages/CookModePage.tsx')
const HOOK_COOK_PATH = path.join(ROOT, 'src/hooks/useGenerateCookSequence.ts')
const HOOK_REHEAT_PATH = path.join(ROOT, 'src/hooks/useGenerateReheatSequence.ts')
const OVERLAY_PATH = path.join(ROOT, 'src/components/cook/CookSequenceLoadingOverlay.tsx')

const cookModeSource = fs.readFileSync(COOK_MODE_PAGE_PATH, 'utf8')

describe('Phase 28 wire-in — UI-SPEC Guard 1: useGenerateCookSequence is imported and called', () => {
  it('CookModePage imports useGenerateCookSequence', () => {
    expect(cookModeSource).toContain("from '../hooks/useGenerateCookSequence'")
  })

  it('CookModePage calls useGenerateCookSequence() at least once', () => {
    const occurrences = cookModeSource.match(/useGenerateCookSequence/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2) // import + declaration
  })

  it('CookModePage invokes generateCookSequence.mutateAsync in handleStartCook', () => {
    expect(cookModeSource).toContain('generateCookSequence.mutateAsync')
  })
})

describe('Phase 28 wire-in — UI-SPEC Guard 2: useGenerateReheatSequence is imported and called', () => {
  it('CookModePage imports useGenerateReheatSequence', () => {
    expect(cookModeSource).toContain("from '../hooks/useGenerateReheatSequence'")
  })

  it('CookModePage calls useGenerateReheatSequence() at least once', () => {
    const occurrences = cookModeSource.match(/useGenerateReheatSequence/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })

  it('CookModePage fires generateReheatSequence.mutate in an auto-fire useEffect', () => {
    expect(cookModeSource).toContain('generateReheatSequence.mutate')
    expect(cookModeSource).toContain("flowMode !== 'reheat'")
  })
})

describe('Phase 28 wire-in — UI-SPEC Guard 3: CookSequenceLoadingOverlay is conditionally rendered on isPending', () => {
  it('CookModePage imports CookSequenceLoadingOverlay', () => {
    expect(cookModeSource).toContain("from '../components/cook/CookSequenceLoadingOverlay'")
  })

  it('CookModePage conditionally renders the overlay on generateCookSequence.isPending', () => {
    expect(cookModeSource).toContain('generateCookSequence.isPending')
    expect(cookModeSource).toMatch(/generateCookSequence\.isPending\s*&&\s*<CookSequenceLoadingOverlay/)
  })
})

describe('Phase 28 wire-in — UI-SPEC Guard 4: HARDCODED_REHEAT_FALLBACK is gated by fallback marker (D-02)', () => {
  it('HARDCODED_REHEAT_FALLBACK is declared in the file', () => {
    expect(cookModeSource).toContain('HARDCODED_REHEAT_FALLBACK')
  })

  it('the 3 lines before the first reheat-1 occurrence contain an isError/catch/fallback marker', () => {
    const lines = cookModeSource.split('\n')
    const firstReheat1Index = lines.findIndex(l => l.includes("'reheat-1'"))
    expect(firstReheat1Index).toBeGreaterThan(0)
    const context = lines.slice(Math.max(0, firstReheat1Index - 3), firstReheat1Index).join('\n')
    expect(context).toMatch(/isError|catch|fallback/i)
  })

  it('generateReheatSequence.isError branches render the hardcoded fallback', () => {
    expect(cookModeSource).toContain('generateReheatSequence.isError')
  })
})

describe('Phase 28 wire-in — UI-SPEC Guard 5: setFlowMode("cook") transitions preserved', () => {
  it('CookModePage transitions to cook mode at least twice (pre-existing paths preserved)', () => {
    const occurrences = cookModeSource.match(/setFlowMode\('cook'\)/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Phase 28 wire-in — UI-SPEC Guard 7: silent fall-through (no toast/banner/alert on AI failure, D-02 + D-05)', () => {
  it('no toast call is added on AI failure', () => {
    expect(cookModeSource).not.toMatch(/toast\s*\(/)
    expect(cookModeSource).not.toContain('react-hot-toast')
  })

  it('no role="alert" div is added', () => {
    expect(cookModeSource).not.toMatch(/role=["']alert["']/)
  })

  it('no "AI optimization unavailable" / "sequence unavailable" banner text', () => {
    expect(cookModeSource).not.toMatch(/optimization\s+unavailable/i)
    expect(cookModeSource).not.toMatch(/sequence\s+unavailable/i)
    expect(cookModeSource).not.toMatch(/ai\s+(?:call|request)\s+failed/i)
  })

  it('no aria-live="assertive" added (silent fall-through per UI-SPEC Failure-state UX decision)', () => {
    expect(cookModeSource).not.toMatch(/aria-live=["']assertive["']/)
  })
})

describe('Phase 28 wire-in — L-020 / L-027 preservation audit (8 pre-existing features)', () => {
  it('FlowMode union is unchanged', () => {
    expect(cookModeSource).toContain(
      "type FlowMode = 'loading' | 'resume-prompt' | 'multi-meal-prompt' | 'reheat' | 'cook' | 'error'"
    )
  })

  it('flowMode-routing useEffect preserved (scheduleStatus === "consume" branch)', () => {
    expect(cookModeSource).toContain("scheduleStatus === 'consume'")
  })

  it('handleTimerComplete + timer useEffect preserved', () => {
    expect(cookModeSource).toContain('handleTimerComplete')
    expect(cookModeSource).toContain('timer_started_at')
  })

  it('runCookCompletionIfSingleRecipe + Phase 28 console.warn preserved', () => {
    expect(cookModeSource).toContain('runCookCompletionIfSingleRecipe')
    expect(cookModeSource).toContain("Phase 28's scope")
  })

  it('resume-prompt branch preserved (copy matches Phase 23 baseline)', () => {
    expect(cookModeSource).toContain("flowMode === 'resume-prompt'")
    expect(cookModeSource).toContain('Resume cook session?')
    expect(cookModeSource).toContain('Start fresh')
  })

  it('main cook render preserves stepOrder.map + both bottom modals', () => {
    expect(cookModeSource).toContain('stepOrder.map')
    expect(cookModeSource).toContain('<CookDeductionReceipt')
    expect(cookModeSource).toContain('<AddInventoryItemModal')
  })

  it('all pre-existing critical imports preserved (spot-check set from PATTERNS.md)', () => {
    expect(cookModeSource).toContain('useLatestCookSessionForMeal')
    expect(cookModeSource).toContain('useActiveCookSessions')
    expect(cookModeSource).toContain('CookStepPrimaryAction')
    expect(cookModeSource).toContain('fireStepDoneNotification')
    expect(cookModeSource).toContain('NotificationPermissionBanner')
    expect(cookModeSource).toContain('useMealPlanSlots')
    expect(cookModeSource).toContain('useCookCompletion')
  })
})

describe('Phase 28 wire-in — supporting files exist with expected exports', () => {
  it('src/hooks/useGenerateCookSequence.ts exists and exports the hook', () => {
    const src = fs.readFileSync(HOOK_COOK_PATH, 'utf8')
    expect(src).toContain('export function useGenerateCookSequence')
    expect(src).toContain("supabase.functions.invoke('generate-cook-sequence'")
  })

  it('src/hooks/useGenerateReheatSequence.ts exists and exports the hook', () => {
    const src = fs.readFileSync(HOOK_REHEAT_PATH, 'utf8')
    expect(src).toContain('export function useGenerateReheatSequence')
    expect(src).toContain("supabase.functions.invoke('generate-reheat-sequence'")
  })

  it('src/components/cook/CookSequenceLoadingOverlay.tsx exists with LOCKED copy (U+2026 ellipsis)', () => {
    const src = fs.readFileSync(OVERLAY_PATH, 'utf8')
    expect(src).toContain('export function CookSequenceLoadingOverlay')
    expect(src).toContain('Planning your cook session…') // U+2026 (E2 80 A6)
    expect(src).not.toContain('Planning your cook session...') // ASCII three-period MUST NOT appear
    expect(src).toContain('This usually takes a few seconds.')
    expect(src).toContain('role="status"')
    expect(src).toContain('aria-busy="true"')
  })

  it('overlay component has no dismiss surface (UI-SPEC Guard 8)', () => {
    const src = fs.readFileSync(OVERLAY_PATH, 'utf8')
    expect(src).not.toMatch(/onClick=/)
    expect(src).not.toMatch(/onClose/)
    expect(src).not.toMatch(/onKeyDown=/)
  })
})
