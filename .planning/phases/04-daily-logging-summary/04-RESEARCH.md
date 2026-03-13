# Phase 4: Daily Logging & Summary - Research

**Researched:** 2026-03-13
**Domain:** Food logging UX, PWA/Service Worker, Supabase RLS patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logging interaction:**
- Two logging modes: plan-based (primary) and freeform (via '+' button for unplanned items)
- Plan-based: tap a meal in today's plan to log it with a portion size
- Portion input: stepper (- / +) defaulting to 1.0 servings, with quick-tap presets (0.5, 1.0, 1.5, 2.0) and manual text entry
- Per-meal logging is the default; a "Log all as planned" shortcut marks all unlogged meals as 1.0 servings in one tap
- Freeform logging reuses the existing FoodSearch overlay (USDA/OFF/My Foods/Recipes tabs), then prompts for quantity
- Default portion is always 1.0 servings — no target-based suggestions until Phase 5
- Any household member can log for any other member via the member selector (parents log for children)

**Daily summary view:**
- Lives on the Home page (replaces current welcome/household info)
- Large progress rings for calories, protein, carbs, fat at top (reuse existing ProgressRing component)
- Below rings: chronological list of logged meals/foods with portion and calorie contribution (tappable for full nutrition)
- Below meals list: collapsible nutrient breakdown section showing micros and custom goals actual vs target
- Date picker to navigate to any past day's summary (defaults to today)
- Member selector to view other members' summaries

**Offline & PWA:**
- Minimal offline: cache the app shell for fast loads, no offline data operations
- Inline banner at top of screen when offline; cached pages display read-only
- Action buttons show "Available when online" tooltip on tap when offline
- PWA install prompt shown after the user completes their first action (non-intrusive, appears once)
- Custom app icon (sage green with simple leaf/plate motif) and splash screen matching pastel theme
- PWA manifest with proper theme color, background color, display: standalone

**Log editing & history:**
- Users can edit portion size or delete any log entry by tapping it
- Unlimited history — view and edit any past day's logs via date picker
- Retroactive logging supported — navigate to a past date and log meals there
- Logs are household-visible by default — any member can view any other member's daily summary
- Per-log privacy toggle: members can mark individual log entries as private (hidden from other household members)

### Claude's Discretion
- Log entry data model schema (tables, columns, relationships)
- Service worker caching strategy and workbox configuration
- PWA icon design and splash screen layout
- Exact offline detection mechanism
- How "Log all as planned" determines which meals are unlogged
- Privacy toggle UI placement and storage
- Date picker component choice
- Summary animation/transition details

### Deferred Ideas (OUT OF SCOPE)
- Per-person portion suggestions based on targets — Phase 5 (TRCK-05)
- Weekly nutrition reports — v2 (REPT-01)
- Full offline data operations with sync — descoped to minimal shell caching for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRCK-04 | Each household member can log what they ate with portion size (e.g., 1.5 servings) | food_logs table schema; plan-based and freeform logging flows; portion stepper component pattern |
| TRCK-06 | User can override suggested portions with actual amount eaten | Same as TRCK-04; edit log entry flow; useMutation for update + TanStack Query invalidation |
| TRCK-07 | Daily nutrition summary shows calories, macros, micros, and custom goals vs targets | Reuse ProgressRing; calcDayNutrition in nutrition.ts; useNutritionTargets for target comparison |
| PLAT-03 | PWA installable to home screen on mobile devices | vite-plugin-pwa 1.2.0 already in package.json; manifest already configured in vite.config.ts; need PNG icons in /public |
| PLAT-04 | Core features work offline with sync when reconnected | App-shell caching with workbox; navigator.onLine + online event listener; read-only offline UI mode |
</phase_requirements>

## Summary

Phase 4 adds the food logging loop and daily summary dashboard to a React 19 / Vite 8 / Supabase / TanStack Query 5 / Tailwind CSS 4 app with vitest for testing. The core new work is: (1) a `food_logs` Postgres table with RLS, (2) a set of TanStack Query hooks wrapping Supabase CRUD for log entries, (3) HomePage transformation into a daily dashboard, and (4) completing the PWA implementation that is already scaffolded in the project.

The app shell caching and PWA manifest are already partially configured — `vite-plugin-pwa@1.2.0` is installed and `VitePWA()` is called in `vite.config.ts` with the correct manifest fields. What is missing are the PNG icon files in `/public/`, a `workbox.runtimeCaching` configuration for the app shell, and iOS-specific splash screen meta tags. The Background Sync API is not reliably supported on iOS Safari, which aligns with the locked decision to scope offline to app-shell caching only (no offline data writes).

The nutrition calculation utilities (`calcDayNutrition`, `calcMealNutrition`, `calcIngredientNutrition`) already exist in `src/utils/nutrition.ts`. The logging feature needs a new `calcLogEntryNutrition` function that scales meal-item snapshot macros by `servings_logged`. The `ProgressRing` component supports `showValue` and accepts `value`/`target` props directly, making it a drop-in for the summary rings.

**Primary recommendation:** Build the `food_logs` migration first, then hooks, then transform HomePage into the dashboard, then complete PWA icon assets. Each wave is independently testable and does not block the others except the schema must precede the hooks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | Database client, RLS-enforced CRUD | Already used in all phases |
| @tanstack/react-query | ^5.90.21 | Server state, cache invalidation | Already used in all phases |
| vite-plugin-pwa | ^1.2.0 | Service worker generation, manifest injection | Already installed; peer deps confirm Vite 8 support |
| workbox (bundled with vite-plugin-pwa) | bundled | Runtime caching strategies | No separate install needed |
| tailwindcss | ^4.2.1 | Styling with @theme tokens | Already used; sage/cream/peach palette established |
| react-router-dom | ^7.13.1 | Routing | Already used |
| vitest | ^4.1.0 | Unit tests | Already used across the test suite |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | ^16.3.2 | Component tests | For LogEntryItem, PortionStepper components |
| Native HTML `<input type="date">` | — | Date picker for navigating log history | Already mobile-friendly on iOS/Android; no library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | react-datepicker, react-day-picker | Native input has zero bundle cost and works well on mobile keyboards; external libs add ~30KB for marginal UX gain |
| navigator.onLine + online/offline events | Third-party connectivity lib | Native events are sufficient; project already avoids unnecessary dependencies |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── log/                  # New: logging-specific components
│   │   ├── PortionStepper.tsx     # - / + stepper with presets and text input
│   │   ├── LogEntryItem.tsx       # Tappable row in the daily log list
│   │   ├── LogMealModal.tsx       # Sheet/modal for plan-based log action
│   │   ├── FreeformLogModal.tsx   # Wraps FoodSearch + quantity prompt
│   │   └── OfflineBanner.tsx      # Inline "You are offline" banner
│   └── plan/                 # Existing; unchanged
├── hooks/
│   └── useFoodLogs.ts        # New: useQuery/useMutation hooks for food_logs
├── pages/
│   └── HomePage.tsx          # Transform: becomes daily dashboard
├── utils/
│   └── nutrition.ts          # Extend: add calcLogEntryNutrition
└── types/
    └── database.ts           # Extend: add FoodLog interface + Database table entry
supabase/
└── migrations/
    └── 009_food_logs.sql     # New: food_logs table + RLS
public/
├── icon-192.png              # New: required by existing manifest
├── icon-512.png              # New: required by existing manifest
└── splash-*.png              # Optional: iOS splash screens
```

### Pattern 1: food_logs Data Model

**What:** A `food_logs` table that records what a specific household member ate on a specific date. Each entry stores either a plan-based reference (slot_id) or a freeform food/recipe reference, plus the quantity in servings and macro snapshots at log time.

**When to use:** Every log action — plan-based or freeform — writes to this table.

**Recommended schema:**
```sql
create table public.food_logs (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  logged_by           uuid not null references auth.users(id),
  -- who the log is for (one of these must be set):
  member_user_id      uuid references auth.users(id) on delete cascade,
  member_profile_id   uuid references public.member_profiles(id) on delete cascade,
  -- what was logged:
  log_date            date not null,
  slot_name           text,            -- 'breakfast','lunch','dinner','snack' or NULL for freeform
  meal_id             uuid references public.meals(id) on delete set null,
  item_type           text,            -- 'food' | 'recipe' | 'meal' | NULL
  item_id             text,            -- food/recipe/meal id, NULL when meal_id is set
  item_name           text not null,   -- display name captured at log time
  servings_logged     numeric not null check (servings_logged > 0),
  -- nutrition snapshot (per-serving at log time, scaled by servings_logged for actual):
  calories_per_serving  numeric not null,
  protein_per_serving   numeric not null,
  fat_per_serving       numeric not null,
  carbs_per_serving     numeric not null,
  micronutrients        jsonb not null default '{}',
  -- privacy:
  is_private          boolean not null default false,
  -- housekeeping:
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- exactly one target member:
  constraint food_logs_one_member check (
    (member_user_id is not null and member_profile_id is null)
    or (member_user_id is null and member_profile_id is not null)
  )
);

create index food_logs_household_date_idx on public.food_logs(household_id, log_date);
create index food_logs_member_user_idx on public.food_logs(member_user_id, log_date);
create index food_logs_member_profile_idx on public.food_logs(member_profile_id, log_date);
```

**Rationale for snapshot columns:** Follows the established `meal_items` pattern — macros captured at insert time avoid re-fetching external food sources when displaying history. The `nutrition_targets` table uses a similar per-100g normalization; food_logs uses per-serving to match how portion input works.

### Pattern 2: RLS for food_logs

**What:** Row-level security that enforces household isolation and privacy. Any household member can see non-private logs for any member of their household. Private logs are visible only to the member and admins.

```sql
alter table public.food_logs enable row level security;

-- Read: household members see non-private logs; own logs always visible; admins see all
create policy "household members read food_logs"
  on public.food_logs for select
  to authenticated
  using (
    household_id = get_user_household_id()
    and (
      is_private = false
      or logged_by = (select auth.uid())
      or get_user_household_role() = 'admin'
    )
  );

-- Insert: household members insert logs for any member in their household
create policy "household members insert food_logs"
  on public.food_logs for insert
  to authenticated
  with check (
    household_id = get_user_household_id()
    and logged_by = (select auth.uid())
  );

-- Update/delete: only the logger or an admin
create policy "logger or admin update food_logs"
  on public.food_logs for update
  to authenticated
  using (
    logged_by = (select auth.uid())
    or get_user_household_role() = 'admin'
  );

create policy "logger or admin delete food_logs"
  on public.food_logs for delete
  to authenticated
  using (
    logged_by = (select auth.uid())
    or get_user_household_role() = 'admin'
  );
```

Uses `get_user_household_id()` and `get_user_household_role()` security-definer helpers that are already defined in the database — consistent with nutrition_targets and meal_plans RLS policies.

### Pattern 3: TanStack Query hooks for food_logs

**What:** Same useQuery/useMutation pattern used in useMealPlan.ts, useNutritionTargets.ts, etc.

```typescript
// src/hooks/useFoodLogs.ts
export function useFoodLogs(
  householdId: string | undefined,
  logDate: string,        // 'YYYY-MM-DD'
  memberId: string | undefined,
  memberType: 'user' | 'profile',
) {
  return useQuery({
    queryKey: ['food-logs', householdId, logDate, memberId],
    queryFn: async (): Promise<FoodLog[]> => {
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('household_id', householdId!)
        .eq('log_date', logDate)
        .eq(column, memberId!)
        .order('created_at')

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!memberId && !!logDate,
  })
}
```

Query key structure: `['food-logs', householdId, logDate, memberId]` — invalidate on insert/update/delete. Scoped per date per member to keep cache granular.

### Pattern 4: calcLogEntryNutrition extension

**What:** New utility function in `src/utils/nutrition.ts` that scales per-serving snapshot macros by `servings_logged`.

```typescript
// Extend src/utils/nutrition.ts
export function calcLogEntryNutrition(
  log: {
    calories_per_serving: number
    protein_per_serving: number
    fat_per_serving: number
    carbs_per_serving: number
    servings_logged: number
  },
): MacroSummary {
  const s = log.servings_logged
  return {
    calories: log.calories_per_serving * s,
    protein: log.protein_per_serving * s,
    fat: log.fat_per_serving * s,
    carbs: log.carbs_per_serving * s,
  }
}
```

Then `calcDayNutrition` (already exists) sums the array of these MacroSummary values.

### Pattern 5: PWA App-Shell Caching

**What:** vite-plugin-pwa with `generateSW` strategy (the default). Add `workbox.runtimeCaching` to handle navigation requests with NetworkFirst so the shell always loads from cache when offline. The manifest and plugin call already exist in `vite.config.ts`.

```typescript
// vite.config.ts additions inside VitePWA({})
workbox: {
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
        cacheableResponse: { statuses: [200] },
      },
    },
  ],
},
```

The pre-cache (JS/CSS/assets built by Vite) is handled automatically. No custom service worker needed.

### Pattern 6: Offline Detection

**What:** React context or inline hook wrapping `navigator.onLine` and the `online`/`offline` window events. Used by `OfflineBanner` and action buttons.

```typescript
// Inline hook — no library needed
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return isOnline
}
```

**iOS Safari background sync:** Background Sync API (`SyncManager`) is NOT reliably supported on iOS Safari (confirmed 2025/2026). This is why the locked decision is app-shell caching only — no write operations queued for later sync. When offline, mutation buttons show tooltips and are disabled; no optimistic writes.

### Pattern 7: PortionStepper Component

**What:** Controlled input component for serving size. Matches existing Tailwind class patterns.

```typescript
interface PortionStepperProps {
  value: number        // controlled
  onChange: (v: number) => void
  min?: number         // default 0.25
  step?: number        // default 0.25
}

const PRESETS = [0.5, 1.0, 1.5, 2.0]
```

Stepper increments by 0.25 steps; presets are tap targets above the stepper for quick selection; text input allows any positive value. All three input methods call `onChange` with the new value.

### Pattern 8: "Log all as planned" logic

**What:** Query today's plan slots (from `useMealPlanSlots`), cross-reference with existing `food_logs` for today, and insert a log entry for each slot that has a meal but no log entry yet.

```typescript
// Determines which slots are unlogged
function getUnloggedSlots(slots: SlotWithMeal[], existingLogs: FoodLog[]) {
  const loggedMealIds = new Set(
    existingLogs.filter(l => l.meal_id).map(l => l.meal_id)
  )
  return slots.filter(s => s.meal_id && !loggedMealIds.has(s.meal_id))
}
```

The mutation bulk-inserts via `supabase.from('food_logs').insert(rows)`.

### Anti-Patterns to Avoid

- **Don't store nutrition live from food source on log retrieval:** Always snapshot macros at insert time (same as `meal_items`). External APIs may change or be unavailable.
- **Don't use Background Sync API for offline writes:** iOS doesn't support it. The locked decision is read-only UI when offline.
- **Don't store grams in food_logs as the primary unit:** Store `servings_logged` (user-facing) and per-serving macros. Grams are an implementation detail inside the meal's composition, not the log.
- **Don't create a new MemberSelector variant:** Reuse the existing `src/components/plan/MemberSelector.tsx`. It already supports both user and profile types.
- **Don't add per-day RLS check on log_date:** Date filtering belongs in the query, not RLS. RLS enforces household isolation and privacy only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom SW file | vite-plugin-pwa (already installed) | Handles pre-caching manifest, update lifecycle, browser compat |
| App install prompt | Custom beforeinstallprompt logic | vite-plugin-pwa `useRegisterSW` or manual `beforeinstallprompt` event | One-time prompt behavior is already well-understood; roll a thin wrapper |
| Circular progress visualization | Custom SVG rings | `ProgressRing` component (already exists at `src/components/plan/ProgressRing.tsx`) | Fully compatible, accepts `value`/`target`/`size`/`color` props |
| Member selection dropdown | New dropdown component | `MemberSelector` (already exists at `src/components/plan/MemberSelector.tsx`) | Handles both user and profile member types with proper typing |
| Day nutrition summation | Custom reduce logic | `calcDayNutrition` in `src/utils/nutrition.ts` (already tested) | Tested, handles empty arrays correctly |
| Per-entry nutrition scaling | Custom math | New `calcLogEntryNutrition` function extending `src/utils/nutrition.ts` | Simple extension of existing pattern; keeps all calculation logic co-located |

**Key insight:** The logging feature is primarily plumbing — new Supabase table + RLS + hooks + UI wiring. Nearly all visual components and calculation utilities already exist. The risk surface is the data model and RLS correctness, not novel UI.

## Common Pitfalls

### Pitfall 1: Nutrition snapshot columns — what unit to store

**What goes wrong:** Storing total nutrition for the logged entry (calories = servings * per-serving calories) makes edits harder — you'd have to recompute on every update. Storing per-100g requires knowing the gram weight of one serving, which isn't always available for freeform logs.

**Why it happens:** meal_items stores per-100g because its items are food database entries. food_logs items may be meals (which have no single gram weight).

**How to avoid:** Store `calories_per_serving`, `protein_per_serving`, etc. + `servings_logged`. Total = per_serving * servings_logged. This matches how users think (servings) and makes portion edits trivial (update servings_logged, display recomputes).

**Warning signs:** If you find yourself storing `total_calories` as a column, you've made editing harder than it needs to be.

### Pitfall 2: RLS — logging for another member

**What goes wrong:** An RLS policy that only allows `logged_by = auth.uid()` to insert their own logs would prevent parents logging for children.

**Why it happens:** Confusing "who is logging" (logged_by = the auth user) with "who the log is for" (member_user_id or member_profile_id).

**How to avoid:** Keep `logged_by` as the auth user (for audit). Enforce only that `logged_by = auth.uid()` and that `household_id = get_user_household_id()` on insert. The target member columns are not RLS-constrained on insert — any household member can log for any other.

**Warning signs:** Parents getting 403 when trying to log for a child profile.

### Pitfall 3: Query key scope — stale logs when switching members or dates

**What goes wrong:** If query keys don't include `memberId` and `logDate`, switching the member selector or date picker returns cached data from the previous view.

**Why it happens:** Broad query keys like `['food-logs', householdId]` don't distinguish per-member/per-date.

**How to avoid:** Use `['food-logs', householdId, logDate, memberId]` as the query key (established pattern from nutrition-target hooks).

**Warning signs:** Summary rings show wrong member's data after switching the member selector.

### Pitfall 4: PWA icons — missing PNG files crash the manifest

**What goes wrong:** The existing `vite.config.ts` references `/icon-192.png` and `/icon-512.png`, but only `favicon.svg` and `icons.svg` exist in `/public/`. The build will succeed but the PWA won't install correctly and Lighthouse will flag it.

**Why it happens:** The manifest was scaffolded in a prior phase but the actual PNG assets were never created.

**How to avoid:** Wave 0 must create both PNG icon files in `/public/` before the PWA install prompt is tested. SVG is not accepted by all browsers for PWA icons.

**Warning signs:** Chrome DevTools Application > Manifest shows icon fetch errors.

### Pitfall 5: Date handling — timezone drift on log_date

**What goes wrong:** Constructing a JavaScript `Date` from a `YYYY-MM-DD` string and calling `toLocaleDateString()` without UTC methods can shift the displayed date by one day in negative-UTC timezones.

**Why it happens:** `new Date('2026-03-13')` is interpreted as UTC midnight, which is the previous day in UTC-5.

**How to avoid:** Established project pattern (from Phase 3): use UTC methods (`getUTCDay`, `setUTCDate`) or pass date strings directly without constructing a Date object for display. Format YYYY-MM-DD dates for display by splitting on '-' rather than via Date object.

**Warning signs:** Logs from late-night entries appearing on the wrong day for users in UTC-5 and earlier.

### Pitfall 6: iOS PWA install prompt — timing

**What goes wrong:** `beforeinstallprompt` does not fire on iOS Safari at all. iOS Safari uses a manual "Add to Home Screen" flow accessible only from the Share menu.

**Why it happens:** iOS Safari does not implement the `beforeinstallprompt` event (as of 2026).

**How to avoid:** For the PWA install prompt requirement (PLAT-03), show an iOS-specific instructional banner (detect via `navigator.userAgent` + `standalone` mode check) explaining how to use "Add to Home Screen". For Chrome/Android, use the standard `beforeinstallprompt` event. Store "shown once" state in `localStorage`.

**Warning signs:** Install prompt never appears on iOS devices.

## Code Examples

Verified patterns from existing codebase:

### Inserting a food_log entry (follows useMealPlan.ts pattern)
```typescript
// src/hooks/useFoodLogs.ts
export function useInsertFoodLog() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (params: InsertFoodLogParams): Promise<FoodLog> => {
      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          household_id: membership!.household_id,
          logged_by: session!.user.id,
          ...params,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['food-logs', membership?.household_id, data.log_date, data.member_user_id ?? data.member_profile_id],
      })
    },
  })
}
```

### ProgressRing usage for daily summary (existing component)
```typescript
// Reuse — no changes needed to ProgressRing.tsx
<ProgressRing
  value={totals.calories}
  target={targets?.calories ?? 0}
  size={80}
  strokeWidth={7}
  showValue
  label="kcal"
/>
```

### Offline detection hook
```typescript
// Simple, no library needed
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return isOnline
}
```

### vite-plugin-pwa workbox configuration addition
```typescript
// vite.config.ts — add workbox key inside VitePWA({})
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* existing */ },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'html-cache',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
})
```

### iOS Add-to-Home-Screen detection
```typescript
// Detect iOS standalone mode and whether to show manual install instructions
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
const showIOSPrompt = isIOS && !isStandalone && !localStorage.getItem('pwa-prompt-shown')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Workbox CLI / CRA setup | vite-plugin-pwa | 2022+ | No separate workbox.config.js; config inline in vite.config.ts |
| beforeinstallprompt on all platforms | beforeinstallprompt (Chrome/Android) + manual iOS instructions | iOS 16.4 added basic PWA support | Must branch by platform for install prompt |
| Background Sync API for offline queuing | App-shell only; no offline writes | iOS never implemented reliably | Scope to shell-only is correct for this app's v1 |

**Deprecated/outdated:**
- Workbox window import from 'workbox-window': vite-plugin-pwa re-exports `useRegisterSW` and `VirtualModuleRegisterSW` — no direct workbox-window import needed in the app code.

## Open Questions

1. **PWA icons — design and creation**
   - What we know: PNG files must be created at 192x192 and 512x512, sage green with leaf/plate motif
   - What's unclear: Tool used to create them (design tool, code generation, placeholder)
   - Recommendation: Generate with a script or use a placeholder PNG for Wave 0 that satisfies Lighthouse, then refine. A simple `node scripts/generate-icons.js` using `canvas` or `sharp` can produce valid PNGs programmatically.

2. **Micronutrient snapshot in food_logs**
   - What we know: `nutrition_targets` stores micronutrients as `jsonb`; `custom_foods` has individual micro columns
   - What's unclear: For plan-based logs (where the source is a meal composed of meal_items), computing per-serving micro totals requires aggregating over meal_items. meal_items currently only store calories/protein/fat/carbs per-100g.
   - Recommendation: Store `micronutrients jsonb default '{}'` in food_logs. Populate it for custom foods (which have micro columns) and leave empty for USDA/OFF foods unless the data was captured. The summary collapsible section can show partial micro data with a note. This avoids blocking logging on a full micro pipeline.

3. **"Log all as planned" — meal nutrition source for snapshot**
   - What we know: Each slot's meal has meal_items with per-100g snapshot macros and quantity_grams
   - What's unclear: For the bulk log operation, must compute per-serving nutrition for each meal from its meal_items at bulk-insert time
   - Recommendation: `calcMealNutrition` already exists; treat one serving = total meal nutrition (meals are atomic units per Phase 3 decision). The bulk insert computes nutrition client-side from existing meal_items data already in the TanStack Query cache.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vite.config.ts (vitest config inline) or vitest.config.ts |
| Quick run command | `npx vitest run tests/food-logs.test.ts --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRCK-04 | calcLogEntryNutrition scales per-serving macros by servings_logged | unit | `npx vitest run tests/nutrition.test.ts -t "calcLogEntryNutrition" --reporter=verbose` | Wave 0 |
| TRCK-04 | getUnloggedSlots returns only slots without existing log | unit | `npx vitest run tests/food-logs.test.ts -t "getUnloggedSlots" --reporter=verbose` | Wave 0 |
| TRCK-06 | servings_logged update recomputes displayed totals | unit | `npx vitest run tests/nutrition.test.ts -t "calcLogEntryNutrition" --reporter=verbose` | Wave 0 |
| TRCK-07 | calcDayNutrition sums log entries correctly | unit | `npx vitest run tests/nutrition.test.ts -t "calcDayNutrition" --reporter=verbose` | exists |
| PLAT-03 | iOS/Android install prompt branch detected correctly | unit | `npx vitest run tests/food-logs.test.ts -t "install prompt" --reporter=verbose` | Wave 0 |
| PLAT-04 | useOnlineStatus returns false when navigator.onLine is false | unit | `npx vitest run tests/food-logs.test.ts -t "useOnlineStatus" --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/nutrition.test.ts tests/food-logs.test.ts --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/food-logs.test.ts` — covers TRCK-04 (getUnloggedSlots, calcLogEntryNutrition), PLAT-03 (install prompt detection), PLAT-04 (useOnlineStatus)
- [ ] `calcLogEntryNutrition` function in `src/utils/nutrition.ts` — needed before tests can run
- [ ] `getUnloggedSlots` utility in `src/utils/foodLogs.ts` or inline — needed before tests can run
- [ ] PNG icons at `public/icon-192.png` and `public/icon-512.png` — required for PWA manifest validation

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/hooks/useMealPlan.ts`, `src/hooks/useNutritionTargets.ts` — established query/mutation patterns
- Existing codebase: `supabase/migrations/008_meals_plans_targets.sql` — RLS pattern with get_user_household_id() helpers
- Existing codebase: `src/components/plan/ProgressRing.tsx` — confirmed props interface
- Existing codebase: `src/components/plan/MemberSelector.tsx` — confirmed reusability
- Existing codebase: `src/utils/nutrition.ts`, `tests/nutrition.test.ts` — confirmed calcDayNutrition, calcMealNutrition exist and are tested
- Existing codebase: `vite.config.ts` — confirmed vite-plugin-pwa already installed and manifest scaffolded
- Existing codebase: `package.json` — confirmed vite-plugin-pwa@1.2.0 with peer dep range `^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0` covering Vite 8

### Secondary (MEDIUM confidence)
- [vite-plugin-pwa generateSW docs](https://vite-pwa-org.netlify.app/workbox/generate-sw) — runtimeCaching configuration pattern
- [vite-plugin-pwa precache guide](https://vite-pwa-org.netlify.app/guide/service-worker-precache) — app shell caching approach

### Tertiary (LOW confidence — needs validation)
- [PWA on iOS 2025](https://brainhub.eu/library/pwa-on-ios) — iOS beforeinstallprompt not supported; manual "Add to Home Screen" required
- [iOS Safari PWA limitations guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — Background Sync unreliable on iOS; 50MB storage cap; data eviction risk

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used in previous phases; no new installs needed
- Architecture (data model): HIGH — follows established meal_items snapshot pattern exactly; RLS helpers confirmed in DB
- Architecture (PWA): HIGH — plugin already installed and partially configured; peer deps confirm Vite 8 compat
- Pitfalls: HIGH for timezone/query-key/RLS issues (verified against existing code); MEDIUM for iOS install prompt (multi-source web confirmation, not official Apple docs)
- Validation: HIGH — vitest already runs against existing tests; only new test file needed

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack; vite-plugin-pwa releases infrequently)
