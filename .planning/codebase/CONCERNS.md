# Codebase Concerns

Analysis date: 2026-07-05. Sources: `lessons.md`, `.planning/STATE.md`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`, `.planning/SESSION-HANDOFF.md`, git log/status/diff, `supabase/functions/*`.

---

## 1. Tech Debt / Known Issues

### Deferred UAT and verification gaps (carried past v2.0 close)

STATE.md (`.planning/STATE.md` "Deferred Items") lists gaps acknowledged at milestone close 2026-04-24:

| Phase | Item | Status |
|---|---|---|
| 05, 06, 14 | Pre-v2 verification gaps, carried forward | human_needed |
| 19 | DnD gestures (desktop drag, mobile touch, lock badge round-trip) | human_needed |
| 21 | Schedule grid picker UAT (tap-cycle, save/reload, managed profiles) | human_needed |
| 24 | generate-plan redeploy verification + recipe mix slider UAT (3 pending scenarios) | partial |
| 26 | Criterion #5 live reconcile UAT | human_needed (but see below) |

The v2.0 milestone audit (`.planning/milestones/v2.0-MILESTONE-AUDIT.md`, status: `tech_debt`) tracks **22 deferred human UATs** across phases 18–23 (grocery realtime sync, feedback engine ratings, batch prep modal, Cook Mode realtime, OS notifications, NutritionGapCard, locked-slot shimmer, etc.). STATE.md flags these as an open blocker: "need a Playwright push or a QA session to graduate them from Partial to Validated."

Note: uncommitted edits to `26-HUMAN-UAT.md` and `22-HUMAN-UAT.md` (see §6) show the Phase 26 reconcile UAT and Phase 22 gaps were actually **closed on 2026-04-23** — the closure evidence exists only in the working tree, never committed. STATE.md's deferred table is therefore partially stale.

### IMPORT-03 — YouTube transcript import remains Partial

- v2.0 shipped 109/110 requirements Validated; IMPORT-03 (YouTube URL → recipe via transcript) is the lone Partial (`.planning/milestones/v2.0-REQUIREMENTS.md:200`).
- `fetchYoutubeTranscript` in `supabase/functions/import-recipe/index.ts` scrapes `ytInitialPlayerResponse` from the watch page HTML and pulls the first caption track — fragile against YouTube markup changes, region/consent walls, and videos without captions. Success rate is unmeasured; the one UAT sample fell through to the D-10 fallback (paste-text). Carried forward as explicit tech debt.

### No production error monitoring

STATE.md open blocker: FEED-02-class bugs (silent 400s on save) are only discoverable during UAT sessions, not in prod. Nothing (Sentry or similar) is wired up.

### Other

- **Zero TODO/FIXME/HACK markers** in `src/` and `supabase/functions/` — debt lives in planning docs and lessons, not code comments.
- `vite-plugin-pwa` + Vite 8 compatibility flagged as an open blocker (ecosystem still settling). A related stale-deploy bug was already fixed via autoUpdate SW (commit `6eb3061`).
- Phase 30 has no VALIDATION.md (NYQ-01, waived — E2E regression test covers it).

---

## 2. Fragile Areas

### Files explicitly called risky (CLAUDE.md)

- `src/lib/queryKeys.ts` — every hook depends on it. L-035 proved the fragility: `['grocery', ...]` invalidation does NOT cascade to `['grocery-items', ...]`; the grocery regenerate flow appeared broken until both prefixes were invalidated. Same divergent-prefix risk exists for `meals` vs `meal-plan-slots`, `recipes` vs `recipe-ingredients`.
- `supabase/migrations/` — irreversible in prod. L-032: migration 024's **function-based unique index** on `dietary_restrictions` broke every `.upsert(onConflict)` save for two days short of a month before UAT caught it. Any table whose uniqueness is an expression index cannot be upsert-targeted via PostgREST.
- `src/components/layout/Sidebar.tsx` / `MobileDrawer.tsx` — `tests/AppShell.test.tsx` asserts exact nav label lists; any nav change breaks tests (L-021).
- `src/contexts/AuthContext.tsx` — mocked by several tests; changes ripple.

### Recurring lesson themes (39 lessons, `lessons.md`)

1. **Worktree executor contamination (the dominant theme: L-020, L-027, L-029, L-031, plus memory file).** Parallel GSD agents repeatedly deleted unrelated features from shared files (`SlotCard.tsx` AIRationaleTooltip, `PlanGrid.tsx` generation hooks). Mitigation is procedural — post-merge diff review + explicit feature-preservation lists in prompts — not structural. Files touched by 3+ phases (`PlanGrid.tsx`, `generate-plan/index.ts`, `SlotCard.tsx`) are highest risk.
2. **LLM output treated as trusted (L-036, L-038, L-039).** Prompt-level "strong preferences" get violated; every invariant now needs a deterministic code guardrail. This pattern will recur for allergen avoidance and locked-slot protection, which L-038 notes still rely partly on prompt rules.
3. **Silent Supabase failures (L-006, L-018, L-032, L-033).** NOT NULL rollbacks, partial-index upsert 400s, and missing companion rows (`meal_items`) all fail without visible errors. Combined with no prod monitoring (§1), these surface only when a user sees wrong numbers.
4. **Edge function deploy/auth friction (L-025, L-034, L-037).** `--no-verify-jwt` required on every deploy; undeployed functions masquerade as CORS errors; management PATs rot silently. Deploy state and git state routinely drift (see §3).
5. **Verification theater risk (L-007, L-013, L-014, L-026, L-028).** Multiple lessons about claiming things work without live-browser proof; Playwright MCP itself has false-positive traps (ambient text matches, transient toast latency).
6. **Cross-domain naming mismatches (L-008).** `"Snack"` (schedules table) vs `"Snacks"` (plan grid) requires manual normalization at every bridge point — a permanent landmine for new features.

---

## 3. Recipe/Content Bottleneck

The app's planner quality is gated on recipe supply and correct slot tagging. This has been the main workstream since v2.0 closed (all 5 recent feature/fix commits target it).

### Recipe entry paths (4 in-app + 1 ad-hoc)

1. **Manual RecipeBuilder** — `useCreateRecipe` (`src/hooks/useRecipes.ts`) creates a bare row; acceptable per L-036 only because the builder flow follows, but it does not tag `meal_types` first.
2. **`supabase/functions/import-recipe`** — URL / YouTube / pasted text → Haiku extraction. Now tags `meal_types` (uncommitted, see below).
3. **`supabase/functions/create-recipe-from-suggestion`** — accepts generate-plan's suggested recipes. Historically minted `meal_types=[]` "wildcards" (L-036 root cause); fixed.
4. **`supabase/functions/recipe-supply`** — new (commit `9669665`): AI gap-fill for undersupplied slots + classify-untagged backfill mode.
5. **`.recipe-import/` python scripts (untracked)** — bulk import from `source-recipes.json` (blog URLs) + `backfill-meal-types.py` heuristic classifier, run directly against prod with a service-role key. Ad-hoc, unversioned, household-hardcoded.

### The wildcard/misclassification saga (what recent commits address)

- `meal_types=[]` is treated by `generate-plan` as "eligible for ANY slot". 31 legacy recipes plus every suggestion-created recipe were wildcards → dinner recipes ("Perfect Ramen Eggs") landed in Breakfast slots (L-036).
- Commit `9669665` added `recipe-supply` (AI supply + classify). Classification then **over-tagged** (Roti → Breakfast+Lunch+Dinner, L-039).
- Commit `fbb140f` added a **deterministic slot guardrail** in `generate-plan/index.ts` (~line 930): after the LLM assigns, any recipe whose tags exclude the target slot is swapped for a slot-appropriate safe recipe or dropped (L-038 — prompt preferences alone were violated even with 8 breakfast recipes available). Also tightened the recipe-supply classify prompt (strict Breakfast ALLOW-list, max 2 slots, never 3).
- Residual risk: already-mistagged rows are skipped by classify (it only touches `meal_types=[]`), so bad tags need manual PATCHes; the guardrail is the only runtime backstop.

### Uncommitted `import-recipe/index.ts` — mid-flight work

The working-tree diff adds `meal_types` extraction to import-recipe (prompt schema line, sanitize filter against `VALID_MEAL_TYPES`, insert column). Two concerns:

1. **Deployed-but-uncommitted drift.** L-036 (committed 2026-05-31) states "import-recipe tags it correctly" — meaning this change was almost certainly **deployed to Supabase without ever being committed**. The repo does not reflect prod. A redeploy from a clean checkout would silently regress meal_types tagging on imports.
2. **Prompt lags L-039.** The uncommitted prompt still uses the weaker rule ("Never put soups, stews, curries, or chili in Breakfast", allows two slots, permits `[]`), while `recipe-supply/index.ts:235` has the strict version (Breakfast ALLOW-list, explicit flatbread/sides DENY-list, "NEVER assign three"). L-039's rule says both functions must share the same criteria — import-recipe hasn't been updated. Imported flatbreads/sides can still be tagged Breakfast.

**Action needed:** commit the current import-recipe change (it is live behavior), then port the L-039 strict prompt to it and redeploy.

---

## 4. Data / Schema Concerns

- **AI-estimated nutrition.** All non-manual recipe paths get per-100g macros from Haiku ("use realistic per-100g values") — unverified estimates. `recipe-supply` at least clamps values (`clamp()` — kcal ≤ 900/100g etc.); `import-recipe` does no plausibility check beyond `|| 0` defaults. `verify-nutrition`, `search-cnf`, `search-usda` edge functions exist but are not in the import loop.
- **The meal_items contract (L-033).** Slot nutrition depends on an implicit convention: a recipe-wrapping `meals` row must have one `meal_items` row with `quantity_grams=100` and **per-serving** macros packed into `*_per_100g` fields ("1 item @100g = 1 serving"). Any code path that creates meals and forgets this renders 0 kcal everywhere (happened to a full generated week). `compute-batch-prep` and `create-recipe-from-suggestion` were flagged for audit; the convention is undocumented outside lessons.md and easy to violate.
- **Ingredient duplication/matching.** `import-recipe` matches `custom_foods` by case-insensitive exact name (`ilike` with no wildcards); near-misses ("chicken breast" vs "chicken breasts") mint duplicate foods with divergent macros.
- **Category not persisted.** `custom_foods` has no `category` column; AI-supplied category only rides on `recipe_ingredients` for YIELD_FACTORS lookup — inventory/grocery classification can't reuse it.
- **`meal_types=[]` still legal.** Migration 032's default is `{}`; nothing at the DB level prevents new wildcards — enforcement is per-code-path convention (L-036) plus the generate-plan guardrail.

---

## 5. Security / Permissions

- **Phase 30 (granular household permissions)** shipped as deliberately simple **binary admin/member** roles (no editor/viewer tier despite the phase title), reusing 17 existing RLS policies. Last-admin protection is double-enforced (DB trigger + RPC). 8/8 SPEC-Reqs verified with a Playwright E2E admin-promotion flow. Solid, but the phase name vs shipped scope gap means "editor/viewer" granularity is still unbuilt if it's ever expected.
- **Service-role key hardcoded in `.recipe-import/backfill-meal-types.py`** (untracked). An `sb_secret_…` key sits in plaintext in the repo directory alongside a prod household ID. It is not committed, but one careless `git add .` away from history. Should be moved to `.env.local` reference and the key rotated if the folder was ever shared.
- **Edge functions deployed with `--no-verify-jwt`** (L-025, ES256 migration fallout). Every function does its own `getUser(token)` — correct pattern, but any future function that forgets in-function auth while following the deploy convention would be publicly invocable.
- **CORS `Access-Control-Allow-Origin: *`** on all edge functions — acceptable given JWT auth, but worth revisiting alongside the above.

---

## 6. Uncommitted Work (git status, 2026-07-05)

Working tree has been dirty since ~2026-04-23 (planning docs) and 2026-05-31 (import-recipe):

- **`supabase/functions/import-recipe/index.ts` (modified)** — the meal_types extraction described in §3. Deployed behavior not in git. Highest-priority commit.
- **Planning doc updates (modified, ~2.5 months old):** `13-VERIFICATION.md` (gaps_found → passed 6/6), `22-HUMAN-UAT.md` (diagnosed → complete, gaps closed by plans 22-06..09), `26-HUMAN-UAT.md` (partial → complete; criterion #5 reconcile verified live 2026-04-23 with full evidence). These closures contradict the committed STATE.md/audit "deferred" tables — committing them would materially improve the deferred-item picture.
- **`.planning/SESSION-HANDOFF.md` (untracked)** — 2026-04-27 handoff; its bug list is fully resolved, but two feature specs (slot-prioritized searchable RecipePicker; view-recipe-scaled-to-household) remain open work items not tracked anywhere else.
- **`.recipe-import/` (untracked)** — bulk-import tooling + progress state + hardcoded secret (§5). Decide: gitignore it (after secret removal) or delete.
- **`NourishPlan Edits/` (untracked)** — ~phone screenshots (IMG_3375+.PNG), likely a user-feedback/edit backlog nobody has triaged into planning.
- **398 `.playwright-mcp/page-*.yml` snapshots + ~20 root-level PNG screenshots (untracked)** — UAT session debris; should be gitignored/cleaned.
- **`supabase/.temp/*` (modified)** — CLI version churn; noise, candidate for gitignore.
- **`.planning/phases/30-*/.gitkeep` (untracked)** — leftover from Phase 30 archive.

**What it suggests:** sessions end without a commit-hygiene pass; deployed edge-function state, UAT closure evidence, and open feature specs all live only in the working tree. A single "housekeeping" commit series (import-recipe, planning doc closures, .gitignore additions, secret removal) would eliminate most of the drift.
