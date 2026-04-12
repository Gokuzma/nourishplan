---
phase: 23
slug: prep-optimisation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | Default vitest config; setup file at `tests/setup.ts` |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <file_under_test>`
- **After every plan wave:** Run `npx vitest run src/hooks src/components/cook src/components/plan tests/AppShell.test.tsx && npx tsc -b`
- **Before `/gsd-verify-work`:** Full suite must be green + `npx supabase db push --dry-run` + Playwright UAT on `/cook/:mealId`, `/cook`, `/plan` batch prep modal, `/recipes/:id` cook CTA
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| V-ID | Behavior | Req | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|------|----------|-----|-----------|-----------------|-----------|-------------------|--------|
| V-01 | `parseStepsSafely` handles malformed JSONB + Cook Mode renders null instructions | PREP-02 | JSON injection | Malformed AI output returns empty array, not crash | unit | `npx vitest run src/utils/parseStepsSafely.test.ts` | ⬜ pending |
| V-02 | `useCookSession` subscription cleanup on unmount (removeChannel called) | PREP-02 | — | No subscription leak on route change | unit | `npx vitest run src/hooks/useCookSession.test.ts` | ⬜ pending |
| V-03 | Notification denied state shows in-app fallback (audible chime + banner) | PREP-02 | Notification spam | Denied state gracefully degrades | unit + manual | `npx vitest run src/components/cook/CookStepTimer.test.tsx` | ⬜ pending |
| V-04 | Migration 029 applies without error | ALL | — | Schema changes are non-destructive | integration | `SUPABASE_ACCESS_TOKEN=... npx supabase db push --dry-run` | ⬜ pending |
| V-05 | Sidebar/TabBar nav count remains exactly 10 after Phase 23 | ALL | — | No unintended nav additions (L-021) | smoke | `npx vitest run tests/AppShell.test.tsx` | ⬜ pending |
| V-06 | RLS on `cook_sessions` blocks cross-household access | ALL | Spoofing | Insert with wrong household_id rejected | integration | `npx vitest run tests/cookSessionRLS.test.ts` | ⬜ pending |
| V-07 | Step regeneration only fires from ingredient save (not name/servings) | PREP-02 | — | No wasted AI credits on irrelevant changes | static | `grep -rn useRegenerateRecipeSteps src/ --include="*.tsx"` | ⬜ pending |
| V-08 | `useUpdateCookStep` merges partial state, doesn't replace entire step_state | PREP-02 | JSONB concurrent write | Partner check-offs not lost on concurrent update | unit | `npx vitest run src/hooks/useUpdateCookStep.test.ts` | ⬜ pending |
| V-09 | 30s debounce resets on rapid plan changes; coalesces into single recompute | PREP-01 | DoS / cost | Burst slot drags don't fire burst AI calls | unit | `npx vitest run src/hooks/useBatchPrepSummary.test.ts` | ⬜ pending |
| V-10 | `generate-recipe-steps` increments same `plan_generations` counter as `generate-plan` | ALL | Rate limit bypass | Shared per-household daily cap enforced across all AI calls | integration | `npx vitest run tests/rateLimitShared.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/parseStepsSafely.test.ts` — malformed JSONB edge cases
- [ ] `src/hooks/useCookSession.test.ts` — realtime subscription teardown + optimistic updates
- [ ] `src/hooks/useBatchPrepSummary.test.ts` — 30s debounce, stale indicator, rapid-reset
- [ ] `src/hooks/useRecipeSteps.test.ts` — fetch, update, regenerate-on-ingredient-change
- [ ] `src/hooks/useNotificationPermission.test.ts` — permission state transitions, localStorage cooldown
- [ ] `src/components/cook/CookModeShell.test.tsx` — route mount, step rendering, progress bar
- [ ] `src/components/cook/CookStepTimer.test.tsx` — countdown, warning state, completion trigger
- [ ] `src/components/plan/BatchPrepModal.test.tsx` — open/close, empty state, stale indicator
- [ ] `src/components/plan/BatchPrepSessionCard.test.tsx` — session data + freezer badges
- [ ] `src/components/plan/FreezerBadge.test.tsx` — all four placement variants
- [ ] `src/components/recipe/RecipeStepsSection.test.tsx` — drag reorder, edit, add, delete, regenerate
- [ ] Extend `tests/AppShell.test.tsx` — confirm nav count stays 10
- [ ] Extend `src/components/plan/SlotCard.test.tsx` — new Cook button + freezer badge

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA notification fires on passive step timer complete (cross-platform) | PREP-02, R-03 | Requires OS-level notification permission | Test matrix: Chrome Android, Safari iOS ≥16.4, macOS Safari, macOS Chrome, Windows Chrome/Edge |
| Cook Mode resumes on different device | PREP-02, D-22 | Requires two physical devices | Start cook on device A, close tab, open same URL on device B, verify step state synced |
| Batch prep D-16 auto-reassignment visible in plan grid | PREP-01, D-16 | Requires generated plan with consume-only slots | Generate a plan where a recipe is assigned to a consume slot with no prep slot, open batch prep modal, verify the recipe is reassigned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
