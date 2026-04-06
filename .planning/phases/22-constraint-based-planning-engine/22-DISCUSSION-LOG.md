# Phase 22: Constraint-Based Planning Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 22-constraint-based-planning-engine
**Areas discussed:** Solver Architecture, Generation Trigger & UX, Nutrition Gap Analysis, Constraint Priority & Conflicts

---

## Solver Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Edge Function | Async, job ID + polling. Consistent with existing pattern | ✓ |
| Client-side solver | Web Workers, no server cost but device-constrained | |

**User's choice:** Supabase Edge Function
**Notes:** v2.0 roadmap had already decided on async Edge Function pattern

| Option | Description | Selected |
|--------|-------------|----------|
| AI generates + code verifies | LLM proposes, code checks hard constraints, loop | |
| AI per-slot | One LLM call per slot, 28+ calls | |
| AI generates + AI verifies | Both generation and verification via LLM | ✓ |

**User's choice:** AI generates + AI verifies
**Notes:** User explicitly wants "AI first approach" — AI should do both generation and verification. "This is why AI is so useful, it can match recipes with slots and constraints, and then verify it meets the needs, keep verifying and adjusting until it meets needs."

| Option | Description | Selected |
|--------|-------------|----------|
| 3 passes max | Initial + 2 corrections | |
| 5 passes max | Initial + 4 corrections | ✓ |
| Until clean or timeout | Dynamic, unpredictable cost | |

**User's choice:** 5 passes max

| Option | Description | Selected |
|--------|-------------|----------|
| 10 seconds | Fast, responsive | ✓ |
| 30 seconds | More optimisation room | |
| 60 seconds | Full minute, risk abandonment | |

**User's choice:** 10 seconds max

| Option | Description | Selected |
|--------|-------------|----------|
| Claude API | Haiku/Sonnet, consistent with Anthropic ecosystem | ✓ |
| OpenAI API | GPT-4o-mini/GPT-4o | |
| You decide | Claude picks provider | |

**User's choice:** Claude API

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-filter then send | Code pre-filters ~50 candidates | |
| Send all recipes | Full catalog to AI | |
| Two-stage: AI shortlists then plans | First call picks ~30, second assigns | ✓ |

**User's choice:** Two-stage approach

---

## Generation Trigger & UX

| Option | Description | Selected |
|--------|-------------|----------|
| "Generate Plan" button | Prominent button, user controls timing | ✓ |
| Auto-generate on new week | Auto-trigger with confirmation | |
| Both options | Auto-suggest + manual button | |

**User's choice:** Generate Plan button

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton slots + progress bar | Shimmer + step indicators | ✓ |
| Modal overlay with status | Full-screen blocking overlay | |
| Toast + background | Lightweight toast notification | |

**User's choice:** Skeleton slots + progress bar

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fill slots directly | Meals appear immediately | ✓ |
| Review-first modal | Preview before committing | |
| Fill with 'suggested' badge | Distinct visual for AI slots | |

**User's choice:** Auto-fill directly

| Option | Description | Selected |
|--------|-------------|----------|
| Both full and per-slot | Full regenerate + per-slot suggestions | ✓ |
| Full plan only | Always re-solve entire plan | |
| Per-slot only | One slot at a time | |

**User's choice:** Both full and per-slot

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite unlocked, skip locked | Lock = keep rule | ✓ |
| Prompt per occupied slot | Ask per slot | |
| Keep all occupied slots | Only fill empty | |

**User's choice:** Overwrite unlocked, skip locked

| Option | Description | Selected |
|--------|-------------|----------|
| App-level shared key | Single key, rate limiting | ✓ |
| User brings own key | Per-household keys | |

**User's choice:** App-level shared key

---

## Nutrition Gap Analysis

| Option | Description | Selected |
|--------|-------------|----------|
| Per-member summary card | Collapsible section below grid | ✓ |
| Inline per-day indicators | Green/amber/red dots per day | |
| Dedicated analysis page | Separate page | |

**User's choice:** Per-member summary card

| Option | Description | Selected |
|--------|-------------|----------|
| AI suggests swaps inline | Specific swap with improvement numbers | ✓ |
| Manual swap with AI hints | User opens slot, sees ranked alternatives | |
| Auto-fix option | One-click AI gap closer | |

**User's choice:** AI suggests swaps inline

| Option | Description | Selected |
|--------|-------------|----------|
| Below 80% of target | Matches existing hasMacroWarning | |
| Below 90% of target | Stricter, flags more | ✓ |
| You decide | Claude picks threshold | |

**User's choice:** Below 90% of target

---

## Constraint Priority & Conflicts

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered hard/soft system | Hard: allergies, locks, away. Soft: nutrition, budget, etc. | ✓ |
| All soft with weights | Everything weighted, even allergies | |
| User configures per constraint | Toggle hard/soft per constraint | |

**User's choice:** Tiered system

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed priority order | Safety > Schedule > Nutrition > Preferences > Budget > Inventory | |
| User-adjustable sliders | Priority sliders in settings | ✓ |
| AI decides per household | Inferred from patterns | |

**User's choice:** User-adjustable (but as rank ordering, not numeric sliders)

| Option | Description | Selected |
|--------|-------------|----------|
| Simple rank ordering | Drag to reorder priorities | ✓ |
| Numeric weight sliders | 0-100 per priority | |
| Preset profiles | Named presets like "Health first" | |

**User's choice:** Simple rank ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Plan page sidebar/section | Next to Generate button | ✓ |
| Household settings page | Set once in settings | |
| Both with sync | Defaults in settings, overrides on Plan page | |

**User's choice:** Plan page section

| Option | Description | Selected |
|--------|-------------|----------|
| Brief reason per slot | Short AI rationale on tap/hover | ✓ |
| No explanations | Silent fills | |
| Full reasoning log | Detailed generation log | |

**User's choice:** Brief reason per slot

| Option | Description | Selected |
|--------|-------------|----------|
| Generate with repeats + warning | Repeat recipes, nudge to add more | |
| Block generation below threshold | Require minimum recipes | |
| Suggest public/example recipes | AI suggests recipes to add | ✓ |

**User's choice:** Suggest recipes to add (confirmed in-scope for Phase 22)

| Option | Description | Selected |
|--------|-------------|----------|
| Match complexity to schedule | Prep→complex, quick→simple, consume→batch-prepped | ✓ |
| Schedule as availability only | Only determines IF a slot gets a meal | |
| You decide | Claude determines depth | |

**User's choice:** Match complexity to schedule

| Option | Description | Selected |
|--------|-------------|----------|
| Store job metadata only | Job ID, timestamp, constraints, pass count, score | ✓ |
| Store full AI conversation | All prompts/responses | |
| No persistence | Ephemeral | |

**User's choice:** Store job metadata only

---

## Claude's Discretion

- Exact Claude model selection per call (Haiku vs Sonnet)
- LLM prompt design for generation and verification passes
- Rate limiting implementation details
- Job polling mechanism (WebSocket vs interval)
- Progress step granularity and animations
- plan_generations table schema and RLS
- AI rationale storage and display format
- Recipe suggestion format and add flow
- Priority reorder UI details
- Edge Function error handling

## Deferred Ideas

None — discussion stayed within phase scope
