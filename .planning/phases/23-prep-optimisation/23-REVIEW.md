---
phase: 23-prep-optimisation
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - src/App.tsx
  - src/components/cook/CookEntryPointOnRecipeDetail.tsx
  - src/components/cook/CookModeShell.tsx
  - src/components/cook/CookProgressBar.tsx
  - src/components/cook/CookStepCard.tsx
  - src/components/cook/CookStepPrimaryAction.tsx
  - src/components/cook/CookStepTimer.tsx
  - src/components/cook/CookTimerNotifications.ts
  - src/components/cook/InAppTimerAlert.tsx
  - src/components/cook/MemberLaneHeader.tsx
  - src/components/cook/MultiMealPromptOverlay.tsx
  - src/components/cook/MultiMealSwitcher.tsx
  - src/components/cook/NotificationPermissionBanner.tsx
  - src/components/cook/ReheatSequenceCard.tsx
  - src/components/plan/BatchPrepButton.tsx
  - src/components/plan/BatchPrepModal.tsx
  - src/components/plan/BatchPrepSessionCard.tsx
  - src/components/plan/DayCard.tsx
  - src/components/plan/FreezerBadge.tsx
  - src/components/plan/PlanGrid.tsx
  - src/components/plan/SlotCard.tsx
  - src/components/recipe/RecipeBuilder.tsx
  - src/components/recipe/RecipeFreezerToggle.tsx
  - src/components/recipe/RecipeStepRow.tsx
  - src/components/recipe/RecipeStepsSection.tsx
  - src/hooks/useBatchPrepSummary.ts
  - src/hooks/useCookSession.ts
  - src/hooks/useFreezerClassification.ts
  - src/hooks/useNotificationPermission.ts
  - src/hooks/useRecipeSteps.ts
  - src/lib/queryKeys.ts
  - src/pages/CookModePage.tsx
  - src/pages/RecipesPage.tsx
  - src/pages/StandaloneCookPickerPage.tsx
  - src/types/database.ts
  - src/utils/recipeSteps.ts
  - supabase/functions/compute-batch-prep/index.ts
  - supabase/functions/generate-cook-sequence/index.ts
  - supabase/functions/generate-recipe-steps/index.ts
  - supabase/functions/generate-reheat-sequence/index.ts
  - supabase/migrations/029_prep_optimisation.sql
  - tests/cookMode.test.tsx
  - tests/cookSession.test.tsx
  - tests/notifications.test.tsx
  - tests/recipeSteps.test.ts
findings:
  critical: 0
  warning: 9
  info: 8
  total: 17
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

Phase 23 adds recipe step AI generation, batch prep planning, cook mode with real-time timers, freezer classification, and PWA notifications. The architecture is solid: RLS policies cover all four CRUD operations on `cook_sessions`, edge functions validate auth internally (L-025 compliant), step IDs are stable UUIDs (R-02), and the rate-limit counter pattern from Phase 22 is correctly extended.

No critical security vulnerabilities were found. The issues fall into two clusters:

1. **Race condition / stale-closure bugs** in the cook-mode timer and JSONB read-modify-write path that could cause incorrect state under real cooking conditions.
2. **Missing ownership checks** in `useUpdateCookStep` and `useCompleteCookSession` that allow any authenticated household member to mutate another member's session state.
3. **Edge function blockers** — `generate-recipe-steps` hard-requires a meal plan to exist before generating steps, which will fail on a new household that has recipes but no plan yet.

---

## Warnings

### WR-01: Timer interval captures stale `handleTimerComplete` closure

**File:** `src/pages/CookModePage.tsx:187`
**Issue:** The `setInterval` callback at line 187 closes over `handleTimerComplete`, which is a `useCallback` that itself closes over `stepsById` and `activeSession`. `stepsById` is rebuilt every render from `liveSteps`, so the closure captured by the interval at "Start timer" time is the one from that render. If `liveSteps` or `activeSession` change before the timer fires (e.g. realtime update arrives), the notification fires with stale step text or a stale `mealName`. Worse, the interval is never cleared when `activeStepId` changes (e.g. a collaborator marks the step done remotely), so the interval can fire a spurious alert for an already-completed step.

**Fix:** Clear and restart the interval inside a `useEffect` that tracks the active step's `timer_started_at` from the persisted session state, rather than creating it inline inside an event handler:

```typescript
// Replace the inline setInterval in handlePrimaryAction with:
useEffect(() => {
  const state = activeStepId ? stepStates[activeStepId] : null
  const timerStartedAt = state?.timer_started_at
  if (!timerStartedAt || !activeStepId) return
  const step = stepsById.get(activeStepId)
  if (!step || step.duration_minutes === 0) return
  const totalMs = step.duration_minutes * 60 * 1000
  const startEpoch = new Date(timerStartedAt).getTime()
  const remaining = totalMs - (Date.now() - startEpoch)
  if (remaining <= 0) {
    handleTimerComplete(activeStepId)
    return
  }
  const id = window.setTimeout(() => handleTimerComplete(activeStepId), remaining)
  return () => window.clearTimeout(id)
}, [activeStepId, stepStates, stepsById, handleTimerComplete])
```

---

### WR-02: `useUpdateCookStep` read-modify-write race condition — no household ownership check at DB layer

**File:** `src/hooks/useCookSession.ts:186-213`
**Issue:** The `useUpdateCookStep` mutation performs a client-side read-modify-write: it reads `step_state`, merges a patch, then writes the full blob back. If two household members (or two browser tabs) fire concurrent updates, the second write silently overwrites the first. The RLS policy only checks `household_id = get_user_household_id()`, so any household member can overwrite any other member's step state — including undoing a completed step.

Additionally, there is no `started_by` check — a household member who did not start the session can abandon or complete it, which may be intentional for collaborative cooking but is not documented.

**Fix:** For the merge pattern, consider using a Postgres `jsonb_set` via an edge function or RPC to do an atomic merge. As a short-term mitigation, add an `eq('started_by', session.user.id)` guard in `useCompleteCookSession` to at least prevent session completion by non-owners:

```typescript
// In useCompleteCookSession mutationFn:
const { error } = await supabase
  .from('cook_sessions')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('id', sessionId)
  .eq('started_by', session.user.id) // add this guard
```

---

### WR-03: `generate-recipe-steps` blocks if household has no meal plan

**File:** `supabase/functions/generate-recipe-steps/index.ts:182-195`
**Issue:** The function requires a meal plan row to exist in order to attach a `plan_generations` rate-limit entry. A new household that has recipes but has never created a meal plan will receive: `"No meal plan exists for this household. Create a plan before generating steps."` — a confusing error when trying to use the recipe step generator from the recipe editor.

`generate-cook-sequence` and `generate-reheat-sequence` handle this gracefully by using `latestPlan?.id ?? null` when inserting the rate-limit row (the `plan_id` column allows NULL). `generate-recipe-steps` instead enforces non-null at the application layer.

**Fix:** Match the pattern used in the other two functions:

```typescript
// Replace the hard error block (lines 191-195) with:
const { data: latestPlan } = await adminClient
  .from("meal_plans")
  .select("id")
  .eq("household_id", householdId)
  .order("week_start", { ascending: false })
  .limit(1)
  .maybeSingle();

// latestPlan may be null — plan_id accepts NULL; rate limit still applies
const { data: jobRow } = await adminClient
  .from("plan_generations")
  .insert({
    household_id: householdId,
    plan_id: latestPlan?.id ?? null,
    ...
  })
```

Note: verify that the `plan_generations.plan_id` DB column actually allows NULL before deploying (the migration adds a `NOT NULL` constraint in Phase 22's schema — if so, a separate migration to relax it is needed).

---

### WR-04: `compute-batch-prep` writes slot reassignments without verifying the slot belongs to the correct household

**File:** `supabase/functions/compute-batch-prep/index.ts:345-356`
**Issue:** The reassignment loop at line 345 updates `meal_plan_slots` rows using `r.slot_id` values that came directly from the Claude AI response. The only safety guard is `.eq('plan_id', planId)`. If Claude hallucinated a `slot_id` value that happens to be a valid UUID belonging to another plan in the same household, the update would still succeed. More critically, the `planId` itself came from the untrusted request body — it was verified to be a valid plan for the household (implicitly, because the slots query only returns rows for that planId), but a malicious request supplying a `planId` from a different household would still pass the auth check since it only checks `household_id` membership, not that `planId` belongs to the household.

**Fix:** Add an explicit ownership check when fetching the plan before processing:

```typescript
// After the membership check, verify planId ownership:
const { data: plan } = await adminClient
  .from("meal_plans")
  .select("id")
  .eq("id", planId)
  .eq("household_id", householdId)
  .maybeSingle();

if (!plan) {
  return new Response(
    JSON.stringify({ success: false, error: "Plan not found or access denied" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}
```

---

### WR-05: Cook mode routes lack `AuthGuard` — unauthenticated access renders blank

**File:** `src/App.tsx:162-164`
**Issue:** The `/cook`, `/cook/session/:sessionId`, and `/cook/:mealId` routes are defined outside the `AuthGuard` wrapper:

```tsx
{/* Cook Mode routes — outside AppShell, full-screen experience */}
<Route path="/cook" element={<StandaloneCookPickerPage />} />
<Route path="/cook/session/:sessionId" element={<CookModePage />} />
<Route path="/cook/:mealId" element={<CookModePage />} />
```

An unauthenticated user who navigates directly to a cook URL will render the page components. The Supabase queries will fail (RLS will return no data), so there is no data leak, but the UX is a blank page or confusing loading state rather than a redirect to `/auth`.

**Fix:** Wrap the cook routes in an `AuthGuard`:

```tsx
<Route
  element={
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  }
>
  <Route path="/cook" element={<StandaloneCookPickerPage />} />
  <Route path="/cook/session/:sessionId" element={<CookModePage />} />
  <Route path="/cook/:mealId" element={<CookModePage />} />
</Route>
```

---

### WR-06: `CookModePage` uses `mealId` as the meal name display string

**File:** `src/pages/CookModePage.tsx:141` and `361`
**Issue:** At line 141, `recipeName` for the notification is set to `activeSession?.meal_id ?? mealId ?? 'Cook Mode'` — this passes a raw UUID as the meal name in OS notifications and in-app timer alerts. Users will see notifications reading "d3a4f…: Step done." At line 361, `mealName` in the `CookModeShell` header also shows the raw UUID.

**Fix:** Look up the meal name from the recipe steps data or from a separate meals query. The page already loads `recipeStepsData` — if a recipe name is unavailable, fall back to `'Cook Mode'` rather than the UUID:

```typescript
// Replace line 141:
const recipeName = activeSession?.meal_id ?? mealId ?? 'Cook Mode'
// With:
const recipeName = 'Cook Mode' // until meal name lookup is added
```

For the header (line 361), the same pattern applies. A proper fix would join against a `useMeal(mealId)` hook query.

---

### WR-07: `useUpdateCookStep` — no `updated_at` timestamp guard on concurrent writes

**File:** `src/hooks/useCookSession.ts:213`
**Issue:** The `useUpdateCookStep` mutation updates `step_state` with `updated_at: new Date().toISOString()`. However the Supabase UPDATE does not include an `.eq('updated_at', <timestamp-read-before>)` optimistic lock. Because the function reads, modifies, then writes the full JSONB blob, concurrent writes from two collaborators will silently win based on last-write-wins. The realtime broadcast will reflect the final state, but the intermediate write is lost without any error surfacing to the user.

This is an inherent limitation of the client-side JSONB read-modify-write pattern. The current code is pragmatic but should be documented, and the step IDs being stable (R-02) means lost updates manifest as a step reverting to its prior state rather than corruption. No code change is strictly required, but add a comment:

```typescript
// NOTE: read-modify-write without optimistic lock — concurrent collaborator
// writes on the same step will last-write-win. Realtime will sync the final
// server state. For single-step updates this is acceptable; for high-frequency
// concurrent updates consider a DB-side jsonb_set RPC.
```

---

### WR-08: `RecipeStepsSection` — `handleRegenerate` fires without confirmation when no existing steps

**File:** `src/components/recipe/RecipeStepsSection.tsx:126`
**Issue:** The `onClick` logic at line 126 is:

```tsx
onClick={() => (edited && steps.length > 0 ? setConfirmRegenerate(true) : handleRegenerate())}
```

When `steps.length === 0` (no steps yet), clicking "Regenerate from ingredients" immediately calls `handleRegenerate()` without confirmation. This is intentional for the zero-step case. However when `edited === false` but `steps.length > 0` (AI-generated steps, user hasn't edited), regeneration also fires without confirmation, silently replacing AI-generated steps the user may have wanted to keep. This is a subtle data-loss edge case.

**Fix:** Change the condition to confirm whenever steps exist, regardless of the `edited` flag:

```tsx
onClick={() => (steps.length > 0 ? setConfirmRegenerate(true) : handleRegenerate())}
```

---

### WR-09: `useFreezerClassification` uses `as any` cast to bypass TypeScript — hides missing type

**File:** `src/hooks/useFreezerClassification.ts:17` and `39`
**Issue:** Both mutations cast `supabase as any` to suppress a TypeScript error when updating `freezer_friendly` and `freezer_shelf_life_weeks`. This means type-checking is disabled for these DB calls. If the column names or types changed in a migration, the error would only surface at runtime.

The root cause is that `freezer_friendly` and `freezer_shelf_life_weeks` were added to the `recipes` table in migration 029 but the `Database` type in `src/types/database.ts` does not reflect them in the `recipes.Update` type (the `Recipe` interface has them as fields, but the `Database.public.Tables.recipes.Update` definition at line 413 uses `Partial<Omit<Recipe, 'id' | 'created_at'>>`, which should include them automatically).

**Fix:** Remove the `as any` cast and verify the TypeScript path resolves correctly. The typed client should accept `freezer_friendly` in `.update()` since `Recipe` includes the field and the `Update` type is derived from it:

```typescript
// Replace:
const db = supabase as any
const { error } = await db.from('recipes').update({ freezer_friendly: params.value })...

// With:
const { error } = await supabase.from('recipes').update({ freezer_friendly: params.value })...
```

If TypeScript still rejects this, it indicates the generated types need refreshing (`supabase gen types typescript`).

---

## Info

### IN-01: `CookTimerNotifications.ts` — `playTimerChime` leaks an `AudioContext` if tab is suspended between `createOscillator` and `osc.stop`

**File:** `src/components/cook/CookTimerNotifications.ts:46-70`
**Issue:** If the browser suspends the `AudioContext` between creation and the oscillator stopping (e.g. tab backgrounded, autoplay policy kicks in mid-execution), `ctx.close()` in `osc.onended` may never be called, leaking the context. Mobile browsers enforce strict limits on concurrent `AudioContext` instances.

**Fix:** Add a safety timeout to close the context even if `onended` does not fire:

```typescript
osc.onended = () => ctx.close()
// Safety: close context after 1s regardless
setTimeout(() => { if (ctx.state !== 'closed') ctx.close() }, 1000)
```

---

### IN-02: `InAppTimerAlert` — `onDismiss` in `useEffect` dependency can cause duplicate auto-dismiss

**File:** `src/components/cook/InAppTimerAlert.tsx:13-19`
**Issue:** The `useEffect` has `[onDismiss]` in its dependency array. If the parent (`CookModePage`) passes a new function reference on each render (which it does — `setTimerAlert(null)` is an inline arrow at line 360), the timeout is reset every time the parent re-renders while the alert is visible. In practice this means the 10-second auto-dismiss could take longer than expected if re-renders are frequent.

**Fix:** Either wrap the `onDismiss` call in a `useCallback` in the parent, or use a `useRef` to hold the callback in `InAppTimerAlert`:

```typescript
const onDismissRef = useRef(onDismiss)
onDismissRef.current = onDismiss
useEffect(() => {
  const t = setTimeout(() => {
    setVisible(false)
    onDismissRef.current()
  }, 10000)
  return () => clearTimeout(t)
}, []) // empty deps — runs once on mount
```

---

### IN-03: `MemberLaneHeader` — member picker dropdown has no click-outside-to-close behavior

**File:** `src/components/cook/MemberLaneHeader.tsx:65`
**Issue:** The swap owner dropdown opens on button click but has no way to close it except by selecting a member. Clicking elsewhere on the page does not close it. This will likely frustrate users during cook mode.

**Fix:** Add a `useEffect` that listens for `mousedown` outside the dropdown:

```typescript
const dropdownRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (!pickerOpen) return
  const handler = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setPickerOpen(false)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [pickerOpen])
```

---

### IN-04: `NotificationPermissionBanner` duplicates localStorage key and cooldown logic from `useNotificationPermission`

**File:** `src/components/cook/NotificationPermissionBanner.tsx:3-4` vs `src/hooks/useNotificationPermission.ts:3-4`
**Issue:** Both files define `DISMISS_KEY = 'cook-notification-dismissed-at'` and `COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000` independently, and both read from `localStorage` to check the cooldown. If either constant is updated in one file, the other will silently disagree. The banner also calls `localStorage.setItem` directly at line 17 in addition to calling `dismiss()` from the hook, writing the key twice on dismiss.

**Fix:** Export `DISMISS_KEY` and `COOLDOWN_MS` from `useNotificationPermission.ts` and import them in the banner. Remove the direct `localStorage.setItem` call from `handleDismiss` in the banner since `dismiss()` already writes the key.

---

### IN-05: `generate-cook-sequence` — `display_name` column joined from wrong table

**File:** `supabase/functions/generate-cook-sequence/index.ts:237`
**Issue:** The member name lookup queries `household_members` and selects `display_name`:

```typescript
const { data: memberProfiles } = await adminClient
  .from("household_members")
  .select("user_id, display_name")
  .eq("household_id", householdId)
  .in("user_id", memberIds);
```

The `household_members` table does not have a `display_name` column — that column lives on the `profiles` table (joined via `user_id`). This query will return `display_name: null` for all members, causing every lane to show the raw UUID as the member label. The function's TypeScript type at line 238 acknowledges this with `display_name: string | null` but the fallback `m.user_id` is still a UUID.

**Fix:** Either join `profiles` in the query or query the `profiles` table directly:

```typescript
const { data: memberProfiles } = await adminClient
  .from("profiles")
  .select("id, display_name")
  .in("id", memberIds);
membersForClaude = (memberProfiles ?? []).map(m => ({
  id: m.id,
  name: sanitizeString(m.display_name ?? "Member"),
}));
```

---

### IN-06: `CookStepTimer` buttons missing `type="button"` attribute

**File:** `src/components/cook/CookStepTimer.tsx:62`, `68`, `111`, `119`, `128`, `135`, `145`
**Issue:** Several `<button>` elements in `CookStepTimer` are missing `type="button"`. If this component is ever rendered inside a `<form>` element, clicking these buttons would trigger form submission. The project conventions (CLAUDE.md) expect explicit `type="button"` on all non-submit buttons.

**Fix:** Add `type="button"` to all button elements in `CookStepTimer.tsx` (the Skip confirm/cancel buttons at lines 61 and 68, and the Start/Pause/Reset/Skip/Mark-complete buttons in the main render path).

---

### IN-07: `RecipeStepsSection` uses array index as `key` for uncertain additions

**File:** `src/components/recipe/RecipeStepsSection.tsx:144`
**Issue:** The uncertain additions list uses `key={i}` (array index). When items are dismissed with `prev.filter((_, idx) => idx !== i)`, using index as key causes React to potentially reuse the wrong DOM node for the remaining items.

**Fix:** Use `u.previous_step_text` as the key (it is the unique identifier for each uncertain addition in this context), or add a stable `id` field when populating the `uncertain` array:

```tsx
{uncertain.map((u) => (
  <div key={u.previous_step_text} ...>
```

---

### IN-08: `useBatchPrepSummary` cache subscription checks `queryKey[1] === planId` but the key shape is `['batch-prep', householdId, planId]`

**File:** `src/hooks/useBatchPrepSummary.ts:115-119`
**Issue:** The debounce trigger subscribes to the query cache and checks:

```typescript
event.query.queryKey[0] === 'meal-plan-slots' &&
event.query.queryKey[1] === planId
```

Looking at `queryKeys.mealPlan.slots`, the key shape is `['meal-plan-slots', planId]` — so `queryKey[1]` is indeed `planId`. This is correct. However it is a fragile assumption — if the `queryKeys` shape for `mealPlan.slots` ever changes (e.g. `householdId` is added as `queryKey[1]`), this check will silently stop triggering the debounce. The check should use the canonical `queryKeys.mealPlan.slots(planId)` key for comparison instead of hardcoding the string and index:

```typescript
// More robust: check using the canonical key prefix
const targetKey = queryKeys.mealPlan.slots(planId)
if (
  event.type === 'updated' &&
  Array.isArray(event.query.queryKey) &&
  JSON.stringify(event.query.queryKey) === JSON.stringify(targetKey)
) {
  startDebounce()
}
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
