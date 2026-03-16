# Phase 13: Recipe, Meal Plan & Account Management - Research

**Researched:** 2026-03-16
**Domain:** React/TypeScript UI, Supabase RLS/RPC, browser print CSS, inline confirmation patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deletion flows**
- All deletions (meals, recipes, foods) require inline confirmation — "Delete [name]? Yes / Cancel" appearing where the item is, no modal overlay
- Deleting a recipe used in meal plans: soft-remove from plans — mark recipe as deleted but keep it visible in meal plans as "(Deleted recipe)". Plans stay intact
- Permissions: only the item creator or household admin can delete. Others see no delete button
- Use existing `deleted_at` soft-delete column pattern from Phase 2

**Account deletion & admin transfer**
- "Danger Zone" section at the bottom of the existing Settings page
- Immediate deletion with final confirmation — user types "DELETE" to confirm, no grace period
- Admin transfer: show list of household members, admin picks who gets admin rights before confirming deletion
- Last member in household: delete the household entirely with clear warning — "This will delete the entire household and all its data"
- Non-admin members can delete their own account without transfer flow

**Meal plan print**
- Print content: meal grid (days × meals) + daily nutrition totals (calories, protein, carbs, fat per day)
- No shopping list, no expanded recipe details
- Use browser print dialog (window.print()) with print-optimized CSS — no PDF library needed
- Print button in overflow/⋮ menu on the plan page
- B&W with borders — clean black text on white, table borders for structure. No color accents

**Recipe metadata & notes**
- Notes field: auto-expanding textarea — starts as single line, grows as user types. Appears as subtitle directly under the recipe name in the builder
- Date created: relative + absolute format — "Created 3 days ago" with full date on hover/tap
- Date shown on recipe list cards (RecipesPage), alongside existing servings info
- Notes field is optional — empty by default, placeholder like "Add notes or variations..."

**Recipe builder navigation fix**
- Clicking away from an ingredient detail view returns to the search view within the overlay, not back to the recipe page
- This is a navigation stack fix within FoodSearchOverlay's select mode

**Meal plan start date**
- User can choose the start date when creating or editing a meal plan
- Date picker UI follows existing date input pattern (like the nutrition targets date picker)

### Claude's Discretion
- Exact print CSS styling and layout grid
- Migration details for `notes` column on recipes table
- Recipe builder navigation stack implementation approach
- Date picker component choice for meal plan start date
- Supabase RPC/function approach for account deletion cascade

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RCPUX-01 | Recipe builder: back from ingredient detail view returns to search view (not recipe page) | FoodSearchOverlay.tsx navigation stack analysis — `detailFood` state + back button currently calls `onClose`; fix requires returning to search view within overlay |
| RCPUX-02 | Recipe notes field (auto-expanding textarea) and date created display in builder and list | `Recipe` type lacks `notes` column; migration needed; `useUpdateRecipe` accepts `updates: Partial<{name, servings}>` — must extend to include `notes` |
| RCPUX-03 | Date created shown on recipe list cards | `recipe.created_at` already stored; just needs relative time formatting utility; no DB change needed |
| MPLAN-01 | Meal plan start date selection in creation flow | `NewWeekPrompt` controls week creation; `useCreateMealPlan` takes `weekStart: string`; adding `<input type="date">` to NewWeekPrompt is sufficient |
| MPLAN-02 | Print meal plan — browser print with CSS, daily nutrition totals | `PlanGrid` + `DayCard` already compute per-day nutrition; `window.print()` + `@media print` CSS added to `PlanPage`; print button in ⋮ overflow menu |
| DELMG-01 | Delete meals and recipes — inline confirmation, creator/admin only, soft-delete | `useDeleteMeal` and `useDeleteRecipe` already exist; UI work only (inline confirmation pattern, permission check via `isAdmin || createdBy === session.user.id`) |
| DELMG-02 | Deleted recipe in meal plan shows "(Deleted recipe)" placeholder | `MealPlanSlot` joins `meals`; when `meals` row has `deleted_at` set, the slot join returns null or requires reading through soft-deleted rows — RLS currently filters `deleted_at IS NULL` on meals query; plan slots need to read deleted meals by name; small RLS/join adjustment needed |
| ACCTM-01 | Account deletion with admin transfer, "DELETE" typed confirmation, household cleanup | Requires Supabase `auth.admin.deleteUser()` which is an Admin API call; client-side cannot call it directly — needs a Supabase Edge Function or DB RPC with `security definer` to handle the cascade |
</phase_requirements>

---

## Summary

Phase 13 is a broad UX polish phase touching six distinct features: a navigation stack fix in `FoodSearchOverlay`, recipe notes and date metadata, meal plan start date selection, browser-native print, inline deletion confirmation for meals/recipes, and a full account deletion flow with household admin transfer.

The stack is unchanged from previous phases: React 19 + Vite + TanStack Query + Supabase + Tailwind CSS 4. No new libraries are required. The most technically complex feature is account deletion (ACCTM-01), which requires a Supabase Edge Function because `auth.admin.deleteUser()` is an Admin API endpoint that can only be called with a `service_role` key — client-side code must not hold this key. All other features are pure frontend work against existing hooks.

The `DELMG-02` requirement (deleted recipe placeholder in meal plan) has a subtle RLS implication: the existing `useMeals` query filters `deleted_at IS NULL`, but `meal_plan_slots` joins `meals` for display. The plan slot query (`useMealPlanSlots`) uses `meals(*, meal_items(*))` — Supabase PostgREST joins go through the same RLS policies, so a deleted meal row will return null for the joined object. The plan display layer needs to handle null meal joins gracefully and show "(Deleted recipe)" rather than crashing.

**Primary recommendation:** Implement in this order: (1) DB migration for recipe notes, (2) RCPUX fixes (notes, date, nav), (3) DELMG inline confirmations, (4) MPLAN features (date picker, print), (5) ACCTM account deletion Edge Function last (highest complexity, needs careful auth handling).

---

## Standard Stack

### Core (unchanged from project baseline)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI components | Project baseline |
| TanStack Query | 5.x | Server state, mutations | All CRUD follows useMutation pattern |
| Supabase JS | 2.x | DB queries, auth, edge functions | Project baseline |
| Tailwind CSS 4 | 4.x | Utility styling with @theme tokens | Project baseline |
| react-router-dom | 7.x | Page routing | Project baseline |
| Vitest + jsdom | current | Unit tests | Existing test suite |

### No New Libraries

Per project conventions and locked decisions:
- No PDF libraries — browser `window.print()` only
- No date libraries — native `Date` + UTC arithmetic (established in Phase 3)
- No tooltip libraries — `title` HTML attribute for hover date
- No component libraries — Tailwind CSS 4 custom components only

---

## Architecture Patterns

### Established Pattern: TanStack Query Mutations

All CRUD operations follow this structure (verified from `useRecipes.ts`, `useMeals.ts`, `useCustomFoods.ts`):

```typescript
// Source: src/hooks/useRecipes.ts:135–151
export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('recipes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
```

Both `useDeleteMeal` and `useDeleteRecipe` already exist and are implemented correctly. No hook changes needed for DELMG-01 — the work is purely UI (inline confirmation state + permission gate).

### Established Pattern: Permission Gate

```typescript
// Source: src/pages/RecipesPage.tsx:27–29
function canDelete(createdBy: string) {
  return isAdmin || createdBy === session?.user.id
}
```

This pattern already exists in `RecipesPage.tsx` and `FoodSearchOverlay.tsx`. Apply the same check in `MealCard.tsx` and any other component that shows delete controls.

### Established Pattern: Inline Delete Confirmation State

```typescript
// Source: src/components/food/FoodSearchOverlay.tsx:346
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
```

The existing `FoodSearchOverlay` uses `deleteConfirm` state to track which item is pending deletion. The **difference for this phase** is that confirmation renders inline (replacing the delete button in-place) rather than as a modal overlay. The state management pattern is identical.

Inline confirmation render pattern:
```typescript
// In-place replacement inside the list row
{deleteConfirmId === item.id ? (
  <span className="flex items-center gap-2 text-xs">
    <span className="text-text/60">Delete {item.name.slice(0, 30)}?</span>
    <button onClick={() => handleDelete(item.id)} className="text-red-500 font-semibold">Yes, delete</button>
    <button onClick={() => setDeleteConfirmId(null)} className="text-primary">Keep it</button>
  </span>
) : (
  canDelete(item.created_by) && (
    <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(item.id) }}>×</button>
  )
)}
```

### Pattern: Recipe Notes Auto-Expanding Textarea

Auto-expanding textarea is a well-established pattern using `onInput` to set `height: auto` then `height: scrollHeight`:

```typescript
// CSS: resize: none; overflow: hidden
// JS: target.style.height = 'auto'; target.style.height = target.scrollHeight + 'px'
function handleNotesInput(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
```

Save on blur (not on every keystroke) via `useUpdateRecipe`:
```typescript
function handleNotesBlur() {
  if (localNotes !== null && localNotes !== recipe?.notes) {
    updateRecipe.mutate({ id: recipe.id, updates: { notes: localNotes } })
  }
  setLocalNotes(null)
}
```

### Pattern: Relative Time Without Library

```typescript
// No date-fns — use native Date math (project convention)
function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

// Full date for title attribute
const fullDate = new Date(recipe.created_at).toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
})
```

### Pattern: Browser Print CSS

```css
/* In global CSS or component style — no library needed */
@media print {
  .no-print { display: none !important; }
  body { background: white; color: black; }
  .print-grid { display: table; width: 100%; border-collapse: collapse; }
  .print-grid td, .print-grid th { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
}
```

Apply `no-print` to: `TabBar`, `Sidebar`, `MobileDrawer`, `OfflineBanner`, `InstallPrompt`, all buttons in `PlanPage` header. The `PlanGrid` already renders the data needed for print.

### Pattern: Account Deletion via Edge Function

`auth.admin.deleteUser()` requires the Supabase `service_role` key which must never be exposed to the client. The correct pattern is a Supabase Edge Function invoked from the client:

```typescript
// Client call
const { error } = await supabase.functions.invoke('delete-account', {
  body: { newAdminUserId: selectedMemberId } // optional, for admin transfer
})
```

```typescript
// Edge Function (Deno) — has access to service_role via env
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// 1. If newAdminUserId: UPDATE household_members SET role='admin' WHERE user_id=newAdminUserId
// 2. If last member: DELETE household (cascades via FK)
// 3. DELETE from household_members WHERE user_id=requestingUserId
// 4. adminClient.auth.admin.deleteUser(requestingUserId)
```

The Edge Function gets the requesting user's ID from the JWT (`req.headers.get('Authorization')`), not from the request body — prevents spoofing.

### Pattern: FoodSearchOverlay Navigation Stack Fix (RCPUX-01)

Current behavior: when user taps "Details" on a food row in select mode, `detailFood` state is set and `FoodDetailPanel` renders full-screen. When user taps the back button in `FoodDetailPanel`, it calls `setDetailFood(null)` — this returns to the search view correctly.

The reported issue is that when the overlay back button (the chevron-left at the top) is pressed while in detail view, `onClose` fires — which closes the entire overlay and navigates back to the recipe page. The fix is to intercept the back button press when `detailFood !== null` and clear `detailFood` instead of calling `onClose`.

```typescript
// In FoodSearchOverlay header back button onClick:
onClick={detailFood ? () => setDetailFood(null) : onClose}
```

This is a single-line fix in `FoodSearchOverlay.tsx:447` area. The `FoodDetailPanel` already has its own close/back button that calls `setDetailFood(null)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Account deletion cascade | Custom SQL in migration | Supabase Edge Function with service_role | `auth.admin.deleteUser` requires service_role key — cannot use from client or DB trigger safely |
| Relative time display | date-fns / moment | Native Date arithmetic | Project convention; simple "N days ago" doesn't need a library |
| Print layout | PDF generation library (jsPDF, etc.) | `window.print()` + `@media print` CSS | Decision locked; simpler, no dependency |
| Tooltip for full date | Tooltip library | HTML `title` attribute | UI-SPEC locked; no library in project |
| Auto-expanding textarea | Rich text editor (tiptap, etc.) | Native `<textarea>` + JS height update | Recipe notes are plain text only |

---

## Common Pitfalls

### Pitfall 1: RLS Blocking Deleted Meal Reads in Plan Slots

**What goes wrong:** The `useMealPlanSlots` query joins `meals(*, meal_items(*))`. PostgREST applies the `meals` RLS policy to the join, filtering `deleted_at IS NULL`. When a recipe-based meal is soft-deleted, the slot still exists in `meal_plan_slots` with `meal_id` set, but the join returns null. The plan grid silently shows empty slots instead of "(Deleted recipe)".

**Why it happens:** Supabase PostgREST applies RLS on every join leg independently. The existing RLS on `meals` (`.is('deleted_at', null)`) is enforced even when meals is accessed as a join target.

**How to avoid:** In the plan display layer (`DayCard.tsx` / `SlotCard.tsx`), treat a slot with `meal_id !== null && slot.meals === null` as a "(Deleted recipe)" case. No RLS change needed — the null-join behavior is the right indicator.

**Warning signs:** Slot cards showing empty/blank where a meal was previously assigned after recipe deletion.

### Pitfall 2: Account Deletion Edge Function Auth

**What goes wrong:** If the Edge Function reads the user ID from the request body instead of the JWT, any authenticated user could delete any other user's account.

**How to avoid:** Always extract the requesting user ID from the verified JWT in the Edge Function:
```typescript
const authHeader = req.headers.get('Authorization')!
const { data: { user } } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''))
const userId = user!.id
```

**Warning signs:** Any code that reads `userId` from `req.json()` body rather than the verified token.

### Pitfall 3: Admin Transfer Race Condition

**What goes wrong:** Admin selects new admin, clicks confirm, network is slow. User clicks again. Two transfer requests fire. If first completes and account deletion starts, the second transfer may fail or create inconsistent state.

**How to avoid:** Disable the confirm button while the mutation is `isPending`. The Edge Function should also handle the transfer + deletion atomically in a single RPC to avoid partial state.

### Pitfall 4: useUpdateRecipe Missing `notes` Field

**What goes wrong:** `useUpdateRecipe` currently accepts `updates: { name?: string; servings?: number }`. Adding `notes` without updating the TypeScript signature causes type errors.

**How to avoid:** Extend the `updates` type in `useUpdateRecipe` to include `notes?: string | null`. Also update the `Recipe` interface in `types/database.ts`.

### Pitfall 5: Print CSS Specificity

**What goes wrong:** Tailwind utility classes applied to the live UI override `@media print` styles if both use the same specificity. Background colors and text colors may not revert to B&W.

**How to avoid:** Use `!important` in print rules for critical overrides: `background: white !important; color: black !important;`. Add `color-adjust: exact; -webkit-print-color-adjust: exact` to the `@media print` block if needed, or explicitly set backgrounds.

### Pitfall 6: `getWeekStart` UTC Arithmetic for Date Picker

**What goes wrong:** When user selects a date from `<input type="date">`, the browser returns a local timezone string (e.g. `"2026-03-16"`). Constructing `new Date("2026-03-16")` without appending `T00:00:00Z` causes timezone drift — the date may shift to the previous day in timezones behind UTC.

**How to avoid:** Follow the existing pattern (established in Phase 3): always append `T00:00:00Z` when parsing YYYY-MM-DD strings and use UTC date methods. The `getWeekStart` utility already does this.

---

## Code Examples

### Recipe Notes: Migration

```sql
-- supabase/migrations/016_recipe_notes.sql
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS notes text;
```

No NOT NULL, no DEFAULT — null means "no notes" which is the initial state. Nullable text handles empty gracefully.

### Recipe Notes: Type Extension

```typescript
// src/types/database.ts — Recipe interface
export interface Recipe {
  id: string
  household_id: string
  created_by: string
  name: string
  servings: number
  notes: string | null  // NEW
  deleted_at: string | null
  created_at: string
  updated_at: string
}
```

### Recipe Notes: Hook Extension

```typescript
// src/hooks/useRecipes.ts — useUpdateRecipe
updates: { name?: string; servings?: number; notes?: string | null }
```

### Meal Plan Start Date in NewWeekPrompt

```typescript
// Inside NewWeekPrompt — add date input before choice buttons
const [planStart, setPlanStart] = useState(weekStart)  // default: current week start

<div>
  <label className="block text-sm text-text/60 mb-1">Plan start date</label>
  <input
    type="date"
    value={planStart}
    onChange={e => setPlanStart(e.target.value)}
    className="border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary"
  />
</div>

// Pass planStart to onChoice instead of hardcoded weekStart
onChoice('fresh', undefined, planStart)
```

### Account Deletion Edge Function (skeleton)

```typescript
// supabase/functions/delete-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')!
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  const { newAdminUserId } = await req.json()
  const userId = user.id

  // Check if last member
  const { data: members } = await adminClient
    .from('household_members')
    .select('user_id, household_id, role')
    .eq('user_id', userId)
    .single()

  const { count } = await adminClient
    .from('household_members')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', members!.household_id)

  if (count === 1) {
    // Delete household (cascades via FK to members, meal_plans, etc.)
    await adminClient.from('households').delete().eq('id', members!.household_id)
  } else {
    if (newAdminUserId) {
      await adminClient
        .from('household_members')
        .update({ role: 'admin' })
        .eq('household_id', members!.household_id)
        .eq('user_id', newAdminUserId)
    }
    await adminClient
      .from('household_members')
      .delete()
      .eq('user_id', userId)
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Modal overlay for delete confirmation | Inline confirmation replacing delete button | Locked decision for this phase — avoids z-index stacking and overlay complexity |
| Separate admin API route for user deletion | Supabase Edge Function with service_role | Current Supabase best practice for auth admin operations from client apps |

---

## Open Questions

1. **Cascade behavior when household is deleted**
   - What we know: `household_members` has `household_id FK` to `households`. Some tables (meals, recipes, meal_plans) also FK to `household_id`.
   - What's unclear: Whether all FK relationships are `ON DELETE CASCADE` — need to verify in migration files before the Edge Function blindly deletes households.
   - Recommendation: Read migration `001_foundation.sql` and `004_food_recipe.sql` during planning to confirm cascade behavior before writing the Edge Function. If cascades are not set, the Edge Function must delete child rows in order.

2. **DELMG-02: "(Deleted recipe)" in meal plan when meal itself is not deleted**
   - What we know: Plan slots reference `meal_id`; meals contain multiple items (recipes, foods). The slot holds a meal, not a recipe directly. If the recipe inside a meal is deleted, the meal still exists.
   - What's unclear: The DELMG-02 requirement says "deleted recipe" — does it mean deleted recipes inside meal items, or deleted meals? From CONTEXT.md: "soft-remove from plans — mark recipe as deleted but keep it visible in meal plans as '(Deleted recipe)'". This likely means when a recipe (not a meal) is deleted, and that recipe is a `meal_item` with `item_type='recipe'`, display it as "(Deleted recipe)" in the meal detail view.
   - Recommendation: During planning, clarify whether the "(Deleted recipe)" indicator is in the plan grid slot card or inside the meal detail view (LogMealModal). Both are feasible; the slot card approach requires reading meal_items in the grid.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RCPUX-01 | Back button in select mode overlay during detail view returns to search, not recipe page | unit | `npx vitest run tests/recipe-builder.test.tsx -t "FoodSearchOverlay"` | ❌ Wave 0 |
| RCPUX-02 | Recipe notes saved on blur, auto-expands | unit | `npx vitest run tests/recipe-builder.test.tsx -t "notes"` | ❌ Wave 0 |
| RCPUX-03 | Date created shows relative time on list cards | unit | `npx vitest run tests/recipes.test.ts -t "date created"` | ❌ Wave 0 |
| MPLAN-01 | Meal plan start date selection respected in creation | unit | `npx vitest run tests/meal-plan.test.ts -t "start date"` | ❌ Wave 0 |
| MPLAN-02 | Print button triggers window.print; print CSS hides chrome | manual-only | n/a — requires browser print dialog | n/a |
| DELMG-01 | Inline delete confirmation shown before deletion; creator/admin gate enforced | unit | `npx vitest run tests/recipes.test.ts -t "inline delete"` | ❌ Wave 0 |
| DELMG-02 | Deleted recipe shows placeholder text in plan | unit | `npx vitest run tests/meal-plan.test.ts -t "deleted recipe"` | ❌ Wave 0 |
| ACCTM-01 | "DELETE" typed confirmation enables button; Edge Function called on confirm | unit | `npx vitest run tests/settings.test.tsx -t "account deletion"` | ❌ Wave 0 |

MPLAN-02 (print) is manual-only because browser print dialog cannot be triggered or verified in jsdom.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/recipe-builder.test.tsx tests/recipes.test.ts tests/meal-plan.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/recipe-builder.test.tsx` — extend with RCPUX-01 (overlay nav), RCPUX-02 (notes)
- [ ] `tests/recipes.test.ts` — extend with RCPUX-03 (date display), DELMG-01 (inline confirmation)
- [ ] `tests/meal-plan.test.ts` — extend with MPLAN-01 (start date), DELMG-02 (deleted recipe placeholder)
- [ ] `tests/settings.test.tsx` — NEW file covering ACCTM-01 (Danger Zone, typed confirmation)

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/components/food/FoodSearchOverlay.tsx` — navigation stack, deleteConfirm state pattern
- Direct code read: `src/components/recipe/RecipeBuilder.tsx` — recipe update pattern, foodDataMap hydration
- Direct code read: `src/hooks/useRecipes.ts`, `useMeals.ts`, `useCustomFoods.ts` — existing delete mutations
- Direct code read: `src/hooks/useMealPlan.ts` — `useCreateMealPlan(weekStart)` signature for MPLAN-01
- Direct code read: `src/pages/SettingsPage.tsx` — current settings layout, signOut pattern, isAdmin check
- Direct code read: `src/types/database.ts` — `Recipe` type missing `notes` field; `MealPlanSlot` structure
- Direct code read: `src/pages/RecipesPage.tsx` — `canDelete` permission pattern, existing delete modal
- Direct code read: `src/pages/PlanPage.tsx` — week navigation, no overflow menu yet (print button target)
- Direct code read: `supabase/migrations/014_v1_1_polish.sql` — migration pattern reference
- Direct code read: `.planning/phases/13-recipe-meal-plan-account-management/13-UI-SPEC.md` — typography, color, interaction contracts, copywriting

### Secondary (MEDIUM confidence)
- Supabase docs pattern: Edge Functions with service_role for auth admin operations — standard approach for user deletion from client apps
- Browser print standard: `window.print()` + `@media print` CSS — stable browser API, no library needed

### Tertiary (LOW confidence)
- FK cascade behavior on `households` table — requires reading migration files during planning to confirm

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct code reads; no new libraries
- Architecture patterns: HIGH — all patterns verified from existing codebase files
- Account deletion: MEDIUM — Edge Function skeleton based on Supabase standard pattern; exact cascade behavior needs migration file verification
- Pitfalls: HIGH — identified from actual code structure, not hypothetical

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack; Supabase API may evolve)
