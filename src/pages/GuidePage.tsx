import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Nameplate, StoryHead, SectionHead, Rule } from '../components/editorial'

interface GuideSection {
  id: string
  title: string
  intro: string
  steps: string[]
  tips?: string[]
}

const QUICK_START_STEPS = [
  'Create your account and household, and invite your family from the Household page.',
  'Teach it your reality: set each member\'s nutrition targets, dietary restrictions, weekly schedule, and the household budget.',
  'Stock the cookbook — tap ✨ Discover on the Recipes page for suggestions matched to your tastes, import favourites from the web, or build your own.',
  'Compose the week on the Plan page: pick the recipes you\'re excited about, lock them, then Generate Plan to fill the rest within your constraints.',
  'Shop from the auto-built grocery list, cook with Cook Mode, and rate meals — every rating makes next week\'s plan smarter.',
]

const WEEKLY_LOOP = [
  {
    step: 'Stock',
    detail: 'Keep the cookbook alive. Discover AI suggestions tuned to your tastes, import from blogs or videos, build your own. Aim for 7+ recipes per meal slot so no week has to repeat itself.',
  },
  {
    step: 'Compose',
    detail: 'Pick the meals you\'re genuinely excited to eat and lock them into the week. Then let Generate Plan fill the remaining slots against everyone\'s targets, schedules, and the budget.',
  },
  {
    step: 'Shop',
    detail: 'One grocery list, built from the plan, minus what\'s already in the pantry, sorted by aisle, synced live across the household.',
  },
  {
    step: 'Cook',
    detail: 'Cook Mode walks the steps with timers. Finishing deducts ingredients from inventory, logs the spend, and offers to save leftovers — bookkeeping as a side effect of dinner.',
  },
  {
    step: 'Rate',
    detail: 'One tap after eating. Ratings sort recipes into Favorites, Liked, and Novel tiers — the planner\'s memory of what your family actually loves.',
  },
]

interface OutcomePlay {
  goal: string
  promise: string
  plays: string[]
}

const OUTCOME_PLAYS: OutcomePlay[] = [
  {
    goal: 'Eat well',
    promise: 'One dinner, four right answers. The plan is composed against every member\'s targets, so healthy stops being a separate menu.',
    plays: [
      'Set honest targets per person — a 9-year-old and an adult should not share calorie or protein numbers. Targets live on each member\'s page.',
      'Record restrictions and won\'t-eats per member, then trust the generator: it treats allergies as law and dislikes as strong preferences, so healthy food that actually gets eaten wins over perfect food that doesn\'t.',
      'After generating, act on the Nutrition Gaps card — it names who is short on what and offers one-tap swaps.',
      'Keep breakfast and snack supply stocked (Discover or Fill gaps). Thin slots are how weeks drift into heavy, repetitive dinners.',
      'Log real portions on Today and glance at the micronutrient breakdown a couple of times a week — patterns show up fast.',
    ],
  },
  {
    goal: 'Be healthy',
    promise: 'Personal goals you don\'t have to think about at 6pm. Same family dinner, personal portions — everyone works toward their own targets without separate meals or willpower architecture.',
    plays: [
      'Set calorie and protein targets that match each person\'s goals — growing kids, maintenance, or a gentler intake for someone working toward a change. NourishPlan deliberately doesn\'t compute this for you — use any TDEE calculator or ask a professional, then enter the numbers.',
      'Let portion suggestions size your plate. Every planned meal suggests an amount per member from their own targets — different goals, same dinner table.',
      'Log everything, especially snacks, when you eat it. The rings tell you the truth by mid-afternoon — adjust tonight\'s portion, not the whole plan.',
      'Never let hungry-you decide dinner. That\'s the plan\'s job: Sunday-you already composed a week that fits everyone\'s targets.',
      'Rate filling, high-protein meals up. Favorites drift toward what satisfies, and generated weeks quietly get easier to stick to.',
      'Check in monthly: if progress toward a goal stalls despite honest logging, adjust that member\'s targets slightly and regenerate.',
    ],
  },
  {
    goal: 'Save money',
    promise: 'The plan starts from what you already own and ends at a list you actually stick to. Takeout is expensive improvisation — the plan removes the improvising.',
    plays: [
      'Inventory first: keep a rough picture of pantry, fridge, and freezer. Use-up badges push expiring food into the plan instead of the bin.',
      'Price your ~20 staples once. Cost per serving appears on recipes, and the generator leans cheaper when the budget is tight.',
      'Set the weekly purse and watch the per-meal pace on the Plan page — drift shows up on Tuesday, not at month-end.',
      'Shop only the generated list. It already subtracted your inventory; everything added at the store is impulse by definition.',
      'Cook doubles of freezer-friendly recipes on your Prep day — cheaper per serving, and the freezer becomes your defence against the takeout night.',
      'Treat leftovers as planned lunches, not accidents: save the leftover portion after cooking and schedule it into tomorrow.',
    ],
  },
]

const OPERATING_RHYTHM = [
  {
    when: 'Sunday · 20 minutes',
    what: 'The planning ritual: a 5-minute Discover pass with the family (let the kids pick a card), fill and lock the meals you\'re excited about, Generate Plan, skim the Gaps card and the purse, regenerate the grocery list. Week solved.',
  },
  {
    when: 'Daily · 2 minutes',
    what: 'Log food when you eat it. Cook from the slot so inventory and spend track themselves. Rate dinner with one tap — it\'s the single highest-leverage habit in the app.',
  },
  {
    when: 'Monthly · 10 minutes',
    what: 'Review: are targets still right? Goals on track? Purse realistic? Prune won\'t-eats that changed, top up thin slots with Fill gaps, and retire recipes nobody rates above 3.',
  },
]

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    intro: 'One household, one shared plan, personal portions for everyone. Setup is mostly about teaching NourishPlan your family\'s constraints — it pays off every week after.',
    steps: [
      'Sign up, then create your household — give it a name and you become its admin.',
      'Invite family members from the Household page by sharing the invite link.',
      'Add managed profiles for children or anyone who won\'t log in themselves — they still get their own targets and portions.',
      'Set each member\'s nutrition targets (calories, protein, carbs, fat) from the Household page — tap a member to open their targets.',
      'Record dietary restrictions and won\'t-eat foods for each member — the planner treats allergies as hard rules and dislikes as strong preferences.',
      'Set each member\'s weekly schedule on the Plan page (who\'s home for which meals) and the weekly budget — both become constraints the planner respects.',
    ],
    tips: [
      'Tip: You don\'t have to finish setup before using the app. Start anywhere — the plan ties it together.',
    ],
  },
  {
    id: 'discover',
    title: 'Discovering Recipes',
    intro: 'The cookbook is the planner\'s pantry of ideas — the more good options it holds, the better your weeks get. Discover is the fastest way to stock it with meals your family will actually want.',
    steps: [
      'Head to the Recipes page and tap "✨ Discover".',
      'Type what you\'re in the mood for — "cozy soups", "high-protein, kid-friendly", "15-minute dinners" — and optionally pick a meal slot.',
      'Tap "Suggest recipes". Suggestions are tailored to your household: they respect dietary restrictions and allergies, avoid won\'t-eat foods, lean toward the tastes of your highly-rated recipes, and never duplicate what you already have.',
      'Each card shows why the family will love it, per-serving calories and macros, and an expandable ingredient list.',
      'Tap "+ Add to book" on anything that sparks something — it lands in your cookbook tagged with the right meal slot, ready to plan.',
      'Not feeling the batch? "Suggest more" or change the craving and go again.',
      'For coverage rather than inspiration, use "Fill recipe gaps" instead — it finds under-stocked meal slots and generates enough slot-appropriate recipes to fill a week.',
    ],
    tips: [
      'Tip: Do a Discover pass before planning each week — adding two or three exciting recipes keeps the rotation fresh and gives the generator better material.',
    ],
  },
  {
    id: 'recipe-import',
    title: 'Importing a Recipe',
    intro: 'Found something online? Paste a URL or raw text and NourishPlan extracts the name, servings, ingredients with nutrition, steps, and meal slot for you.',
    steps: [
      'Head to the Recipes page and tap "Import recipe".',
      'Paste a blog URL, a YouTube cooking video URL, or raw recipe text.',
      'Tap "Import" — the recipe opens in the builder ready to review and adjust.',
      'If a site blocks automated fetching, copy the recipe text from the page and paste that instead — raw text is the most reliable path.',
      'Imported recipes keep a link back to their source URL when one was provided.',
    ],
    tips: [
      'Tip: Raw text paste works for anything you can copy — DMs, PDFs, a grandmother\'s hand-typed classic.',
    ],
  },
  {
    id: 'recipes',
    title: 'Building Recipes',
    intro: 'Recipes are where nutrition, cost, and planning meet: ingredients carry per-100g macros, so every recipe knows its per-serving numbers, and every plan built from it knows them too.',
    steps: [
      'On the Recipes page, tap "+ New recipe", then name it and set the servings.',
      'Add ingredients by searching the USDA and Canadian food databases, your custom foods, or your other recipes (a sauce can be an ingredient).',
      'Set each ingredient\'s quantity — per-serving nutrition updates as you go.',
      'Set the meal slots this recipe fits (Breakfast, Lunch, Dinner, Snacks) so the planner places it sensibly.',
      'Add notes or let the AI generate structured cooking steps for Cook Mode.',
      'Mark freezer-friendly recipes — batch-prep suggestions and leftover handling use it.',
    ],
    tips: [
      'Tip: Enter an ingredient\'s price once and it\'s remembered — recipe cost per serving and the weekly budget both build on it.',
    ],
  },
  {
    id: 'adding-foods',
    title: 'Adding Foods',
    intro: 'The food library underpins everything: recipes are made of foods, and foods carry the nutrition data. Search two national databases or add your own.',
    steps: [
      'Open food search from the Today page search bar, or from any ingredient picker.',
      'Type a name to search the USDA and CNF (Canadian Nutrient File) databases at once.',
      'Tap a result to see nutrition details and add it.',
      'For branded or homemade items, switch to "My Foods" and tap "Add Custom Food" — name, serving size, and macros.',
    ],
    tips: [
      'Tip: Custom foods are shared with your whole household, so everyone can build recipes with them.',
    ],
  },
  {
    id: 'meal-plan',
    title: 'Composing the Week',
    intro: 'This is the heart of NourishPlan. The Plan page holds one shared weekly grid — days across, meal slots down. Your job is to bring the excitement; the generator\'s job is to make the whole week add up.',
    steps: [
      'Head to the Plan page and start the week: fresh, repeat last week, or from a saved template.',
      'Tap "+ add" on any slot to open the recipe picker — search by name, with recipes that fit the slot listed first and per-serving calories and macros on every row.',
      'Fill the slots you already have opinions about — the Sunday roast, taco Tuesday — and tap the lock badge on each so generation can\'t touch them.',
      'Expand the Recipe Mix panel if you want to steer the balance of Favorites, Liked, and Novel recipes.',
      'Tap "Generate Plan" — the AI fills every remaining slot using your cookbook, each member\'s targets and restrictions, the schedule, and the budget, with a rationale for every placement.',
      'Review the result: a Nutrition Gaps card appears if someone falls short of their targets, with one-tap swap suggestions.',
      'Rearrange freely — drag meals between slots (press and hold on mobile); dropping on an occupied slot offers Swap or Replace.',
      'Happy with the shape of the week? Save it as a template to reuse later.',
    ],
    tips: [
      'Tip: Lock generously. Generation is at its best filling gaps around your choices, not overriding them.',
    ],
  },
  {
    id: 'recipe-mix',
    title: 'The Recipe Mix',
    intro: 'Every household needs a different balance of comfort and novelty. The Recipe Mix panel sets the proportion of Favorites (loved and often cooked), Liked, and Novel (rarely tried) recipes in the next generated plan.',
    steps: [
      'On the Plan page, expand the Recipe Mix panel.',
      'Adjust the three sliders — they auto-normalise to 100%.',
      'Generate: each placed slot is labelled with its tier in the plan rationale.',
      'Your ratings after cooking move recipes between tiers over time — the mix stays honest to your family\'s actual taste.',
    ],
    tips: [
      'Tip: Exhausted week ahead? Set Novel to 0% and coast on favourites. Feeling adventurous? Push it up and let Discover keep the cookbook supplied.',
    ],
  },
  {
    id: 'prep-schedule',
    title: 'Schedule & Batch Prep',
    intro: 'Real weeks have soccer practice and late meetings. Tell NourishPlan who is home when, and it plans around your life instead of an ideal one.',
    steps: [
      'On the Plan page, set each member\'s weekly schedule: Prep (time to cook), Consume (eating only), Quick (fast meal only), or Away.',
      'The generator respects it — no slow braise on a Quick night, nothing planned for someone who\'s Away.',
      'Schedule badges appear on the grid: peach for use-up/consume, amber for quick, red for away.',
      'Tap "Batch prep" to see which of the week\'s recipes share ingredients or steps — cook once, eat twice.',
      'Cooking multiple recipes in one session? Cook Mode generates a combined, interleaved prep sequence; reheat slots get a simple reheat sequence.',
    ],
    tips: [
      'Tip: One Prep day plus several Consume days is the classic pattern — batch cook Sunday, coast to Wednesday.',
    ],
  },
  {
    id: 'budget',
    title: 'Budget',
    intro: 'The weekly purse keeps food spending visible without receipts. Prices you enter once flow into recipe costs, plan generation, and the running weekly total.',
    steps: [
      'On the Plan page, tap the budget amount in "This week\'s purse" to set your weekly budget.',
      'Enter ingredient prices as you add them to recipes or inventory — normalised to cost per 100g automatically.',
      'Recipes show cost per serving; the plan generator uses it as a signal when the budget is tight.',
      'Cooking a meal logs its cost against the week — the purse shows spent, remaining, and per-meal pace.',
    ],
    tips: [
      'Tip: You don\'t need every price. Even a handful of staples priced makes the weekly picture useful.',
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    intro: 'The pantry, fridge, and freezer are part of the plan. Inventory feeds the grocery list (buy only what\'s missing), flags expiring food, and drains automatically as you cook.',
    steps: [
      'On the Inventory page, switch between Pantry, Fridge, and Freezer tabs.',
      'Add items manually or by barcode scan — name, quantity, location, optional expiry and price.',
      'Items nearing expiry get a warning badge, and the planner nudges use-it-up meals into the schedule.',
      'Cooking deducts ingredients automatically (oldest first) and shows a receipt of what was used and what was missing.',
      'After cooking, save an uneaten portion as a leftover — it lands back in the fridge with a 3-day expiry.',
    ],
    tips: [
      'Tip: Inventory doesn\'t need to be perfect to be useful — even a rough pantry picture shrinks the grocery list.',
    ],
  },
  {
    id: 'grocery-list',
    title: 'Grocery List',
    intro: 'The list is a consequence of the plan: everything the week needs, minus everything you have, grouped the way stores are laid out.',
    steps: [
      'On the Grocery page, generate the list from the current week\'s plan.',
      'Items you already have in inventory are split out as "Already have".',
      'Shop aisle by aisle — items are grouped by store section (Produce, Dairy, Meat, Pantry…).',
      'Check items off as you shop; the list syncs live, so two people can split the store.',
      'Regenerate after plan changes — cooked or removed meals drop their ingredients automatically.',
    ],
    tips: [
      'Tip: Generate the list after locking in the plan, not before — it\'s always a mirror of the current week.',
    ],
  },
  {
    id: 'tracking',
    title: 'Cooking & Tracking Your Day',
    intro: 'The Today page is where plans meet reality: log what you actually eat, cook with guidance, and close the loop with a rating.',
    steps: [
      'The Today page shows your daily progress rings for calories and macros, updating as you log.',
      'Log a planned meal from its slot — you\'ll see a suggested portion based on your personal targets, adjustable before saving.',
      'Log anything else via food search; edit or delete entries from the day\'s list.',
      'Tap "Cook" on a planned slot to enter Cook Mode: step-by-step instructions, timers, and per-member lanes for shared cooking.',
      'Finishing Cook Mode deducts inventory, logs spend to the weekly purse, and offers to save leftovers.',
      'Afterwards, the "Rate today\'s meals" card appears — one tap, 1 to 5 stars. This is the single highest-leverage habit in the app: ratings drive the recipe tiers that shape every future plan.',
      'Scroll down for the day\'s micronutrient breakdown.',
    ],
    tips: [
      'Tip: Portions are personal — the same planned meal suggests different amounts to each family member based on their own targets.',
    ],
  },
  {
    id: 'household-admin',
    title: 'Household Admin',
    intro: 'Admins manage membership and roles. Households need at least one admin at all times — the system enforces it.',
    steps: [
      'Invite members from the Household page; choose their role (admin or member) when creating the invite.',
      'Promote, demote, or remove members from the Members list — the last admin can\'t be demoted or removed.',
      'Add managed profiles for children — they get targets, portions, and schedules without an account.',
      'Edit the household name in Settings.',
      'Leaving or deleting your account walks you through transferring admin first if you\'re the last one.',
    ],
    tips: [
      'Tip: Two admins is a good default for couples — either can manage the household if the other is away.',
    ],
  },
]

export function GuidePage() {
  const location = useLocation()
  const [openSection, setOpenSection] = useState<string | null>(null)

  useEffect(() => {
    const hash = location.hash.slice(1)
    if (hash) {
      setOpenSection(hash)
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [location.hash])

  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id)

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — desktop only */}
      <div className="hidden md:block">
        <Nameplate
          left="The user's manual"
          title={<>The <span className="amp">Guide</span></>}
          right="Read once, plan forever"
        />
      </div>

      <StoryHead
        kicker="HOW TO USE NOURISHPLAN"
        headline="The Guide"
        byline="Philosophy first, buttons second"
        size="sm"
      />

      <div className="mx-auto max-w-2xl flex flex-col gap-6 mt-4">
        {/* Philosophy */}
        <div>
          <SectionHead label="How NourishPlan thinks" />
          <Rule />
          <p className="serif mt-3" style={{ fontSize: 17, lineHeight: 1.55 }}>
            NourishPlan is not a recipe app. It’s a constraint solver for the hardest recurring
            puzzle in family life: <em>what should everyone eat this week</em> — given different
            nutritional needs per person, a real schedule, one budget, and whatever is already in
            the freezer.
          </p>
          <p className="text-sm mt-3" style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            You teach it your household’s reality once — who needs what, who’s home when, what
            no one will eat, what you can spend. From then on, planning stops being a nightly
            scramble and becomes a short weekly ritual. You bring the excitement; the solver makes
            the week add up. One shared plan, personal portions for every member.
          </p>
        </div>

        {/* The weekly loop */}
        <div>
          <SectionHead label="The weekly loop" />
          <Rule />
          <div className="mt-2">
            {WEEKLY_LOOP.map((item, i) => (
              <div key={item.step} className="py-2.5" style={{ borderBottom: '1px dashed var(--rule-soft)' }}>
                <div className="flex items-baseline gap-3">
                  <span className="mono tnum" style={{ fontSize: 11, color: 'var(--tomato)' }}>{i + 1}</span>
                  <span className="serif" style={{ fontSize: 17 }}>{item.step}</span>
                </div>
                <p className="text-sm mt-1 ml-6" style={{ color: 'var(--ink-dim)', lineHeight: 1.55 }}>{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="serif-italic text-sm mt-3" style={{ color: 'var(--ink-dim)' }}>
            Each pass around the loop improves the next: ratings shape what gets suggested and
            generated, cooking keeps the pantry and budget true, and the grocery list is always a
            mirror of the plan. The plan is the hub — everything else feeds it.
          </p>
        </div>

        {/* The method — outcomes */}
        <div id="method">
          <SectionHead label="The method — one family, three outcomes" />
          <Rule />
          <p className="text-sm mt-3" style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            Eating well, being healthy, and saving money are usually three competing projects.
            Run through the loop, they become one: the same plan is composed against everyone’s
            targets, sized per person, and costed against the pantry and the purse. Here is the
            playbook for each outcome.
          </p>
          <div className="flex flex-col gap-4 mt-4">
            {OUTCOME_PLAYS.map(outcome => (
              <div key={outcome.goal} className="bg-paper-2 p-4" style={{ border: '1px solid var(--rule-soft)' }}>
                <h3 className="serif" style={{ fontSize: 19 }}>{outcome.goal}</h3>
                <p className="serif-italic text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{outcome.promise}</p>
                <ul className="flex flex-col gap-2 text-sm mt-3">
                  {outcome.plays.map((play, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mono" style={{ fontSize: 10, color: 'var(--tomato)', marginTop: 3 }}>▸</span>
                      <span style={{ lineHeight: 1.5 }}>{play}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Operating rhythm */}
        <div id="rhythm">
          <SectionHead label="The operating rhythm" />
          <Rule />
          <div className="mt-2">
            {OPERATING_RHYTHM.map(item => (
              <div key={item.when} className="py-2.5" style={{ borderBottom: '1px dashed var(--rule-soft)' }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tomato)' }}>
                  {item.when}
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)', lineHeight: 1.55 }}>{item.what}</p>
              </div>
            ))}
          </div>
          <p className="serif-italic text-sm mt-3" style={{ color: 'var(--ink-dim)' }}>
            The app can only optimise what it knows. Honest logs, real prices, true schedules —
            twenty minutes on Sunday and two a day buy back every 6pm scramble.
          </p>
        </div>

        {/* Quick-start card */}
        <div className="bg-paper-2 p-4" style={{ border: '1.5px solid var(--rule-c)' }}>
          <h2 className="serif mb-2" style={{ fontSize: 19 }}>Get started in 5 steps</h2>
          <ol className="list-decimal list-inside flex flex-col gap-2 text-sm" style={{ color: 'var(--ink-dim)' }}>
            {QUICK_START_STEPS.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>

        {/* Accordion sections */}
        <div>
          <SectionHead label="The details" />
          <Rule />
          <div className="flex flex-col mt-2">
            {GUIDE_SECTIONS.map(section => (
              <div key={section.id} id={section.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <button
                  onClick={() => toggle(section.id)}
                  aria-expanded={openSection === section.id}
                  aria-controls={`${section.id}-body`}
                  className="w-full flex justify-between items-center py-3 px-1 text-left min-h-[44px] hover:bg-paper-2 transition-colors"
                >
                  <span className="serif" style={{ fontSize: 17 }}>{section.title}</span>
                  <span className={`transition-transform text-xs ${openSection === section.id ? 'rotate-180' : ''}`} style={{ color: 'var(--ink-soft)' }}>
                    ▼
                  </span>
                </button>
                <div
                  id={`${section.id}-body`}
                  className={openSection === section.id ? 'px-1 pb-4 flex flex-col gap-2' : 'hidden'}
                >
                  <p className="text-sm" style={{ color: 'var(--ink-dim)', lineHeight: 1.55 }}>{section.intro}</p>
                  <ol className="list-decimal list-inside flex flex-col gap-2 text-sm mt-1">
                    {section.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  {section.tips?.map((tip, i) => (
                    <div key={i} className="mt-1 px-3 py-2 text-sm" style={{ background: 'var(--paper-2)', borderLeft: '2px solid var(--tomato)' }}>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
