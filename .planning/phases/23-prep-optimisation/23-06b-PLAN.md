---
phase: 23
plan: 06b
type: execute
wave: 4
depends_on: [23-01, 23-02, 23-03, 23-03b, 23-05]
files_modified:
  - src/components/cook/CookStepCard.tsx
  - src/components/cook/CookStepTimer.tsx
  - src/components/cook/MemberLaneHeader.tsx
  - src/components/cook/MultiMealSwitcher.tsx
  - src/components/cook/CookEntryPointOnRecipeDetail.tsx
  - src/components/recipe/RecipeBuilder.tsx
autonomous: true
requirements: [PREP-02]
tags: [cook-mode, ui, components, collaborative, entry-points]

must_haves:
  truths:
    - "CookStepCard renders active/inactive/completed states with check-off, timer, and member lane indicator"
    - "CookStepTimer shows countdown with warning state < 60s and done state with tabular-nums"
    - "Per-member lanes display with MemberLaneHeader sticky subheaders and reassignment via swap-owner (D-23)"
    - "MultiMealSwitcher renders pill strip with role=tablist when user has >1 active cook session (D-26)"
    - "Recipe detail page at /recipes/:id shows a Cook this recipe button that navigates to /cook/{recipeId}?source=recipe"
    - "RecipeBuilder extended with CookEntryPointOnRecipeDetail — all Plan 04 additions preserved (L-020, L-027)"
    - "tests/AppShell.test.tsx still passes — Sidebar and TabBar are NOT modified (L-021)"
  artifacts:
    - path: "src/components/cook/CookStepCard.tsx"
      provides: "Step card with active/inactive/completed states per UI-SPEC"
      contains: "border-primary"
    - path: "src/components/cook/CookStepTimer.tsx"
      provides: "Countdown timer with start/pause/reset/skip and warning states"
      contains: "tabular-nums"
    - path: "src/components/cook/MemberLaneHeader.tsx"
      provides: "Sticky subheader per member with swap-owner"
      contains: "Swap owner"
    - path: "src/components/cook/MultiMealSwitcher.tsx"
      provides: "Pill strip for concurrent session switching"
      contains: "tablist"
    - path: "src/components/cook/CookEntryPointOnRecipeDetail.tsx"
      provides: "Cook this recipe button for recipe detail page"
      contains: "Cook this recipe"
    - path: "src/components/recipe/RecipeBuilder.tsx"
      provides: "RecipeBuilder extended with CookEntryPointOnRecipeDetail"
      contains: "CookEntryPointOnRecipeDetail"
  key_links:
    - from: "CookStepCard"
      to: "useUpdateCookStep (Plan 03b)"
      via: "optimistic JSONB merge on check-off"
      pattern: "useUpdateCookStep"
    - from: "MultiMealSwitcher"
      to: "useActiveCookSessions (Plan 03b)"
      via: "hook lists all active sessions for session switching"
      pattern: "useActiveCookSessions"
---

<objective>
Build the Cook Mode step-level UI components and entry points — PREP-02 deliverable (part 2). This plan creates:
1. CookStepCard with active/inactive/completed states, check-off, timer, member lane indicators (D-19, D-23)
2. CookStepTimer with countdown display, warning at <60s, done state (D-19)
3. MemberLaneHeader sticky subheader with swap-owner (D-23)
4. MultiMealSwitcher pill strip for concurrent sessions (D-26)
5. CookEntryPointOnRecipeDetail "Cook this recipe" button (D-20b)
6. RecipeBuilder wiring of CookEntryPointOnRecipeDetail (D-20b)

Purpose: Step-level rendering components that CookModePage (Plan 06) composes. Entry points for Cook Mode from recipe detail page.

Output: Five new component files in src/components/cook/, one edit to RecipeBuilder.tsx. No route changes (those are in Plan 06).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/23-prep-optimisation/23-CONTEXT.md
@.planning/phases/23-prep-optimisation/23-RESEARCH.md
@.planning/phases/23-prep-optimisation/23-UI-SPEC.md
@.planning/phases/23-prep-optimisation/23-06-PLAN.md
@.planning/phases/23-prep-optimisation/23-03b-PLAN.md
@lessons.md
@CLAUDE.md

<interfaces>
<!-- Types from Plan 01 -->
```typescript
export interface RecipeStep {
  id: string; text: string; duration_minutes: number; is_active: boolean;
  ingredients_used: string[]; equipment: string[]
}
export interface CookSessionStepState {
  completed_at: string | null; completed_by: string | null;
  timer_started_at: string | null; owner_member_id: string | null; recipe_id: string
}
export interface CookSession {
  id: string; meal_id: string | null; recipe_ids: string[];
  step_state: { steps: Record<string, CookSessionStepState>; order: string[] };
  status: 'in_progress' | 'completed' | 'abandoned'; mode: 'combined' | 'per-recipe' | null;
  started_at: string
}
export interface Recipe {
  id: string; name: string; instructions: RecipeStep[] | null;
  freezer_friendly: boolean | null; freezer_shelf_life_weeks: number | null
}
```

<!-- CookModeShell from Plan 06 imports MultiMealSwitcher -->
// CookModeShell.tsx imports MultiMealSwitcher for top bar session switching
// CookModePage.tsx renders CookStepCard in the step list (Plan 06b provides the component)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CookStepCard, CookStepTimer, and MemberLaneHeader</name>
  <files>
    src/components/cook/CookStepCard.tsx,
    src/components/cook/CookStepTimer.tsx,
    src/components/cook/MemberLaneHeader.tsx
  </files>
  <read_first>
    - src/components/cook/CookModeShell.tsx (verify it exists from Plan 06 — check structure)
    - src/components/cook/CookStepPrimaryAction.tsx (verify it exists from Plan 06 — check interface)
    - .planning/phases/23-prep-optimisation/23-UI-SPEC.md (lines 237-295 — CookStepCard, CookStepTimer, MemberLaneHeader specs)
    - .planning/phases/23-prep-optimisation/23-UI-SPEC.md (lines 415-492 — interaction contracts for step advance, collaborative cook)
    - .planning/phases/23-prep-optimisation/23-CONTEXT.md (D-19, D-23, D-24)
    - lessons.md (L-020)
  </read_first>
  <action>
**Step 1 — Create src/components/cook/CookStepCard.tsx:**

Per UI-SPEC CookStepCard with three states: inactive (opacity-60, bg-secondary), active (border-2 border-primary, shadow-sm), completed (bg-secondary/60, line-through). Active state shows: step text, active/passive chip, ingredients_used, equipment, timer block (CookStepTimer), lane owner chip. Timer block visible when `step.duration_minutes > 0 && timerSecondsRemaining !== null`.

Props interface:
```typescript
interface CookStepCardProps {
  step: RecipeStep
  stepState: CookSessionStepState
  stepNumber: number
  isActive: boolean
  ownerName: string | null
  onCheckOff: () => void
  onTimerStart: () => void
  onTimerPause: () => void
  onTimerReset: () => void
  onTimerSkip: () => void
  onTimerComplete: () => void
  timerSecondsRemaining: number | null
  timerRunning: boolean
}
```

Completed state: step number circle bg-primary/40, text line-through text-text/40, completion timestamp right-aligned.
Inactive state: step number circle border only, text text-text/60, duration chip right-aligned.
Active state: step number circle bg-primary solid, Hands-on or Passive wait chip, ingredients and equipment lists, CookStepTimer when applicable.

**Step 2 — Create src/components/cook/CookStepTimer.tsx:**

Countdown display with `tabular-nums` font class. Warning state when `secondsRemaining <= 60` uses `text-amber-500` and `animate-pulse`. Done state shows check icon with "Done" text and `animate-bounce`. Controls: Start (when not running), Pause (when running), Reset (when paused and partially elapsed), Skip (with confirmation dialog "Skip the rest of this wait?").

**Step 3 — Create src/components/cook/MemberLaneHeader.tsx:**

Sticky subheader per member: `sticky top-[52px] bg-background/95 backdrop-blur-sm`. Shows member initial circle, uppercase name, "X of Y done" count, "Swap owner" button. Swap owner opens a dropdown picker with household members list; selecting a member calls `onSwapOwner(memberId)`.
  </action>
  <verify>
    <automated>npx tsc -b && node -e "const fs=require('fs');const files=['src/components/cook/CookStepCard.tsx','src/components/cook/CookStepTimer.tsx','src/components/cook/MemberLaneHeader.tsx'];for(const f of files){if(!fs.existsSync(f)){console.error('MISSING:',f);process.exit(1)}} const sc=fs.readFileSync(files[0],'utf8');const st=fs.readFileSync(files[1],'utf8');const ml=fs.readFileSync(files[2],'utf8'); const checks=[['card:border-primary',sc],['card:Hands-on',sc],['card:Passive wait',sc],['timer:tabular-nums',st],['timer:text-amber-500',st],['timer:Skip',st],['lane:Swap owner',ml],['lane:sticky',ml]]; for(const [k,src] of checks){if(!src.includes(k.split(':')[1])){console.error('MISSING',k);process.exit(1)}} console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/cook/CookStepCard.tsx` contains literal string `border-primary`
    - File `src/components/cook/CookStepCard.tsx` contains literal string `Hands-on`
    - File `src/components/cook/CookStepCard.tsx` contains literal string `Passive wait`
    - File `src/components/cook/CookStepCard.tsx` contains literal string `is doing this`
    - File `src/components/cook/CookStepTimer.tsx` contains literal string `tabular-nums`
    - File `src/components/cook/CookStepTimer.tsx` contains literal string `text-amber-500`
    - File `src/components/cook/CookStepTimer.tsx` contains literal string `Skip the rest of this wait?`
    - File `src/components/cook/MemberLaneHeader.tsx` contains literal string `Swap owner`
    - File `src/components/cook/MemberLaneHeader.tsx` contains literal string `sticky`
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>CookStepCard renders three states with timer and lane indicators. CookStepTimer has countdown with warning and done states. MemberLaneHeader has sticky subheader with swap-owner picker.</done>
</task>

<task type="auto">
  <name>Task 2: Create MultiMealSwitcher, CookEntryPointOnRecipeDetail, and wire RecipeBuilder</name>
  <files>
    src/components/cook/MultiMealSwitcher.tsx,
    src/components/cook/CookEntryPointOnRecipeDetail.tsx,
    src/components/recipe/RecipeBuilder.tsx
  </files>
  <read_first>
    - .planning/phases/23-prep-optimisation/23-UI-SPEC.md (lines 293-295 — MultiMealSwitcher spec)
    - .planning/phases/23-prep-optimisation/23-UI-SPEC.md (lines 326-380 — CookEntryPointOnRecipeDetail, StandaloneCookPickerPage)
    - .planning/phases/23-prep-optimisation/23-CONTEXT.md (D-20b, D-20c, D-26)
    - src/components/recipe/RecipeBuilder.tsx (FULL FILE — L-020: Edit only, preserve all existing content including Plan 04 Steps section and freezer toggle)
    - lessons.md (L-020, L-024, L-027)
  </read_first>
  <action>
**CRITICAL (L-020, L-027):** RecipeBuilder.tsx has extensive Plan 04 additions (RecipeStepsSection, RecipeFreezerToggle). Use Edit tool ONLY. Read the full file first, make a single surgical Edit.

**Step 1 — Create src/components/cook/MultiMealSwitcher.tsx:**

Per UI-SPEC MultiMealSwitcher — pill strip for concurrent sessions. Uses `role="tablist"` with `role="tab"` per pill. `aria-selected` on active pill. Each pill shows a status dot (primary for active, accent/60 for other, text/30 for completed) and label. Max width `max-w-[40vw]` with horizontal scroll.

**Step 2 — Create src/components/cook/CookEntryPointOnRecipeDetail.tsx:**

"Cook this recipe" button. Disabled with spinner when `recipe.instructions === null` (steps not yet generated). Navigates to `/cook/${recipe.id}?source=recipe`. Full width on mobile, 200px on sm+.

**Step 3 — Edit src/components/recipe/RecipeBuilder.tsx (L-020: Edit tool ONLY):**

Read the full file first. Add import: `import { CookEntryPointOnRecipeDetail } from '../cook/CookEntryPointOnRecipeDetail'`

Then find the recipe title/metadata section and add: `{recipe && <CookEntryPointOnRecipeDetail recipe={recipe} />}`

Do NOT modify any other part of RecipeBuilder. Plan 04's RecipeStepsSection, RecipeFreezerToggle, and all existing sections MUST remain untouched (L-020, L-027).

**Step 4 — Verify:**
- `npx tsc -b` exits 0
- RecipeBuilder.tsx still contains its Plan 04 additions (RecipeStepsSection, RecipeFreezerToggle)
  </action>
  <verify>
    <automated>npx tsc -b && node -e "const fs=require('fs');const files=['src/components/cook/MultiMealSwitcher.tsx','src/components/cook/CookEntryPointOnRecipeDetail.tsx'];for(const f of files){if(!fs.existsSync(f)){console.error('MISSING:',f);process.exit(1)}} const ms=fs.readFileSync(files[0],'utf8'); const ce=fs.readFileSync(files[1],'utf8'); const rb=fs.readFileSync('src/components/recipe/RecipeBuilder.tsx','utf8'); const checks=[['switcher:tablist',ms],['switcher:tab',ms],['entry:Cook this recipe',ce],['entry:Preparing steps',ce],['builder:CookEntryPointOnRecipeDetail',rb],['builder:RecipeStepsSection',rb],['builder:RecipeFreezerToggle',rb]]; for(const [k,src] of checks){if(!src.includes(k.split(':')[1])){console.error('MISSING',k);process.exit(1)}} console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/cook/MultiMealSwitcher.tsx` contains literal string `role="tablist"`
    - File `src/components/cook/MultiMealSwitcher.tsx` contains literal string `role="tab"`
    - File `src/components/cook/CookEntryPointOnRecipeDetail.tsx` contains literal string `Cook this recipe`
    - File `src/components/cook/CookEntryPointOnRecipeDetail.tsx` contains literal string `Preparing steps...`
    - File `src/components/recipe/RecipeBuilder.tsx` contains literal string `CookEntryPointOnRecipeDetail`
    - File `src/components/recipe/RecipeBuilder.tsx` still contains literal string `RecipeStepsSection` (L-020)
    - File `src/components/recipe/RecipeBuilder.tsx` still contains literal string `RecipeFreezerToggle` (L-020)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>MultiMealSwitcher provides concurrent session switching. CookEntryPointOnRecipeDetail adds Cook Mode entry from recipe detail. RecipeBuilder extended with all Plan 04 additions preserved.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Recipe.id -> navigation | CookEntryPointOnRecipeDetail navigates using recipe.id; no mutation |
| CookStepCard -> useUpdateCookStep | Check-off triggers JSONB merge; RLS enforces household isolation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-23-08b | Tampering | CookStepCard check-off JSONB patch | mitigate | RLS on cook_sessions prevents cross-household writes; optimistic update rolls back on error |
| T-23-12b | Tampering | RecipeBuilder Cook CTA navigates with recipe.id | accept | Navigation to /cook/{id} triggers a query scoped by RLS; no data mutation from navigation |
</threat_model>

<verification>
After completion:
1. `npx tsc -b` exits 0
2. `npx vite build` succeeds
3. All new component files exist in src/components/cook/
4. RecipeBuilder.tsx contains CookEntryPointOnRecipeDetail AND all Plan 04 additions
5. No modifications to Sidebar.tsx, TabBar.tsx, or MobileDrawer.tsx
6. `npx vitest run tests/AppShell.test.tsx` passes (L-021)
</verification>

<success_criteria>
- [ ] CookStepCard renders active/inactive/completed with UI-SPEC visual contract
- [ ] CookStepTimer shows countdown with warning at <60s and done state
- [ ] MemberLaneHeader sticky subheader with swap-owner (D-23)
- [ ] MultiMealSwitcher renders for concurrent sessions (D-26)
- [ ] CookEntryPointOnRecipeDetail "Cook this recipe" button on RecipeBuilder (D-20b)
- [ ] RecipeBuilder preserves all Plan 04 additions (L-020, L-027)
- [ ] AppShell nav count test passes (L-021)
- [ ] TypeScript builds clean
</success_criteria>

<output>
After completion, create `.planning/phases/23-prep-optimisation/23-06b-SUMMARY.md` documenting:
- Component APIs and props interfaces
- CookStepCard three-state rendering details
- CookStepTimer warning/done state behavior
- MemberLaneHeader swap-owner flow
- RecipeBuilder modification (what was added, what was preserved)
- Files created and modified
</output>
