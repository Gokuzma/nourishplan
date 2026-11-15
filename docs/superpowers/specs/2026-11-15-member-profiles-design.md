# Member Profiles: personal stats drive calories & macros

**Date:** 2026-11-15
**Status:** Draft, awaiting approval

## Intent

Nutrition targets today are four generic presets (Adult maintenance, Weight loss, Child 5–12, Teen) plus hand-typed numbers. That only works if you already know what your macros should be. A 3-year-old gets the 5–12 preset (1400 kcal, far too high), and a pregnant adult gets the same numbers as anyone else.

Each household member should have a **Profile** that describes who they are: age, sex, height, weight, target weight, activity level, pregnancy and notes. Calories and macros are **derived from that profile**. The Profile is a key, prominent part of Settings, because it is the basis for the nutrition numbers.

Pregnancy is structured (option B): a toggle plus a due date. The trimester is computed and calories step up with it. Pregnancy-unsafe foods become a hard planner rule, the same way allergies work today.

## Goals

- A Profile per person (adult accounts and managed child profiles) with: birth date, sex, height, current weight, target weight, activity level, pregnant + due date, free-text notes.
- From the profile, the app computes **suggested** calories, protein, carbs, fat and key micronutrients, and shows how it got there ("BMR 1,420 × lightly active = 1,950 kcal, −500 to reach target weight").
- The user **applies** the suggestion to their targets in one tap, or edits the numbers by hand. Targets stay the stored source of truth that every existing screen and the planner read.
- Pregnancy: trimester-aware calorie and protein adjustment, pregnancy micronutrient targets (iron, folate, calcium), weight-loss goal disabled, and pregnancy-unsafe foods excluded from plans.
- Children: age-appropriate formulas (a toddler gets roughly 1,000 kcal). Target weight and weight-loss goals are hidden.
- Notes are passed to the meal planner as context for that person.

## Non-goals

- Postpartum or breastfeeding adjustments. After the due date the profile shows "Due date has passed: update pregnancy?" and stops applying the pregnancy adjustment. A breastfeeding mode is a likely follow-up, not in this change.
- Weight tracking over time (history charts, weigh-ins). Current weight is a single value the user updates.
- Medical-grade advice. The suggestion is a starting point with a visible "estimates, check with your doctor/midwife" line, especially for pregnancy and children.
- Per-person meal variants. Meals stay household meals; pregnancy safety applies to the whole plan (see Constraints).

## Anti-goals (would be a failure even if it works)

- Silently overwriting targets someone tuned by hand. A profile change produces a new *suggestion*; targets change only when the user taps Apply.
- Suggesting a calorie deficit to a pregnant person or a child.
- Making the profile mandatory. Members without a profile keep working exactly as today.

## Constraints (from the codebase)

- `nutrition_targets` already has one row per person (`user_id` XOR `member_profile_id`), with household-read and own-or-admin-write RLS (migration 008). The planner (`generate-plan`) and the targets UI already read it.
- `member_profiles` has `is_child` and `birth_year` (used by MemberList and MemberProfileForm).
- `profiles` (adult accounts) has only `display_name` and `avatar_url`.
- The planner builds **household** meals. Allergens and won't-eats are applied household-wide as hard constraints (prompt rules plus the verify/correct passes). Pregnancy-unsafe foods follow the same pattern, so they apply to all meals once anyone is pregnant.
- RLS lets every household member read targets. Profile stats (weight, notes, pregnancy) will therefore be visible to the household. This is acceptable for a family app; see Builder decisions.
- Migrations are irreversible in production. Additive nullable columns only.

## Approaches considered

1. **Add profile columns to `nutrition_targets`** (chosen). Reuses the existing per-person row, RLS, hook (`useNutritionTarget` / `useUpsertNutritionTargets`) and the planner's existing query. Trade-off: the row now mixes "who you are" with "what you aim for".
2. **Separate `member_body_profiles` table.** Cleaner separation, but it needs a new table, new RLS, a new hook and a second planner query for the same per-person keying. More plumbing for the same result.
3. **Targets computed live from the profile, with nothing stored.** Always in sync, but it removes manual override and requires rewiring every consumer of targets. Rejected.

The user picked **1**.

## Design

### Data (one additive migration, `041_member_profile_stats.sql`)

New nullable columns on `public.nutrition_targets`:

| column | type | notes |
|---|---|---|
| `birth_date` | date | |
| `sex` | text check in ('female','male') | labelled "Sex (used for calorie formulas)" |
| `height_cm` | numeric | |
| `weight_kg` | numeric | |
| `target_weight_kg` | numeric | adults only in UI |
| `activity_level` | text check in ('sedentary','light','moderate','active','very_active') | |
| `is_pregnant` | boolean not null default false | |
| `due_date` | date | required in UI when pregnant |
| `pre_pregnancy_weight_kg` | numeric | shown when pregnant; energy/protein use it (falls back to current weight) |
| `notes` | text | free text, length-capped (e.g. 500 chars) |

The values are stored in metric. The UI offers a **metric/imperial toggle** (kg/cm ↔ lb/ft-in), defaulting to imperial for body weight and height because the household is Canadian. The toggle is a per-device preference in localStorage. Update `src/types/database.ts` and `database.gen.ts`.

**Age for child profiles:** the Profile asks for birth date. If a child profile has no `birth_date` but has `member_profiles.birth_year`, prefill July 1 of that year. On save, also update `member_profiles.birth_year` to match. If that write is refused (RLS only lets the `managed_by` user write), skip it silently, because the targets row stays the source of age for calculations. *(Builder call.)*

**Who gets which form:** adult accounts and managed profiles with `is_child = false` get the adult form (target weight, pregnancy). `is_child = true` gets the child form. *(Builder call.)*

### Calculation (`src/utils/nutritionProfile.ts`, pure functions, unit-tested)

`suggestTargets(profile, today) → { calories, protein_g, carbs_g, fat_g, micronutrients, explanation[] } | null` (null when required fields are missing; the UI lists what's missing).

- **Adults (18+):** Mifflin–St Jeor BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9) = maintenance.
  - Target weight more than 1 kg below current: −500 kcal, floored at 1,500 (male) / 1,200 (female). More than 1 kg above: +300 kcal. Otherwise maintain.
  - Protein: 1.6 g/kg when losing weight, otherwise 1.2 g/kg (current weight). Fat: 30% of kcal. Carbs: the remainder.
- **Pregnancy (adult, `is_pregnant`, due date in future):** maintenance uses `pre_pregnancy_weight_kg` (falls back to current weight) to avoid double-counting pregnancy weight. trimester from due date (conception ≈ due − 280 days; T1 < week 14, T2 weeks 14–27, T3 ≥ 28).
  - Maintenance (never a deficit) + 0 / +340 / +452 kcal. Protein: max(1.1 g/kg, maintenance protein + 25 g) in T2–T3.
  - Micros: iron 27 mg, folate 600 mcg (new `folate_mcg` key), calcium 1,000 mg.
  - Target weight is hidden and ignored.
- **Children and teens (<18):** **2005 IOM** Estimated Energy Requirement, age band by **whole years**, sex-specific, with the activity level mapped to the IOM physical-activity coefficient (sedentary→1.0, light→low-active, moderate/active/very_active→active/very active).
  - Ages 1–2: `89 × kg − 100 + 20`. Ages 3–8 and 9–18: the sex-specific IOM EER equations (with the +20 / +25 growth allowance). Alex (3) uses the 3–8 equation, and tests assert that equation's output for a fixed height/weight (≈1,100–1,350 kcal depending on activity), not a hand-picked 1,000. *(Builder call.)*
  - Protein: the DRI RDA by age (1–3 y ≈ 1.05 g/kg, 4–13 y ≈ 0.95 g/kg, 14–18 y ≈ 0.85 g/kg). Fat: 35% (ages 1–3) or 30%. Carbs: the remainder.
  - No target weight and no deficit. Under 1 year: no suggestion ("talk to your pediatrician").
- **Micronutrients (everyone with a suggestion):** a small DRI table by age band and sex for fiber, calcium, iron and folate; pregnancy overrides iron/folate/calcium as above. Sodium and vitamin C are not suggested. Add `folate_mcg` to `DEFAULT_MICROS` in the targets form. *(Builder call.)*
- Every suggestion includes human-readable explanation lines, rendered under the numbers.

### Apply semantics *(builder call)*

**Apply to targets** writes calories, protein, carbs and fat (`macro_mode` stays as saved), and **merges** the suggested micronutrients into the existing `micronutrients` map, overwriting only the keys it suggests. `custom_goals` and other micros are untouched. Because `buildTargetUpsertPayload` nulls omitted fields, Apply (and profile save) must pass the full existing row through. "Targets differ from suggestion" means calories off by more than 50 kcal or any macro off by more than 5 g.

### UI

- **Settings:** the existing 01 "Profile" section (display name, avatar) is renamed **"Account"**. A new section **"Profiles"** goes directly after it, as section 02, and later sections renumber. The 04 "Nutrition" link and the 05 "Member Dietary Preferences" section stay as they are. Everyone sees every member's row; Edit appears only where RLS allows writing (yourself, or an admin), and other rows open read-only. *(Builder call.)* It lists you first, then other adults (editable by admins), then child profiles. Each row shows a one-line summary ("Stacy · 32 · Pregnant, T2 · 2,290 kcal") and an **Edit profile** link. The existing "Edit Nutrition Targets" links point to the same page.
- **Profile page:** the existing `/members/:id/targets` route becomes **"Profile & Targets"** (same route, so existing links work).
  1. **Profile card:** birth date, sex, height, weight, target weight (adults, not pregnant), activity level, Pregnant toggle + due date (adults only), notes. Unit toggle. Save.
  2. **Suggested targets card:** computed numbers + explanation + **Apply to targets** button. If saved targets differ from the suggestion, show "Your targets differ from the suggestion" with an Apply button, and never apply automatically.
  3. The existing **NutritionTargetsForm** below, unchanged except that the generic presets are removed when a profile exists (keep them for members without a profile).
- Child profiles hide target weight, pregnancy and the weight-goal wording.

### Planner (`supabase/functions/generate-plan/index.ts`)

- Select the new columns in the existing `nutrition_targets` query.
- If any member is pregnant with a future due date, add `constraints.pregnancySafety`: a fixed list of avoid-categories (deli/cold cured meats unless heated until steaming, raw or undercooked meat, eggs, fish or shellfish including sushi, high-mercury fish (shark, swordfish, king mackerel, tilefish, bigeye tuna, marlin), unpasteurized dairy and soft mould-ripened/blue cheeses unless pasteurized, raw sprouts, liver/pâté, alcohol). Add a HARD rule to the candidate, assignment and verify prompts, treated like allergens, so violations go through the existing verify/correct passes.
- **Enforcement level: option C (user's choice).** Three layers:
  1. HARD prompt rule as above (covers the conditional cases: eggs, cheese, heated deli meat).
  2. A code filter for the unambiguous categories, alongside the existing allergen substring guardrail (`bannedIngredient` / `isSafeRecipe`): alcohol/wine/beer/liqueur, liver/pâté, shark, swordfish, king mackerel, tilefish, bigeye tuna, marlin, sushi/sashimi/tartare/ceviche (matched on ingredient and recipe names).
  3. When anyone is pregnant, **at least one verify/correct pass always runs**, even past the normal 90 s solver budget. Reserve time for it: when pregnant, pass 2 must start its verify pass by ~100 s, leaving headroom under the 150 s platform limit for writes. If the verify pass still cannot complete, the plan is saved as `partial` with a visible banner: "Not pregnancy-safety checked. Regenerate or review." The banner never appears silently-dismissed.
- Pass each member's `notes` (sanitized, capped) as member context in `nutritionTargets`.

### Generation time feedback

Today `GenerationProgressBar` advances in steps by `pass_count` with stage labels, but gives no sense of time. Add:
- **Elapsed timer** ("0:23") next to the stage label, ticking each second from the job's `created_at`.
- **Estimate:** "Usually about 40 s" from the median `completed_at − created_at` of this household's last 5 `done`/`partial` generations (fallback 45 s when there's no history). Fetched with the existing generation query, no schema change.
- **Bar fill** blends the stage floor (existing `PASS_FILL`) with elapsed / estimate, so it keeps creeping within a stage instead of sitting still, capped at 95% until done.
- Past the estimate: "Taking longer than usual, still working…" instead of a wrong countdown. When pregnant: "Extra safety check for pregnancy" label during the forced verify pass.
- Deploy the function after merge.

## Builder decisions (settle without asking)

- Exact copy of explanation lines and the missing-fields message.
- Rounding: calories to the nearest 10, grams to whole numbers.
- Visibility: profile data is household-readable (existing RLS). Noted in the UI under Notes: "Visible to your household."
- Whether the Profiles summary row shows calories when no targets are saved (show the suggestion in muted text).

## Testing

- Unit tests for `suggestTargets`: adult lose/maintain/gain, floors, each trimester, due date passed, toddler (Alex, 3), child 8, teen 15, under 1, missing fields.
- Component tests: Profile form shows/hides fields by child/adult/pregnant; Apply writes targets; changing the profile does not change saved targets.
- Planner: pregnancySafety present only when someone is currently pregnant; code filter blocks the unambiguous categories; verify pass runs when pregnant; partial plan shows the banner.
- Progress bar: elapsed timer ticks, estimate from history median (and fallback), over-estimate message.
- Existing targets/AppShell tests stay green. The Settings section count changes, so update any assertion on it deliberately.
