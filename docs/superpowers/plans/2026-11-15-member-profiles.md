# Member Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-person profiles (age, sex, height, weight, target weight, activity, pregnancy, notes) that compute suggested calories, macros and micros; pregnancy-safe meal planning; a timed generation progress bar.

**Architecture:** Profile columns live on the existing `nutrition_targets` row. A pure `src/utils/nutritionProfile.ts` computes suggestions, and the user applies them to targets explicitly. Pregnancy safety is a pure shared module used by `generate-plan`, with prompt rules, a code filter and a forced verify pass.

**Tech Stack:** Vite + React 19, TanStack Query, Supabase (Postgres + Deno edge functions), Vitest + Testing Library, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-15-member-profiles-design.md`

## Global Constraints

- Migration is additive nullable columns only (plus `is_pregnant boolean not null default false`). File: `supabase/migrations/041_member_profile_stats.sql`.
- Store metric only (`kg`, `cm`). The UI converts imperial with 1 lb = 0.45359237 kg and 1 in = 2.54 cm.
- Rounding: calories to the nearest 10; grams and micros to whole numbers.
- Profile changes never write calories/macros/micros. Only **Apply to targets** does.
- Apply writes calories, protein_g, carbs_g, fat_g; merges suggested micro keys into `micronutrients`; keeps `custom_goals` and `macro_mode`.
- "Differs" = |calories Δ| > 50 or any macro |Δ| > 5 g.
- Notes are capped at 500 characters (UI `maxLength` and DB check).
- Copy: "Visible to your household." under Notes. Medical disclaimer under the suggestion: "Estimates only. Check with your doctor or midwife." (pregnant) or "Estimates only. Check with your pediatrician." (child) or "Estimates only." (adult).
- Partial-plan banner copy: "Not pregnancy-safety checked. Regenerate or review."
- Progress copy: "Usually about {N} s", "Taking longer than usual, still working…", "Extra safety check for pregnancy".
- Run L-001 worktree cleanup before vitest if `.claude/worktrees/agent-*` exists.
- Every task ends green on `npx vitest run` and `npx tsc -b`.

## Review Focus

1. **Due date far in the past or more than 300 days out**: no pregnancy adjustment, and the profile shows "Due date has passed: update pregnancy?" (past) rather than computing a negative trimester. Test in Task 2.
2. **Member with targets but no profile (every existing row today)**: the targets page and presets behave exactly as before, and the Profiles row shows "No profile yet". Test in Task 5.
3. **Saving a target in `NutritionTargetsForm` after a profile exists**: it must not null the profile columns (the upsert only sends target columns, so the test asserts the payload has no profile keys). Test in Task 3.
4. **Child turning 3 (age-band boundary)**: the 1–2 equation applies at age 2 and the 3–8 equation at 3, by whole years from the birth date. Test in Task 2.
5. **Imperial round trip**: entering 5 ft 4 in / 150 lb, then saving and reloading, shows the same values (no drift from repeated conversion, because display rounds to 0.1 lb / whole inch). Test in Task 4.

---

### Task 1: Migration and types

**Files:**
- Create: `supabase/migrations/041_member_profile_stats.sql`
- Modify: `src/types/database.ts` (`NutritionTarget`), `src/types/database.gen.ts` (nutrition_targets Row/Insert/Update)

**Interfaces:**
- Produces: on `NutritionTarget`: `birth_date: string | null`, `sex: 'female' | 'male' | null`, `height_cm: number | null`, `weight_kg: number | null`, `target_weight_kg: number | null`, `pre_pregnancy_weight_kg: number | null`, `activity_level: ActivityLevel | null`, `is_pregnant: boolean`, `due_date: string | null`, `notes: string | null`. Export `type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'` from `src/types/database.ts`.

- [ ] **Step 1: Write migration**: `alter table public.nutrition_targets add column ...` for each column, with `check (sex in ('female','male'))`, `check (activity_level in (...))`, `check (char_length(notes) <= 500)`, and positive checks on height/weight columns (`> 0`). No RLS change (existing row policies cover new columns).
- [ ] **Step 2: Update both type files** with the fields above.
- [ ] **Step 3: Verify**: `npx tsc -b` succeeds (some fixtures building `NutritionTarget` may need the new fields; add them as `null`/`false`), and `npx vitest run` passes.
- [ ] **Step 4: Commit**: `feat(db): profile stats columns on nutrition_targets`. The migration is applied in Task 9.

### Task 2: Suggestion engine

**Files:**
- Create: `src/utils/nutritionProfile.ts`
- Test: `src/utils/nutritionProfile.test.ts`

**Interfaces:**
- Consumes: `NutritionTarget`, `ActivityLevel` (Task 1).
- Produces:
  - `type MemberStats = Pick<NutritionTarget, 'birth_date'|'sex'|'height_cm'|'weight_kg'|'target_weight_kg'|'pre_pregnancy_weight_kg'|'activity_level'|'is_pregnant'|'due_date'>`
  - `type ProfileField = 'birth_date'|'sex'|'height_cm'|'weight_kg'|'activity_level'|'due_date'`
  - `interface SuggestedTargets { calories: number; protein_g: number; carbs_g: number; fat_g: number; micronutrients: Record<'fiber_g'|'calcium_mg'|'iron_mg'|'folate_mcg', number>; explanation: string[]; kind: 'adult'|'pregnant'|'child'; trimester?: 1|2|3 }`
  - `type SuggestionResult = { ok: true; suggestion: SuggestedTargets } | { ok: false; missing: ProfileField[]; reason?: 'under_one' }`
  - `ageInYears(birthDate: string, today: Date): number`
  - `pregnancyStatus(dueDate: string, today: Date): { trimester: 1|2|3 } | { expired: true }`: gestational days = 280 − days until due; week = floor(days/7); T1 < 14, T2 14–27, T3 ≥ 28; expired when due < today or days until due > 300.
  - `suggestTargets(stats: MemberStats, isChild: boolean, today: Date): SuggestionResult`

Formulas (spec values):
- Adult (age ≥ 18): BMR = 10·kg + 6.25·cm − 5·age + (male +5 / female −161); × {1.2, 1.375, 1.55, 1.725, 1.9}. target < weight − 1 → −500, floored at 1500 male / 1200 female; target > weight + 1 → +300. Protein 1.6·kg when losing, else 1.2·kg. Fat 30% kcal / 9. Carbs = (kcal − 4p − 9f) / 4.
- Pregnant (adult, `is_pregnant`, not expired): weight = `pre_pregnancy_weight_kg ?? weight_kg`, maintenance (no deficit, target ignored) + {0, 340, 452}. Protein T1 1.2·kg, T2/T3 1.2·kg + 25. Fat 30%. Micros iron 27, folate 600, calcium 1000. When expired, compute as a non-pregnant adult and add the explanation line "Due date has passed: update pregnancy?".
- Child (age < 18; `isChild` or age < 18): 2005 IOM EER, h in metres. Age 1–2: 89·kg − 100 + 20. Age 3–8 boy: 88.5 − 61.9·age + PA·(26.7·kg + 903·h) + 20; girl: 135.3 − 30.8·age + PA·(10·kg + 934·h) + 20. Ages 9–18: same equations with +25 instead of +20. PA boy {1.00, 1.13, 1.26, 1.26, 1.42}, girl {1.00, 1.16, 1.31, 1.31, 1.56} for sedentary/light/moderate/active/very_active. Protein g/kg: 1–3 1.05, 4–13 0.95, 14–17 0.85. Fat 35% (1–3) else 30%. Age < 1 → `{ ok:false, missing:[], reason:'under_one' }`. Target weight ignored.
- Micros by age band (fiber_g, calcium_mg, iron_mg, folate_mcg): 1–3 {19,700,7,150}; 4–8 {25,1000,10,200}; 9–13 M {31,1300,8,300} F {26,1300,8,300}; 14–18 M {38,1300,11,400} F {26,1300,15,400}; 19–50 M {38,1000,8,400} F {25,1000,18,400}; 51+ M {30,1000,8,400} F {21,1200,8,400}.
- Required fields: birth_date, sex, height_cm, weight_kg, activity_level; plus due_date when `is_pregnant`. Missing → `{ ok:false, missing }`.
- Explanation lines, e.g. `"BMR 1,420 kcal × lightly active (1.375) = 1,950 kcal"`, `"−500 kcal to move toward 60 kg"`, `"+340 kcal for trimester 2"`, `"IOM energy estimate for a 3-year-old boy"`.

- [ ] **Step 1: Write failing tests** (`today = new Date('2026-11-15')`):
  - `adult female maintain`: 1990-06-01, female, 165 cm, 60 kg, target 60, light → BMR = 600+1031.25−180−161 = 1290.25; ×1.375 = 1774.1 → calories 1770; protein 72; fat 59; carbs (1770−288−531)/4 = 238 (rounded from 237.75).
  - `adult male lose`: 1985-01-01, male, 180 cm, 90 kg, target 80, moderate → BMR 900+1125−205+5 = 1825; ×1.55 = 2828.75; −500 = 2328.75 → 2330; protein 144.
  - `floor applies`: female, 150 cm, 50 kg, target 45, sedentary, 1960-01-01 → result calories 1200.
  - `gain`: target > weight + 1 → maintenance + 300.
  - `pregnant T2 uses pre-pregnancy weight`: due 2027-03-01 (106 days → gest 174 days → week 24 → T2), pre 62, current 68, female 165 cm, 1994-01-01, light → maintenance from 62 kg, +340, protein round(1.2·62 + 25) = 99, micros iron 27, folate 600, calcium 1000, `trimester: 2`, `kind: 'pregnant'`; target_weight ignored even if set lower.
  - `pregnancyStatus` T1/T2/T3 boundaries at weeks 13/14 and 27/28; past due → `{expired:true}`; due 2028-01-01 → `{expired:true}`.
  - `expired pregnancy computes as adult` and explanation includes "Due date has passed: update pregnancy?".
  - `toddler Alex`: boy, 2023-06-01 (age 3), 95 cm, 15 kg, light, isChild → 88.5 − 185.7 + 1.13·(400.5 + 857.85) + 20 = 1344.7 → 1340; protein round(1.05·15) = 16; fat round(0.35·1340/9) = 52; micros {19,700,7,150}; `kind: 'child'`.
  - `age 2 uses 1–2 equation`: born 2024-06-01, 12 kg → 89·12 − 100 + 20 = 988 → 990. `age 3 boundary`: born 2023-11-15 → 3–8 equation.
  - `teen girl 15 uses +25`: born 2011-01-01, 160 cm, 52 kg, moderate → 135.3 − 462 + 1.31·(520 + 1494.4) + 25 = 2337.2 → 2340.
  - `under one`: born 2026-03-01 → `{ ok:false, missing:[], reason:'under_one' }`.
  - `missing fields`: `{ sex:null, height_cm:null, ... }` → `missing` lists them; pregnant without due_date → includes `'due_date'`.
- [ ] **Step 2: Run** `npx vitest run src/utils/nutritionProfile.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** the functions above in `src/utils/nutritionProfile.ts`.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit**: `feat(targets): profile-based target suggestion engine`.

### Task 3: Profile save and Apply mutations

**Files:**
- Modify: `src/utils/nutritionProfile.ts` (pure payload helpers), `src/hooks/useNutritionTargets.ts`
- Test: `src/utils/nutritionProfile.test.ts`, `tests/nutrition-targets.test.ts` (existing; add the Review Focus #3 assertion)

**Interfaces:**
- Consumes: `MemberStats`, `SuggestedTargets` (Task 2).
- Produces:
  - `buildApplyPayload(existing: NutritionTarget | null, s: SuggestedTargets): { calories; protein_g; carbs_g; fat_g; micronutrients: Record<string, number>; custom_goals: Record<string, number>; macro_mode: 'grams'|'percent' }`: merges micros over `existing?.micronutrients ?? {}`; keeps `existing.custom_goals ?? {}` and `existing.macro_mode ?? 'grams'`.
  - `targetsDifferFromSuggestion(existing: NutritionTarget | null, s: SuggestedTargets): boolean`: true when existing is null or calories are null, or past the thresholds in Global Constraints.
  - `useSaveMemberStats()`: mutation `{ householdId, memberId, memberType, stats: MemberStats & { notes: string | null } }` upserts **only** key columns + profile columns (onConflict as in `useUpsertNutritionTargets`). For `memberType === 'profile'` with a `birth_date`, also `update member_profiles set birth_year` and ignore any error from that second call. Invalidates `['nutrition-targets', householdId]` and `queryKeys.memberProfiles` if that key exists (check `queryKeys.ts`).
  - `useApplySuggestedTargets()`: mutation `{ householdId, memberId, memberType, existing, suggestion }` → upsert keys + `buildApplyPayload(...)`; same invalidation as the existing upsert hook.

- [ ] **Step 1: Failing tests**: `buildApplyPayload` keeps `custom_goals {water_ml: 2000}` and `micronutrients.sodium_mg 2300` while overwriting `iron_mg`; keeps `macro_mode 'percent'`. `targetsDifferFromSuggestion` is false at Δ50 kcal / Δ5 g, true at Δ51 / Δ6, and true for null existing. Review Focus #3: `buildTargetUpsertPayload({...})` output has none of the keys `birth_date, sex, height_cm, weight_kg, notes, is_pregnant`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the helpers and hooks.
- [ ] **Step 4: Run** `npx vitest run src/utils/nutritionProfile.test.ts tests/nutrition-targets.test.ts` → PASS.
- [ ] **Step 5: Commit**: `feat(targets): save profile stats and apply suggestions`.

### Task 4: Profile & Targets page

**Files:**
- Create: `src/components/targets/ProfileForm.tsx`, `src/components/targets/SuggestedTargetsCard.tsx`, `src/utils/units.ts`
- Modify: `src/pages/MemberTargetsPage.tsx`, `src/components/targets/NutritionTargetsForm.tsx`
- Test: `tests/ProfileForm.test.tsx`, `src/utils/units.test.ts`

**Interfaces:**
- Consumes: Task 2 and Task 3 exports; `useNutritionTarget`; `useMemberProfiles` (for `is_child`, `birth_year`).
- Produces:
  - `units.ts`: `kgToLb(kg): number` (1 decimal), `lbToKg(lb): number`, `cmToFtIn(cm): { ft: number; in: number }` (whole inches), `ftInToCm(ft, inches): number`.
  - `<ProfileForm householdId memberId memberType isChild canEdit birthYearFallback?: number | null />`
  - `<SuggestedTargetsCard householdId memberId memberType isChild target: NutritionTarget | null canEdit />`
  - `NutritionTargetsForm` gains prop `hasProfile: boolean`; when true, the preset selector is hidden.

Behaviour:
- ProfileForm fields: birth date (date input; prefill `${birthYearFallback}-07-01` when there's no `birth_date`), sex (Female/Male, label "Sex (used for calorie formulas)"), height, weight, activity level (Sedentary / Lightly active / Moderately active / Active / Very active), notes (textarea, `maxLength={500}`, helper "Visible to your household."). Adult-only (`!isChild`): target weight; Pregnant toggle → due date (required) + pre-pregnancy weight; target weight is hidden while pregnant. Units toggle Metric / Imperial, stored in localStorage key `np-units` (try/catch), default `'imperial'`. Save calls `useSaveMemberStats`. Read-only when `!canEdit`.
- SuggestedTargetsCard: when `ok:false` with `missing`, show "Add {fields} to get a suggestion". When `reason:'under_one'`, show "Under 1 year: talk to your pediatrician." Otherwise show calories/macros/micros, explanation lines, the disclaimer by `kind`, and an **Apply to targets** button (disabled when `!targetsDifferFromSuggestion`, labelled "Targets match suggestion"). When existing targets differ, show "Your targets differ from the suggestion".
- MemberTargetsPage: header "Profile & Targets"; order ProfileForm → SuggestedTargetsCard → NutritionTargetsForm(`hasProfile = !!target?.sex`). Get `isChild` from the matching `member_profiles` row (`false` for auth users).
- Add `{ key: 'folate_mcg', label: 'Folate (mcg)' }` to `DEFAULT_MICROS`.

- [ ] **Step 1: Failing tests**:
  - units: Review Focus #5: `cmToFtIn(ftInToCm(5,4))` → `{ft:5,in:4}`, and `kgToLb(lbToKg(150))` → `150`.
  - ProfileForm: child hides target weight and the pregnant toggle; adult shows them; toggling Pregnant reveals due date + pre-pregnancy weight and hides target weight; Save calls the mutation with metric values when entered in imperial. Mock hooks as in `tests/settings.test.tsx`.
  - SuggestedTargetsCard: missing-fields message; Apply calls `useApplySuggestedTargets` with the suggestion; button disabled when targets match.
- [ ] **Step 2: Run** `npx vitest run tests/ProfileForm.test.tsx src/utils/units.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Match existing form styling in `NutritionTargetsForm.tsx` (`rounded-btn border border-accent/40 bg-surface ...`, card `rounded-card border border-accent/30 bg-surface p-5`).
- [ ] **Step 4: Run** → PASS; full `npx vitest run` green.
- [ ] **Step 5: Commit**: `feat(targets): Profile & Targets page with suggestions`.

### Task 5: Settings "Profiles" section

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/components/settings/ProfilesSection.tsx`
- Test: `tests/settings.test.tsx`

**Interfaces:**
- Consumes: `useNutritionTargets(householdId)`, `useHouseholdMembers`, `useMemberProfiles`, `suggestTargets`, `ageInYears`, `pregnancyStatus`.
- Produces: `<ProfilesSection householdId currentUserId isAdmin />`.

Behaviour: rename `SectionHead no="01" label="Profile"` → `label="Account"`. Insert `<SectionHead no="02" label="Profiles" />` + `ProfilesSection` immediately after section 01, and renumber the following SectionHeads +1. Rows: you first, then other auth members, then member profiles. Summary: `Name · {age} · {Pregnant, T{n} ·} {calories} kcal`, where calories come from saved targets, or from the suggestion in muted text with "(suggested)". With no profile (`sex == null`), show "No profile yet". The link text is "Edit profile" when `isAdmin || id === currentUserId`, otherwise "View", and it goes to `/members/{id}/targets`.

- [ ] **Step 1: Failing tests**: section "Account" exists; "Profiles" lists the three mock members in order; a member with no stats shows "No profile yet" (Review Focus #2); a non-admin sees "View" for others and "Edit profile" for self. Update any existing section-label/number assertions deliberately.
- [ ] **Step 2: Run** `npx vitest run tests/settings.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `npx vitest run tests/AppShell.test.tsx` still green (no nav change).
- [ ] **Step 5: Commit**: `feat(settings): Profiles section`.

### Task 6: Pregnancy safety in generate-plan

**Files:**
- Create: `supabase/functions/_shared/pregnancySafety.ts` (pure TS, no Deno imports)
- Modify: `supabase/functions/generate-plan/index.ts`
- Test: `tests/pregnancySafety.test.ts`

**Interfaces:**
- Produces:
  - `PREGNANCY_AVOID_RULE: string`: the prompt text listing the spec's categories, including conditional cases (deli/cold cured meat unless heated until steaming; raw/undercooked meat, eggs, fish, shellfish, sushi; high-mercury fish shark, swordfish, king mackerel, tilefish, bigeye tuna, marlin; unpasteurized dairy and soft mould-ripened/blue cheeses unless pasteurized; raw sprouts; liver/pâté; alcohol).
  - `PREGNANCY_BANNED_TERMS: string[]` = `['wine','beer','liqueur','rum','vodka','whisky','bourbon','brandy','sake','liver','pâté','pate','shark','swordfish','king mackerel','tilefish','bigeye tuna','marlin','sushi','sashimi','tartare','ceviche']`
  - `isPregnancyUnsafe(recipeName: string, ingredientNames: string[]): boolean`: case-insensitive **whole-word** match (so "rum" doesn't hit "drumstick" and "pate" doesn't hit "pates…"; use a word-boundary regex per term).
  - `isCurrentlyPregnant(row: { is_pregnant: boolean; due_date: string | null }, today: Date): boolean` (due date between today and today+300 days).

Edge function changes:
1. Add the new columns to the `nutrition_targets` select and `NutritionTargetRow`. Compute `pregnancyActive = nutritionTargets.some(r => isCurrentlyPregnant(r, new Date()))`.
2. When active: add `pregnancySafety: PREGNANCY_AVOID_RULE` to `constraints` in the pass 1, 2 and 3–5 prompts, and append to each system prompt: "If constraints.pregnancySafety is present it is a HARD rule like allergens."
3. Pass notes: add `notes` (via `sanitizeString`, sliced to 500) to each `nutritionTargets` entry sent to the model.
4. Code filter, after the slot guardrail loop: for each `bestResult.slots` entry whose recipe `isPregnancyUnsafe(name, ingredient_names)`, replace it from `poolForSlot(slot)` filtered by `!isPregnancyUnsafe`, else set `recipe_id = ""`. Count the replacements in `constraintSnapshotSummary.pregnancyFilterRepairs`. Also exclude unsafe recipes from the candidate list sent to pass 1.
5. Forced verify: when `pregnancyActive`, the time check in pass 2 uses `PREGNANT_ASSIGN_DEADLINE_MS = 100000` instead of the 90 s budget for entering pass 3, and pass 3 runs even when `violations` is empty (instruction: "Re-check every slot against constraints.pregnancySafety; fix any violation."). Set `pregnancySafetyChecked = true` once pass 3 returns. Write `constraint_snapshot.pregnancySafety = { active: true, checked: pregnancySafetyChecked }`. If active and not checked, `finalStatus = 'partial'`.

- [ ] **Step 1: Failing tests** in `tests/pregnancySafety.test.ts`: `isPregnancyUnsafe('Salmon Sashimi', [])` true; `('Chicken Drumsticks', ['chicken drumstick'])` false; `('Beef Stew', ['red wine'])` true; `('Pasta', ['pates'])` false; `isCurrentlyPregnant` true for due +100 days, false for past and +301. Plus a source-text test (pattern of `tests/cookMode.test.tsx`) asserting `generate-plan/index.ts` imports `../_shared/pregnancySafety.ts` and contains `pregnancySafety`.
- [ ] **Step 2: Run** `npx vitest run tests/pregnancySafety.test.ts` → FAIL.
- [ ] **Step 3: Implement** the module and the edge changes.
- [ ] **Step 4: Run** → PASS; full suite green.
- [ ] **Step 5: Commit**: `feat(planner): pregnancy safety rules, filter and forced verify`.

### Task 7: Unchecked-plan banner

**Files:**
- Modify: `src/components/plan/PlanGrid.tsx` (near the existing `constraint_snapshot` read ~line 358)
- Test: `tests/PlanGrid.schedule.test.tsx` or a new `tests/PlanGrid.pregnancy.test.tsx` reusing its mocks

Behaviour: when `latestGeneration.constraint_snapshot.pregnancySafety?.active && !checked`, render a `role="alert"` amber banner above the grid with the exact copy "Not pregnancy-safety checked. Regenerate or review." It is not dismissible and disappears after a checked generation.

- [ ] **Step 1: Failing test**: the snapshot `{pregnancySafety:{active:true,checked:false}}` shows the banner; `{active:true,checked:true}` and an absent key do not.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit**: `feat(plan): banner when pregnancy safety check didn't run`.

### Task 8: Timed progress bar

**Files:**
- Modify: `src/components/plan/GenerationProgressBar.tsx`, `src/hooks/usePlanGeneration.ts`, `src/components/plan/PlanGrid.tsx` (props at ~line 754), `src/lib/queryKeys.ts`
- Test: `tests/GenerationProgressBar.test.tsx`

**Interfaces:**
- Produces:
  - `useTypicalGenerationSeconds(): number`: query `plan_generations` for the household, `status in ('done','partial')`, `completed_at not null`, newest 5. Returns the median of `(completed_at − created_at)` seconds, rounded, or `45` when there are none. Key `queryKeys.planGeneration.typical(householdId)` = `['plan-generation', householdId, 'typical']`.
  - `estimateFill(passCount: number, elapsedS: number, typicalS: number): number` (exported from the component file): `max(PASS_FILL[pass] ?? 90, min(95, round(elapsedS / typicalS * 95)))`.
  - `GenerationProgressBar` new props: `startedAt?: string`, `typicalSeconds?: number`, `pregnancyCheck?: boolean`.

Behaviour: tick every 1 s from `startedAt` with `setInterval`, cleaned up on unmount. Show `m:ss` elapsed and "Usually about {typical} s". Once elapsed > typical, the subtitle becomes "Taking longer than usual, still working…". With `pregnancyCheck && passCount >= 3`, the stage label is "Extra safety check for pregnancy". PlanGrid passes `liveJob?.created_at`, the typical seconds, and `pregnancyCheck` from whether any `nutritionTargets` row is currently pregnant (`isCurrentlyPregnant` from `supabase/functions/_shared/pregnancySafety.ts`, importable as plain TS).

- [ ] **Step 1: Failing tests** (vi.useFakeTimers): elapsed shows "0:00" → "0:05" after 5 s; "Usually about 40 s"; after 41 s, shows "Taking longer than usual, still working…"; `estimateFill(1, 20, 40)` = 48, `estimateFill(5, 0, 40)` = 90, `estimateFill(1, 200, 40)` = 95; pregnancy label at pass 3.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; full suite green.
- [ ] **Step 5: Commit**: `feat(plan): elapsed timer and ETA on generation progress`.

### Task 9: Ship

- [ ] **Step 1:** `npx vitest run`, `npx tsc -b`, `npx vite build`: all green.
- [ ] **Step 2: Migration:** `eval "$(tr -d '\r' < .env.local | grep -E '^SUPABASE_ACCESS_TOKEN=')"; export SUPABASE_ACCESS_TOKEN; npx supabase db push --yes` (L-017, L-056). Expected: 041 applied.
- [ ] **Step 3: Function:** `npx supabase functions deploy generate-plan --project-ref qyablbzodmftobjslgri --no-verify-jwt --yes`.
- [ ] **Step 4: App:** `npx vercel --prod --yes`, then confirm the live bundle contains "Profile & Targets".
- [ ] **Step 5: Smoke:** log in with the test account (memory `reference_test_account.md`) via Playwright. Fill a profile, Apply, and confirm targets update. Generate a plan and see the timer.
- [ ] **Step 6:** Append any lessons to `lessons.md`; update `.planning/SESSION-HANDOFF.md`.
