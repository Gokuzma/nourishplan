# Phase 8: v1.1 UI Polish and Usability Improvements - Research

**Researched:** 2026-03-15
**Domain:** React/Tailwind CSS 4 UI polish, Supabase Storage, dark mode theming, nutrition ring visualisation, measurement units, mobile navigation patterns
**Confidence:** HIGH (all findings verified against existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dark mode & ring colors**
- ProgressRing currently uses hardcoded #A8C5A0 (sage) and #E8B4A2 (peach) — replace with theme-aware lighter/brighter variants that pop on dark backgrounds, same hue family with adjusted lightness
- Full dark mode audit across all components (cards, modals, inputs, nav, borders, text contrast) — fix anything that doesn't look right in dark theme
- Add nutrition rings to meal plan grid: day-total ring at top of each DayCard + tiny per-slot mini rings on individual meal slots
- Day-total rings show 4 rings: calories + protein + carbs + fat
- Per-slot mini rings show how much of daily target that meal covers

**Measurement units & portions**
- Show common household measurement units (cups, tbsp, pieces, slices) everywhere: logging, recipe builder, meal plan display, nutrition summary
- Only show units the data source actually provides — no guessing or suggesting units without backing data
- USDA/CNF portion descriptions (e.g., "1 medium banana", "1 cup chopped") used when available
- Custom foods: user defines available units with gram equivalents when creating the food
- Default to the USDA/CNF "household serving" unit in the portion stepper. Fall back to grams when no household serving data exists
- Nutrition calculations still use per-100g internally — units are a display/input layer

**Mobile settings & navigation**
- Add a "More" / hamburger icon as the last item in the mobile TabBar (replacing one of the current 5 tabs or adding a 6th)
- Tapping opens a slide-out drawer with all nav items: Settings, Household, and Log Out (plus any items not in TabBar)
- Settings page expanded with inline editing sections: display name, avatar upload, email (read-only or with re-verification), household name, theme toggle, log out
- Display name field added to user profiles — shown in household member list and member selector
- Avatar upload: profile photo stored in Supabase Storage, displayed in Settings and anywhere member identity appears

**Macro % scaling**
- Toggle on nutrition targets form to switch between entering absolute grams or percentage of calories for protein, carbs, fat
- Changing calorie target when macros are set as % triggers a confirmation prompt: "Update macro grams to match new calorie target?"
- Enforce that P% + C% + F% = 100% — show error if they don't sum correctly
- Same toggle available for all member types including managed child profiles
- Editing either grams or % recalculates the other in real time while in that mode

### Claude's Discretion
- Exact dark mode color values for ring variants and component fixes
- Which TabBar tab to replace with "More" (or whether to add a 6th slot)
- Drawer animation and styling
- Avatar size limits, accepted formats, and Supabase Storage bucket config
- How to surface unit options in the portion stepper UI
- DB schema changes needed for display_name, avatar_url, and custom food units
- Migration strategy for adding measurement unit data to existing foods/recipes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 8 is a polish pass touching five distinct domains: (1) dark mode completeness for all SVG ring colors and component backgrounds, (2) meal plan nutrition ring enrichment (day-total + per-slot mini rings), (3) realistic measurement unit support surfacing USDA/CNF portion data through the portion stepper, (4) mobile navigation drawer replacing the overflow TabBar items, and (5) expanded Settings with inline profile/household editing and Supabase Storage avatar upload, plus (6) macro percentage scaling on the NutritionTargetsForm.

The codebase is well-structured. `profiles` already has `display_name` and `avatar_url` columns (migration 001). `NormalizedFoodResult` already has an optional `portions` field populated by the USDA edge function. The CNF edge function does NOT yet return portions. `ProgressRing` accepts a `color` prop but hardcodes the background ring stroke as `#E8B4A2`. Dark mode only overrides `text`, `background`, and `surface` tokens — `primary`, `secondary`, and `accent` have no dark-mode variants, so ring colors and component borders that rely on them are invisible or wrong in dark mode.

**Primary recommendation:** Work plan-by-plan in dependency order: DB migrations first (custom food units column, macro_mode column), then theme/ring infrastructure, then each UI feature independently.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Role in Phase 8 |
|---------|---------|---------|-----------------|
| React | 19.2.4 | UI framework | All component work |
| Tailwind CSS 4 | 4.2.1 | Styling | Dark mode tokens, drawer animation |
| @supabase/supabase-js | 2.99.1 | DB + Storage client | Avatar upload, profile/household mutations |
| @tanstack/react-query | 5.90.21 | Server state | New mutation hooks for profile, household |
| react-router-dom | 7.13.1 | Routing | Drawer nav links |
| vitest | 4.1.0 | Test runner | Phase tests |

### No new dependencies required
All Phase 8 features can be implemented with the existing stack. Supabase Storage is included in `@supabase/supabase-js`. CSS transitions handle drawer animation. No animation library needed.

---

## Architecture Patterns

### Recommended Task Structure
```
Phase 8 plans (suggested grouping):
├── P01: DB migrations + type updates
│   ├── custom_foods: add portions jsonb column
│   ├── nutrition_targets: add macro_mode column
│   └── types/database.ts: add new fields
├── P02: Dark mode audit + ring theme tokens
│   ├── global.css: add dark mode primary/accent/secondary tokens
│   └── ProgressRing.tsx: accept bgColor prop, use CSS var
├── P03: Meal plan nutrition rings
│   ├── DayCard.tsx: day-total rings already exist (extend)
│   └── SlotCard.tsx: add mini per-slot rings
├── P04: Measurement units in portion stepper
│   ├── search-cnf edge function: add portions to response
│   ├── PortionStepper.tsx: add unit selector
│   └── FreeformLogModal / LogMealModal: wire unit selection
├── P05: Mobile "More" drawer + Settings expansion
│   ├── TabBar.tsx: add "More" item
│   ├── MobileDrawer.tsx: new slide-out nav component
│   ├── SettingsPage.tsx: expand with profile/household sections
│   └── useProfile hook: fetch/upsert profiles table
└── P06: Macro % scaling on NutritionTargetsForm
    ├── NutritionTargetsForm.tsx: add mode toggle + validation
    └── useNutritionTargets.ts: pass macro_mode in upsert
```

### Pattern 1: Dark Mode CSS Custom Properties in Tailwind 4
**What:** Tailwind 4 uses `@theme` for token definitions. Dark mode tokens are applied via `@layer base` with the `.dark` selector. Currently only `text`, `background`, `surface` have dark variants — `primary`, `secondary`, `accent` do not.

**When to use:** Add dark variants for any token that appears wrong in dark mode.

**Example (src/styles/global.css):**
```css
/* existing */
@theme {
  --color-primary: #A8C5A0;    /* sage green */
  --color-secondary: #F5EDE3;   /* warm cream */
  --color-accent: #E8B4A2;      /* peach */
}

@layer base {
  .dark {
    --color-text: #E8E5E0;
    --color-background: #1A1D1A;
    --color-surface: #252825;
    /* ADD: dark variants for primary/secondary/accent */
    --color-primary: #B8D4B0;      /* lighter sage, pops on dark bg */
    --color-secondary: #2E3030;    /* dark neutral, replaces cream */
    --color-accent: #F0C4B2;       /* lighter peach */
  }
}
```

**Ring colors in dark mode:** The ProgressRing background stroke (`#E8B4A2` hardcoded) becomes invisible on dark backgrounds. Add a `bgColor` prop. DayCard already passes explicit hex colors for protein (#93C5FD), carbs (#FCD34D), fat (#F9A8D4) — these are readable in both modes. The background ring needs to become a muted dark surface color.

### Pattern 2: ProgressRing Theme Awareness
**Current state:** `ProgressRing` hardcodes `stroke="#E8B4A2"` for the background ring and accepts `color` for the progress arc.

**Fix:** Add `bgColor` prop with default that references a CSS variable or uses `currentColor` at low opacity.

```tsx
// ProgressRing.tsx
interface ProgressRingProps {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string      // NEW
  label?: string
  showValue?: boolean
}

export function ProgressRing({
  bgColor = 'currentColor',
  // ...
}) {
  // In the background circle:
  // stroke={bgColor} strokeOpacity={0.15}
  // This uses the theme text color at 15% opacity — works in light AND dark
}
```

**DayCard already has 4 rings** — the component is complete for day totals. The issue is purely dark-mode ring color visibility, not missing rings.

### Pattern 3: Per-slot Mini Rings in SlotCard
**What:** SlotCard currently shows only `{meal.name}` + `{calories} kcal`. Mini rings need slot nutrition as a fraction of daily target.

**Data flow:**
- `slotNutrition()` already exists in DayCard — move to a shared util or duplicate in SlotCard
- SlotCard needs `memberTarget: NutritionTarget | null` passed as a prop (not currently passed)
- Mini rings: size=20, strokeWidth=2, no showValue, 4 rings (cal/P/C/F)
- DayCard passes `memberTarget` through already — need to thread it to SlotCard

### Pattern 4: Measurement Units — Data Flow
**What the USDA edge function returns today:**
```ts
portions: Array<{ description: string; grams: number }>
// e.g. [{ description: "1 cup", grams: 240 }, { description: "1 medium", grams: 118 }]
```
This is already in `NormalizedFoodResult.portions?: { description: string; grams: number }[]`.

**What the CNF edge function returns today:** No portions — only nutrients. The CNF API has a serving size endpoint at:
```
https://food-nutrition.canada.ca/api/canadian-nutrient-file/servingsize/?id={food_code}&lang=en&type=json
```
This needs to be added to the CNF edge function.

**PortionStepper enhancement:** Currently steps by `servings` (abstract). With units, the stepper shows a unit dropdown (e.g., "1 cup", "1 tbsp", "100g") and the quantity input changes meaning. The gram equivalent is used for nutrition math, the label is shown in the UI.

**Custom foods:** `CustomFood.serving_description` and `serving_grams` already exist — this is one portion definition. The new `portions` column adds additional named units. Store as `jsonb`:
```sql
-- In custom_foods migration
ALTER TABLE public.custom_foods
ADD COLUMN IF NOT EXISTS portions jsonb NOT NULL DEFAULT '[]'::jsonb;
-- [{description: "1 cup", grams: 240}, ...]
```

### Pattern 5: Mobile Slide-Out Drawer
**Approach:** Controlled by boolean state in AppShell (or lifted to TabBar). The drawer slides in from the right (or left) on mobile, covering content, with a backdrop overlay. Use CSS `transform: translateX` transition — no library needed.

**Tab decision:** Replace "Meals" or add a 6th tab slot. The Sidebar (desktop) has 7 items including Household and Settings. Mobile TabBar has 5: Home, Foods, Recipes, Meals, Plan. Meals and Plan are both needed. Recommend replacing Meals with "More" since Meal building is usually done via Plan → slot → assign:

```
TabBar: Home | Foods | Recipes | Plan | More(drawer)
Drawer: Meals, Household, Settings, Log Out
```

**Drawer implementation:**
```tsx
// src/components/layout/MobileDrawer.tsx
interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}
// - fixed inset-0 backdrop (bg-black/40) when open
// - right-0 top-0 bottom-0 w-64 bg-surface translate transform
// - transition-transform duration-300
// - NavLink items mirroring Sidebar
```

### Pattern 6: Settings Page Expansion — Profile & Household
**Profile data location:** `profiles` table — `display_name` and `avatar_url` columns exist from migration 001. No dedicated `useProfile` hook exists yet — need to add one.

**Household name editing:** `households` table only allows members to read (not update) their household — existing RLS policy is read-only for members. Need to add an update policy limited to admins.

**Avatar upload to Supabase Storage:**
```ts
// Pattern from supabase-js docs
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true,
  })
// Then get public URL:
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)
// Store publicUrl in profiles.avatar_url
```

Storage bucket `avatars` must be created and configured as public. This requires a Supabase dashboard step or Management API call.

**RLS for household update (admins only):**
```sql
-- Migration: add household update policy
CREATE POLICY "admins update household"
  ON public.households FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = households.id
        AND user_id = (SELECT auth.uid())
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = households.id
        AND user_id = (SELECT auth.uid())
        AND role = 'admin'
    )
  );
```

### Pattern 7: Macro % Scaling
**New DB column:**
```sql
ALTER TABLE public.nutrition_targets
ADD COLUMN IF NOT EXISTS macro_mode text NOT NULL DEFAULT 'grams'
  CHECK (macro_mode IN ('grams', 'percent'));
```

**Form logic:**
- `macroMode: 'grams' | 'percent'` state in `NutritionTargetsForm`
- In percent mode: protein_g/carbs_g/fat_g inputs show as percentages
- Conversion: `grams = (percent / 100) * calories / calorie_per_gram`
  - protein: 4 kcal/g, carbs: 4 kcal/g, fat: 9 kcal/g
- Validation: P% + C% + F% must equal 100 exactly — show inline error
- Calorie change confirmation: only trigger when macro_mode = 'percent' and calories change
- Save always stores absolute grams in DB (macro_mode column tracks display preference)

### Anti-Patterns to Avoid
- **Storing macros as percentages in DB**: Always store grams — percentage is a display preference. The `macro_mode` column tracks which input mode the user last used, not the stored format.
- **Hardcoding dark ring colors**: Pass theme-aware values or use CSS variables so future theme changes propagate automatically.
- **Unit guessing**: Never compute gram equivalents for units not in the source data. If CNF has no serving sizes for a food, show grams only.
- **Separate drawer state management**: Keep drawer open/close state as close to TabBar as possible — lifting to AppShell is fine, but don't put it in global context.
- **Avatar upload without upsert:true**: Without `upsert: true`, a second upload to the same path will fail with a conflict error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drawer animation | Custom animation library | CSS `transition-transform` | Already works, zero deps |
| File upload preview | Third-party cropper | `URL.createObjectURL(file)` | Sufficient for avatar preview before upload |
| Percentage validation | Custom math | Simple sum check `Math.abs(total - 100) > 0.5` | No library needed |
| Dark mode toggle | Custom theme engine | Existing `toggleTheme()` utility | Already implemented |
| Public URL for avatar | Custom URL builder | `supabase.storage.from().getPublicUrl()` | Built into supabase-js |

---

## Common Pitfalls

### Pitfall 1: ProgressRing background ring invisible in dark mode
**What goes wrong:** Hardcoded `stroke="#E8B4A2"` (light peach) is near-invisible against `#252825` (dark surface).
**Why it happens:** SVG strokes ignore CSS variables unless written as `stroke="var(--color-accent)"` or passed as a prop.
**How to avoid:** Add `bgColor` prop to ProgressRing. DayCard passes `bgColor="currentColor"` with `strokeOpacity={0.15}` — renders as muted ring in both modes.
**Warning signs:** Rings look solid/filled in dark mode with no visible background track.

### Pitfall 2: CNF portions not available
**What goes wrong:** CNF API has a separate endpoint for serving sizes — not fetched in current `search-cnf` edge function. If the planner assumes CNF has portion data, it won't be there.
**Why it happens:** USDA includes `foodMeasures` in the search response. CNF requires a second API call per food: `GET /api/canadian-nutrient-file/servingsize/?id={food_code}&lang=en&type=json`.
**How to avoid:** Add serving size fetch to `search-cnf` (parallel with nutrient fetch). If the serving size endpoint returns empty or errors, gracefully return no portions for that food.
**Warning signs:** Portion dropdown is always empty for CNF foods.

### Pitfall 3: Household RLS blocks admin update
**What goes wrong:** `households` table has no UPDATE policy — only SELECT and INSERT. Saving household name from Settings will silently fail (RLS returns 0 rows, no error).
**Why it happens:** Migration 001 only added read policy for members. Update was not needed until now.
**How to avoid:** Add admin-only UPDATE policy in migration before implementing household name editing. Test with a non-admin user to verify they cannot update.

### Pitfall 4: Supabase Storage bucket not created
**What goes wrong:** Avatar upload fails with "Bucket not found" if the `avatars` bucket doesn't exist.
**Why it happens:** Storage buckets must be created via Supabase dashboard or Management API before client code can use them.
**How to avoid:** Include bucket creation as a Wave 0 prerequisite or document as a manual deployment step. Use `supabase.storage.createBucket('avatars', { public: true })` in a migration or setup script.

### Pitfall 5: Macro % validation floating point
**What goes wrong:** User enters 33/33/34 = 100 but `33 + 33 + 34 = 100.00000001` due to float arithmetic.
**How to avoid:** Use `Math.round((p + c + f) * 10) / 10` or check `Math.abs(total - 100) < 0.5` instead of exact equality.

### Pitfall 6: `profiles` RLS only allows users to see their own row
**What goes wrong:** The profiles SELECT policy `using ( (select auth.uid()) = id )` means household members cannot see each other's display_name or avatar. The `useHouseholdMembers` hook joins profiles — this works because the join runs as the authenticated user seeing their own profile only.
**Reality check:** The join `profiles(id, display_name, avatar_url, created_at)` in useHouseholdMembers already returns data — Supabase joins evaluate RLS on the joined table for each row. This means household member A sees member B's profile only if B's profile policy allows it. With the current policy, A only sees their own profile row returned — other members' profiles come back as null.
**How to avoid:** Add a read policy to `profiles` that allows household members to see profiles of others in the same household. Pattern: `exists (select 1 from household_members hm1 join household_members hm2 on hm1.household_id = hm2.household_id where hm1.user_id = auth.uid() and hm2.user_id = profiles.id)`.

### Pitfall 7: TabBar tab count on small screens
**What goes wrong:** 6 tabs on a 320px iPhone SE forces each tab below readable size.
**How to avoid:** Replace one tab (Meals recommended) rather than adding a 6th. Meals is accessible from the Plan page via slot assignment, so the direct Meals tab is lower priority than Plan.

---

## Code Examples

### Theme-aware ProgressRing (SVG stroke with opacity)
```tsx
// src/components/plan/ProgressRing.tsx
// bgColor defaults to CSS currentColor at low opacity — works in light and dark
<circle
  cx={size / 2}
  cy={size / 2}
  r={radius}
  fill="none"
  stroke={bgColor ?? 'currentColor'}
  strokeOpacity={bgColor ? 1 : 0.12}
  strokeWidth={strokeWidth}
/>
```

### CSS token addition for dark primary/accent
```css
/* src/styles/global.css */
@layer base {
  .dark {
    --color-text: #E8E5E0;
    --color-background: #1A1D1A;
    --color-surface: #252825;
    /* Phase 8 additions */
    --color-primary: #B8D4B0;   /* sage +15% lightness */
    --color-secondary: #2A2E2A; /* dark neutral surface */
    --color-accent: #F0C4B2;    /* peach +10% lightness */
  }
}
```

### CNF serving size fetch addition
```ts
// supabase/functions/search-cnf/index.ts
// Parallel fetch serving sizes alongside nutrient amounts
const [nutrientAmounts, servingSizes] = await Promise.all([
  fetch(`https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientamount/?id=${food.food_code}&lang=en&type=json`)
    .then(r => r.ok ? r.json() : []),
  fetch(`https://food-nutrition.canada.ca/api/canadian-nutrient-file/servingsize/?id=${food.food_code}&lang=en&type=json`)
    .then(r => r.ok ? r.json() : []),
])
// servingSizes: Array<{ serving_description: string, conversion_factor_value: number }>
// grams = conversion_factor_value * (nutrientAmount.nutrient_value / 100) ... check CNF API spec
```

### Supabase Storage avatar upload pattern
```ts
// src/hooks/useProfile.ts
async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  return publicUrl
}
```

### Macro % conversion math
```ts
// grams from percent
function pctToGrams(pct: number, calories: number, kcalPerGram: number): number {
  return Math.round((pct / 100) * calories / kcalPerGram)
}
// grams to percent
function gramsToPercent(grams: number, calories: number, kcalPerGram: number): number {
  if (!calories) return 0
  return Math.round((grams * kcalPerGram / calories) * 100)
}
// Constants
const PROTEIN_KCAL_PER_G = 4
const CARBS_KCAL_PER_G = 4
const FAT_KCAL_PER_G = 9
```

### Portion stepper unit selector
```tsx
// PortionStepper with unit support
interface PortionUnit {
  description: string  // "1 cup", "100g"
  grams: number        // 240, 100
}
interface PortionStepperProps {
  value: number           // quantity in selected unit
  onChange: (v: number) => void
  units?: PortionUnit[]   // if empty, show grams-only mode
  selectedUnit?: PortionUnit
  onUnitChange?: (unit: PortionUnit) => void
  // existing props...
}
// The parent computes: totalGrams = value * selectedUnit.grams
// Nutrition = (totalGrams / 100) * per100g macros
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind config file | CSS-first @theme tokens | Tailwind v4 | dark mode via `.dark` class, no JS config |
| `@media prefers-color-scheme` | `.dark` class toggle | Phase 1 | manual theme preference stored in localStorage |
| Hardcoded SVG stroke colors | Should be theme-aware | Phase 8 target | rings invisible in dark mode without fix |

---

## Open Questions

1. **CNF Serving Size API response shape**
   - What we know: endpoint exists at `/api/canadian-nutrient-file/servingsize/?id={food_code}`
   - What's unclear: exact field names (`serving_description`? `conversion_factor_value`?), whether values are in grams directly or as a multiplier
   - Recommendation: During Wave 0 of the relevant plan, make a test call to the CNF serving size API for a known food code (e.g., rice) and inspect the response shape before writing the edge function code

2. **Supabase Storage bucket creation method**
   - What we know: bucket must exist before uploads work; `supabase.storage.createBucket()` exists in the client SDK
   - What's unclear: whether to create via migration script, Management API, or dashboard — deployment process isn't codified
   - Recommendation: Create bucket via dashboard manually (matches existing deploy pattern from Phase 6) and document in plan

3. **Profiles RLS — household member visibility**
   - What we know: current policy blocks member-to-member profile reads
   - What's unclear: whether the join in `useHouseholdMembers` is already silently returning null for other members' profiles
   - Recommendation: Verify with a two-user household in dev before writing the policy — may already be broken; fix is a new SELECT policy

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest config embedded in vite.config.ts (standard discovery) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Area | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| Dark mode tokens | CSS vars render correct values in .dark | unit | `npm test -- tests/theme.test.ts` | ✅ (extend) |
| ProgressRing bgColor | background ring uses bgColor prop | unit | `npm test -- tests/nutrition.test.ts` | ✅ (extend) |
| Macro % conversion | pctToGrams / gramsToPercent math | unit | `npm test -- tests/nutrition-targets.test.ts` | ✅ (extend) |
| Macro % validation | P+C+F must sum to 100 | unit | `npm test -- tests/nutrition-targets.test.ts` | ✅ (extend) |
| Unit conversion | totalGrams = value * unit.grams | unit | new test in nutrition.test.ts | ❌ Wave 0 |
| Avatar upload hook | useProfile upsert + storage upload | unit (mock) | new tests/useProfile.test.ts | ❌ Wave 0 |
| Household update | admin can update name, non-admin cannot | integration | manual (RLS) | manual-only |
| Drawer open/close | TabBar "More" toggles drawer state | component | new tests/TabBar.test.tsx | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/nutrition-targets.test.ts tests/nutrition.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/useProfile.test.ts` — avatar upload hook, display_name upsert (mock supabase.storage)
- [ ] `tests/TabBar.test.tsx` — "More" item renders, click opens drawer
- [ ] Unit conversion test block in `tests/nutrition.test.ts` — `totalGrams = qty * unit.grams`

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `src/styles/global.css`, `src/components/plan/ProgressRing.tsx`, `src/components/plan/DayCard.tsx`, `src/components/plan/SlotCard.tsx`, `src/components/layout/TabBar.tsx`, `src/components/layout/Sidebar.tsx`, `src/pages/SettingsPage.tsx`, `src/hooks/useHousehold.ts`, `src/hooks/useNutritionTargets.ts`, `src/hooks/useFoodSearch.ts`, `src/types/database.ts`, `supabase/migrations/001_foundation.sql`, `supabase/functions/search-usda/index.ts`, `supabase/functions/search-cnf/index.ts`, `package.json`
- `src/components/targets/NutritionTargetsForm.tsx` — macro form current state
- `src/components/log/PortionStepper.tsx` — portion input current state

### Secondary (MEDIUM confidence)
- Supabase Storage upload pattern — standard `supabase-js` client API, consistent across docs versions
- CNF API serving size endpoint — known from Canadian Nutrient File public API; exact response shape unverified (see Open Questions)
- Tailwind CSS 4 `@layer base` dark mode override — verified against existing working implementation in `global.css`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries at known versions in package.json
- Architecture: HIGH — all patterns derived from existing working code
- Dark mode fix: HIGH — root cause identified (hardcoded SVG hex, missing dark tokens)
- CNF portions: MEDIUM — endpoint known, response shape needs verification
- Supabase Storage: MEDIUM — standard API, bucket creation step is manual
- Pitfalls: HIGH — most derived from direct code inspection

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack; CNF API shape may need re-verification if API changes)
