---
created: 2026-04-24
topic: v2.0 UI refresh — Gazette edition — handover to next session
status: IN PROGRESS — foundation shipped, pages NOT yet transformed (paint-job only)
user_verdict: "It looks like the old version with a new coat of paint, not an upgrade I imagined."
next_session_directive: "Actually upgrade the UI with what is delivered from the mockup, even if it changes things or adds elements. We can add those to the next milestone if needed."
---

# v2.0 UI Refresh — Handover (session boundary)

**Read this file FIRST before doing anything else in the next session.**

## TL;DR

1. User commissioned a UI refresh via Claude Design skill. Bundle arrived at `C:\Claude\nourishplan-handoff\nourishplan\` — deep-teal newsprint "Sunday Supper Gazette" aesthetic. See bundle inventory below.
2. Prior session shipped **3 commits** (foundation tokens + Icon component + nav chrome). See commit list below.
3. User rejected result: **"looks like the old version with a new coat of paint, not an upgrade I imagined."** Paint-only was wrong — user wants the full editorial newsprint transformation from the mockup, including layout changes and new elements.
4. **Mobile bug found by user:** On `/plan` at mobile viewport, the Plan menu (hamburger / More button / something — user said "Plan menu button does not work, it just stretches across the top of the screen"). Investigate early next session.
5. User explicitly said: **"We can add those to the next milestone if needed"** — meaning it's OK to ship things in scope for a follow-up milestone rather than cramming everything in.

## What's Done (landed on `main`, not pushed to origin, not deployed)

```
ec2c5e4 feat(ui): Gazette-style Sidebar + TabBar + MobileDrawer (v2.0 UI refresh 3/3)
cb05efc feat(ui): add Icon component with 38 thin-stroke line glyphs (v2.0 UI refresh 2/3)
ef85add feat(ui): apply Gazette design tokens + typography trio (v2.0 UI refresh 1/3)
```

### Commit 1 (`ef85add`) — Foundation tokens
- `src/styles/global.css` — full rewrite. Token names preserved (`--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-background`, `--color-surface`) but VALUES swapped to Gazette palette (deep teal paper, off-white ink, tomato accent, chartreuse/butter/plum/sky/leaf riso stack). Added expanded riso stack (`--color-tomato`, `--color-butter`, etc.) + raw `:root` CSS vars (`--paper`, `--ink`, `--rule-c`, `--tomato-deep`, etc.). Added 30+ utility classes: `.paper`, `.nameplate`, `.subhead`, `.story-head`, `.section-head`, `.eyebrow`, `.serif`, `.serif-italic`, `.mono`, `.tnum`, `.rule`, `.rule-soft`, `.rule-dashed`, `.rule-double`, `.rule-triple`, `.gz-btn`, `.gz-btn-primary`, `.gz-btn-chart`, `.gz-btn-sm`, `.gz-btn-ghost`, `.chip`, `.chip-{tomato|butter|chart|plum|sky|leaf}`, `.stamp`, `.stamp-small`, `.stamp-chart`, `.nbar`, `.ntrack`, `.nfill`, `.ntick`, `.pip`, `.pip.warn`, `.pip.danger`, `.avatar` (+ 5 color variants), `.drop-cap`, `.folio`, `.menu-pop`. Dark mode via `.dark` class deepens paper to `#1a1a1a`.
- `index.html` — added Google Fonts stylesheet link (Fraunces ital+opsz, JetBrains Mono 400-600, Inter 300-600). Splash screen restyled: sage `#A8C5A0` → teal `#0f3b3a`, italic Fraunces "Nourish·plan" logo with tomato middle-dot, mono butter-yellow "The Sunday Supper Gazette" tagline.
- Fonts: `--font-sans: "Inter"`, `--font-serif`/`--font-display: "Fraunces"`, `--font-mono: "JetBrains Mono"`. Removed `Nunito Variable`.
- `--radius-card: 0px`, `--radius-btn: 0px` (Gazette is sharp).

### Commit 2 (`cb05efc`) — Icon component
- `src/components/Icon.tsx` — new file, 38 thin-stroke 24×24 SVG glyphs with `stroke="currentColor"`, `fill="none"`, `strokeWidth: 1.5`, round caps. Ported from bundle's `icons.jsx`. Typed `IconName` union. Names: home, book, plate, calendar, box, cart, chart, users, gear, compass, search, plus, minus, lock, unlock, flame, pot, clock, grip, more, check, x, arrow-right, arrow-down, pantry, fridge, freezer, leaf, tag, link, copy, edit, crown, asterisk, command, bell, sun, moon, door.

### Commit 3 (`ec2c5e4`) — Nav chrome
- `src/components/layout/Sidebar.tsx` — rewrote. Italic Fraunces "Nourish·plan" logo + mono "THE SUNDAY SUPPER GAZETTE" tagline + household name. Grouped nav: DAILY (Home/Recipes/Meals), WORKBENCH (Plan/Inventory/Grocery), LEDGER (Insights/Household/Settings/User Guide). Active = tomato bg + `→` left-arrow + mono 01-10 numeral. Dashed right edge. Sign-out uses Icon `door` glyph. Kept `sr-only span` with text "NourishPlan" so existing `tests/AppShell.test.tsx` assertions still pass.
- `src/components/layout/TabBar.tsx` — 4-cell grid (Home/Recipes/Plan/More). Active = tomato text + tomato dot positioned absolute at bottom. Icons now SVG.
- `src/components/layout/MobileDrawer.tsx` — Gazette masthead, numbered drawer items (03/05/06/07/08/09/10), tomato active rows.

**Tests passing:** `tests/AppShell` 5/5, `tests/CookModePage` 27/27, `npx tsc --noEmit` clean.

## User's Verdict — Why the Paint-Job Fell Short

User quote: _"It looks like the old version with a new coat of paint, not an upgrade I imagined. Please you need to actually upgrade the UI with what is delivered from the mockup, even if it changes things or adds elements, we can add those to the next milestone if needed."_

The paint-job kept every existing page's **structure** and **components** intact — the ProgressRings on HomePage, the boxed DayCards on PlanPage, the tabbed InventoryList, the flat GroceryList, the MemberList on HouseholdPage — only the colors/fonts changed. The mockup was never about palette. It was about **editorial newsprint layout grammar**: mastheads, section-heads with big italic tomato numerals, drop caps, ruled (not boxed) grids, hatched nutrition bars with target ticks, ticket-stub budget strips, rotated stamps ("LEFTOVER"), folios, marginalia columns.

**The next session must transform the pages, not just re-skin them.** This means rewriting each page's JSX to match the bundle's screen files, keeping data-binding + hooks intact, but replacing the component tree with the editorial patterns.

## Bug Reported by User (verify + fix early)

> "The plan menu button does not work in mobile, it just stretches across the top of the screen."

Likely locations:
- `src/components/plan/PlanGrid.tsx` has top-bar controls (Generate Plan, Batch prep, Save/Load template, Planning priorities, Recipe mix collapsibles, Previous/Next week)
- `src/pages/PlanPage.tsx` — check for a hamburger / overflow / "More options" button
- The issue may be that the `md:` breakpoint on some flex-row or grid is hiding or stretching an element incorrectly on `< 768px`

Verify with Playwright MCP: navigate to `/plan` at 390×844 viewport, snapshot, compare to `C:\Claude\nourishplan-handoff\nourishplan\project\refs\plan-current.png` or the bundle's mobile plan screen.

## Bundle — Where Everything Is

Extracted at: `C:\Claude\nourishplan-handoff\nourishplan\`

```
nourishplan/
├── README.md                          ← CONTRACT. Read first every time.
├── chats/
│   └── chat1.md                       ← IMPORTANT: design direction reversed mid-chat.
│                                         Original prompt was editorial/cream/minimal.
│                                         User rejected it. Designer flipped to "Gazette"
│                                         direction. Final chat message is the source of truth.
└── project/
    ├── Nourishplan v2.0.html          ← Entry point. Mounts DesignCanvas with 5 screens × mobile+desktop.
    ├── styles.css                      ← Full Gazette design system CSS (800+ lines).
    ├── icons.jsx                       ← 38 thin-stroke SVG icons (already ported).
    ├── shared.jsx                      ← HOUSEHOLD + NUTRITION + DAYS + MEALS + SLOTS + INVENTORY + GROCERY + NAV data + Rule/Chip/TagPip/Sidebar/MobileStatus/MobileTabBar/StoryHead/SectionHead components.
    ├── screen-home.jsx                 ← Home screen React component (~260 lines).
    ├── screen-plan.jsx                 ← Plan screen — HIGHEST PRIORITY (user flagged mobile bug + most complex).
    ├── screen-inventory.jsx            ← Inventory tabs + ledger + leftover highlight.
    ├── screen-grocery.jsx              ← Aisle sections + receipt sidebar + check-off.
    ├── screen-household.jsx            ← Member ledger + admin badges + overflow menu + invite block.
    ├── screens-home.jsx etc.           ← Intermediate iterations — ignore, read screen-*.jsx instead.
    ├── chrome.jsx / design-canvas.jsx / tweaks-panel.jsx  ← Prototype framework, NOT app code.
    └── refs/
        ├── home-current.png, home-dark.png     ← Current app screenshots (pre-refresh state)
        ├── plan-current.png, plan-dark.png, plan-budget.png, plan-generated.png, plan-gen2.png
        ├── inventory-dark.png
        ├── grocery-current.png, grocery-mobile.png
        └── mobile-drawer.png
```

**To understand any screen:** read `screen-<name>.jsx` top to bottom (each is ~200-400 lines). The JSX directly spells out the editorial structure — copy it, adapt data-binding to real hooks.

## Key Design Grammar Patterns (from bundle)

These are what the next session should port. Each maps to utility classes already shipped in `global.css`.

### 1. Nameplate (top of page masthead)
```
<div className="nameplate">
  <div className="left">Thursday · 24 April 2026 · №1,148</div>
  <div className="title">Nourish<span className="amp">&amp;</span>plan</div>
  <div className="right">The Sunday Supper Gazette</div>
</div>
```
With `subhead` row below showing weather/quote/week number. Only on HomePage per bundle.

### 2. StoryHead (per-page headline)
```
<div className="story-head">
  <div>
    <div className="kicker">FRONT PAGE · 01 — THE DAILY</div>
    <div className="headline">The day, <em>so far.</em></div>
  </div>
  <div className="byline">Filed by Ada\n1,420 of 1,980 kcal</div>
</div>
```
Italic Fraunces 52px headline, tomato `<em>` accent. `.sm` modifier for mobile.

### 3. SectionHead (within-page numbered sections)
```
<div className="section-head">
  <span className="no">§01</span>
  <span className="label">The Ledger of the Day</span>
  <span className="aux">72% to target</span>
</div>
```
Big (42px) italic tomato "§01" numeral. Italic Fraunces label. Mono uppercase aux.

### 4. Nutrition bars (replaces ProgressRing)
```
<div className="nbar">
  <span className="nlabel">CAL</span>
  <div className="ntrack">
    <div className="nfill" style={{ width: `${pct}%` }}/>
    <div className="ntick" style={{ left: "100%" }}/>
  </div>
  <span className="nvals tnum">1420<span className="of"> / 1980 kcal</span></span>
</div>
```
Hatched 45° chartreuse fill, tomato 3px target tick. Dashed separator between rows.

### 5. Plan grid (replaces boxed DayCards)
- 7 day columns × 4 meal rows
- `ghead` column headers with `today` column tomato bg
- `gmeal-label` first column with big italic tomato roman numerals (i., ii., iii., iv.)
- `gcell` cells with dashed rules between, `today-col` gets tomato `rgba(240,78,43,0.06)` tint
- `slot` items draggable, `slot.empty` shows italic Fraunces "+ …" placeholder

### 6. Budget strip (replaces BudgetSummarySection)
- 4-column ticket-stub: Weekly Cap / Spent / Remaining / To Spend Per Meal
- Perforated dashed vertical rules
- Italic Fraunces 32px numerals, mono `of` suffix for denominators

### 7. Inventory tabs
- Pantry / Fridge / Freezer tabs with count `.n` suffix
- "Using soon" urgent band at top with tomato pip
- Numbered ledger rows (01, 02, ...) — list-row pattern with primary/sub
- Leftover rows get the rotated `stamp` "LEFTOVER" overlay

### 8. Grocery aisle sections
- Aisle jump-bar at top (anchor nav)
- Each aisle = section-head with numbered `§`
- Check-off with `.check` + `.check.on` (tomato fill)
- "Already Have 1 ▼" collapse section
- Running-total receipt sidebar (desktop only)

### 9. Household member ledger
- Member rows with avatar (5 color variants) + Admin/Member chip
- Admin actions: Promote/Demote/Remove via `.menu-pop` popover (tomato 4px offset shadow)
- Invite block: token + `.seg` role selector + copy-link button

### 10. Decorative elements
- `.stamp` — rotated italic tomato border badges ("LEFTOVER", "USE SOON", "AWAY")
- `.drop-cap` — italic tomato Fraunces 64px first-letter on lead paragraphs
- `.folio` — page footer band with page numbers + tagline
- Marginalia column on Home/Grocery/Household — small editorial asides in serif-italic

## Recommended Plan for Next Session

### Step 1: Verify handover + confirm direction (5 min)
- Read this file.
- Read `C:\Claude\nourishplan-handoff\nourishplan\README.md` (bundle contract).
- Read `C:\Claude\nourishplan-handoff\nourishplan\chats\chat1.md` (design direction).
- Confirm with user: "I'll rewrite page bodies to match the bundle's screen-*.jsx files, not just re-skin. Start with Plan (fixes mobile bug + highest complexity)?"

### Step 2: Fix Plan mobile bug (30 min)
- Navigate Playwright to `http://localhost:5173/plan` at 390×844
- Snapshot + compare to reality
- Identify the stretching element; likely a flex/grid breakpoint issue
- Fix + commit

### Step 3: Plan page rewrite (biggest payoff) (2-3 hours)
Replace `src/components/plan/PlanGrid.tsx` + `src/components/plan/DayCard.tsx` + `src/components/plan/SlotCard.tsx` with Gazette patterns:
- Add StoryHead at top (kicker "04 — PLAN · THE WEEK", headline italic)
- Replace boxed DayCards with ruled 7×4 grid using `.plan-grid` CSS
- Replace slot cards with `.slot` pattern (serif title + mono meta + chip tags)
- Replace budget section with `.budget-strip` ticket stub
- Keep all data-binding: `useMealPlan`, `useGeneratePlan`, `useSchedule`, `useWeeklySpend`, dnd-kit, is_locked preservation, etc.
- Use bundle's `screen-plan.jsx` as JSX reference (~400 lines)

### Step 4: Home page rewrite (1-2 hours)
Replace `src/pages/HomePage.tsx` JSX:
- Optional top nameplate (mobile gets `.nameplate.sm`, desktop gets full)
- StoryHead "01 — THE DAILY"
- 3-col editorial layout (desktop): col 1 nutrition `.nbar` + drop-cap lead + footnote; col 2 log-food search + today's journal; col 3 marginalia (tonight's cook + inventory pulse)
- Replace `<ProgressRing>` with `.nbar` pattern
- Keep all hooks: `useFoodLogs`, `useCreateFoodLog`, `useInventoryItems`, `useDailySummary`, etc.
- Bundle reference: `screen-home.jsx` (~260 lines)

### Step 5: Inventory / Grocery / Household rewrites (2-3 hours each)
Same pattern. Reference `screen-inventory.jsx`, `screen-grocery.jsx`, `screen-household.jsx`.

### Step 6: Optional per-milestone extras
Per user: "we can add those to the next milestone if needed". If the scope balloons, stop at a natural boundary and open a **v2.1 UI Refresh milestone** via `/gsd-new-milestone`. Phase names could be:
- Phase 31: Plan + Home editorial rewrite
- Phase 32: Inventory + Grocery editorial rewrite  
- Phase 33: Household + Settings editorial rewrite
- Phase 34: Recipes + Meals + Insights + Guide editorial rewrite
- Phase 35: Auth page + splash + marketing polish

## What NOT To Touch (risk control)

- Query hooks (`useFoodLogs`, `useMealPlan`, `useInventoryItems`, `useGenerateGroceryList`, `useSchedule`, etc.) — data-binding is verified through 30 phases of v2.0 work. Preserve call sites.
- Route definitions in `src/App.tsx` — keep all 10 routes.
- Supabase migrations, edge functions, any `supabase/` content.
- Any file in `.planning/phases/**/*-VERIFICATION.md` or `*-SUMMARY.md` — those are archived history.
- The token NAMES in `src/styles/global.css` `@theme` block (`--color-primary`, `--color-secondary`, etc.) — 200+ usages across 60 files depend on these names. Values are fine to tweak further; names are load-bearing.
- `tests/AppShell.test.tsx` expects `NourishPlan` (no dot) to appear in Sidebar — the `sr-only` span handles this; keep it.
- Existing regression tests (`tests/PlanGrid.schedule.test.tsx`, `tests/CookModePage.prepSequence.test.tsx`, `tests/e2e/household-permissions.spec.ts`) — MUST pass before any commit. Run: `npx vitest run tests/PlanGrid.schedule tests/CookModePage`.

## State at handover

- **Branch:** `main`, 3 UI commits ahead of `origin/main`
- **Dev server:** likely still running at `http://localhost:5173` (background bash `bisxtciit` via Vite)
- **Tests:** all Green except pre-existing 13 baseline flakes in AuthContext (documented in audit, not introduced by this work)
- **Prod:** `nourishplan.gregok.ca` still on commit `44abc34` (pre-UI-refresh). Current UI work is NOT deployed.
- **Milestone state:** v2.0 archived (tag `v2.0` pushed to GitHub). These UI commits are post-v2.0 and belong in a future v2.1+ milestone.
- **Handoff bundle:** `C:\Claude\nourishplan-handoff\nourishplan\` (not in git; keep until v2.1 UI milestone closes).

## Screenshots for Reference

These were captured during the paint-job session for comparison:
- `.playwright-mcp/gazette-home-desktop-3.png` — Sidebar Gazette look working, body still old structure
- `.playwright-mcp/gazette-plan-desktop.png` — Plan page, desktop
- `.playwright-mcp/gazette-home-mobile.png` — Mobile, showing old ProgressRings + new TabBar

## Quick Start Commands for Next Session

```bash
# First — read the bundle contract
cat C:/Claude/nourishplan-handoff/nourishplan/README.md
cat C:/Claude/nourishplan-handoff/nourishplan/chats/chat1.md

# Start dev server if not running
npx vite --port 5173 &

# Pick a screen to rewrite, e.g., Plan
cat C:/Claude/nourishplan-handoff/nourishplan/project/screen-plan.jsx
cat C:/Claude/nourishplan-handoff/nourishplan/project/shared.jsx  # has StoryHead, SectionHead

# After each page rewrite, run:
npx tsc --noEmit
npx vitest run tests/AppShell tests/PlanGrid.schedule tests/CookModePage
```

## Final Note to Future Claude

The user is thoughtful and specific. They waited through 3 commits of paint-only and then told me directly it wasn't what they wanted. That feedback was a gift. Don't make the same mistake twice.

**The mockup is the spec.** Rewrite the JSX to match it — even if that means deleting components and rebuilding, changing props, adding new subcomponents like `<StoryHead>`, `<SectionHead>`, `<NutritionBar>`, `<RuledPlanGrid>`, `<BudgetStrip>`, `<AisleSection>`, `<MemberLedger>`. The token foundation + Icon library + nav chrome are already in place, so the rewrite has a solid base. Start with Plan (mobile bug + highest complexity), get one page RIGHT end-to-end, show it to the user, then fan out.

If the user says "better but not quite", iterate on that one page before moving on. Don't batch-rewrite all 5 screens and then discover the patterns were wrong.

---
*Handover written 2026-04-24. Context at ~70% at time of writing. Next session: read this top to bottom, confirm direction with user, proceed.*
