---
phase: 24
slug: dynamic-portioning
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run <changed-file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

Pre-test hygiene (L-001): remove worktree copies before running vitest.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-file>`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green + Playwright UAT on staging with seeded rating history
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-T1 | 24-01 | 1 | PORT-02 | T-24-01, T-24-04 | localStorage read wrapped in try/catch; malformed data returns defaults | unit (8 tests) | `npx vitest run tests/RecipeMixPanel.test.tsx` | ❌ Wave 0 (this task creates it) | ⬜ pending |
| 24-01-T2 | 24-01 | 1 | PORT-02 | T-24-02 | PlanGrid forwards recipeMix in payload; L-020 preservation grep checks | integration (grep + vitest) | `grep -q "RecipeMixPanel" src/components/plan/PlanGrid.tsx && grep -q "AIRationaleTooltip" src/components/plan/PlanGrid.tsx && npx vitest run tests/RecipeMixPanel.test.tsx` | ✅ (PlanGrid.tsx exists) | ⬜ pending |
| 24-02-T1 | 24-02 | 1 | PORT-01, PORT-02 | T-24-05 through T-24-12 | Enriched catalog + tier-aware prompts; server-side mix normalization; L-020 preservation grep checks; PORT-01 regression proof | grep assertions + unit regression | `grep -q "recipeMix" supabase/functions/generate-plan/index.ts && grep -q "spend_logs" ... && npx vitest run src/utils/portionSuggestions.test.ts` (see plan verify block for full chain) | ✅ (generate-plan/index.ts exists) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/RecipeMixPanel.test.tsx` — created inside Task 24-01-T1 (TDD behavior block drives 8 tests); covers PORT-02 slider render, rebalance math, localStorage persistence, and `getRecipeMix` helper.
- [x] PORT-01 regression covered by existing `src/utils/portionSuggestions.test.ts` (Phase 5) — no new file needed since `portionSuggestions.ts` is not modified.
- [x] Edge function changes (24-02-T1) have no Deno test harness in this project — validated via grep assertions on preservation list + live UAT per RESEARCH §Validation Architecture. This is a project-wide accepted precedent (Phase 22 used the same validation approach).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| generate-plan catalog includes cook_count, last_cooked_date, cost_per_serving, tier_hint | PORT-02 | No Deno edge-function test harness exists in the project; validated via debug fields in `plan_generations.constraint_snapshot` | After deploy, trigger Generate Plan via the live app; query `plan_generations` latest row and inspect `constraint_snapshot` JSON for the new fields |
| AI rationale strings begin with "Favorite —", "Liked —", or "Novel —" | PORT-02 | Depends on live Anthropic API output; cannot be unit tested | After deploy, generate a plan; query `meal_plan_slots` for the generated plan; every `generation_rationale` must begin with one of the three tier prefixes (or fallback nutrition-fit string when no history) |
| Tier-adapted scheduling behavior (favorites repeat, novels suggested by similarity) | PORT-02 | Requires seeded rating + cook history to be meaningful | Seed via Supabase REST API per L-012: 2-3 rated recipes (4-5 stars, cooked 3+ times), 2-3 unrated recipes. Generate plan. Verify proven favorites appear approximately 50% of slots with the default mix; adjust mix to 80/10/10 and regenerate — favorite slot count should increase. |
| PORT-01 regression: calorie-driven portion math unchanged | PORT-01 | Automated via existing vitest run | `npx vitest run src/utils/portionSuggestions.test.ts` green before and after phase |
| Recipe Mix slider UI renders correctly on mobile and desktop (dark mode + light mode) | PORT-02 | Visual-only concerns (contrast, thumb hitbox, chevron rotation) | Playwright on staging — expand panel, tab through sliders, screenshot light + dark |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: every task includes an automated grep/vitest step; no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (RecipeMixPanel.test.tsx is Wave 0 via TDD in 24-01-T1; edge function has accepted manual-only precedent)
- [x] No watch-mode flags (all commands use `npx vitest run`, not `npx vitest`)
- [x] Feedback latency < 60s (RecipeMixPanel test suite < 5s; full suite ~30s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-15
