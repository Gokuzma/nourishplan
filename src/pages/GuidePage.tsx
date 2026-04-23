import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface GuideSection {
  id: string
  title: string
  intro: string
  steps: string[]
  tips?: string[]
}

const QUICK_START_STEPS = [
  'Sign in or create your account',
  'Add foods to your food library',
  'Build a recipe, or import one from a URL or pasted text',
  'Put your recipes into a weekly meal plan',
  'Generate an AI-optimised plan or drag-and-drop meals yourself',
  'Log what you eat today',
]

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    intro: 'NourishPlan helps your family plan meals and track nutrition together. Everyone in your household shares the same meal plan, and each person gets personalized portion suggestions based on their own targets.',
    steps: [
      'Head to the app and tap "Sign up" to create your account, or "Log in" if you already have one.',
      'After signing in, you\'ll be asked to create a household — give it a name and tap "Create".',
      'You\'re now the household admin. Head to the Household page to invite family members.',
      'Share your invite link with the people you want to join. They\'ll use it to join your household.',
    ],
    tips: [
      'Tip: You can find your invite link on the Household page. Share it via text, email, or any messaging app.',
    ],
  },
  {
    id: 'adding-foods',
    title: 'Adding Foods',
    intro: 'Your food library is where all your foods live. You can search two major food databases or create your own custom foods — great for recipes with specific branded ingredients.',
    steps: [
      'Head to the Home page and tap the search bar at the top to open food search.',
      'Type a food name to search both the USDA and CNF (Canadian Nutrient File) databases at once.',
      'Tap a result to see its nutrition details, then tap "Add" to log it.',
      'To add a custom food, switch to the "My Foods" tab and tap "Add Custom Food".',
      'Fill in the food name, serving size, and macros (calories, protein, carbs, fat), then save.',
      'To edit or delete a custom food, find it in the "My Foods" tab and tap on it.',
    ],
    tips: [
      'Tip: Custom foods are shared with your whole household, so everyone can use them.',
    ],
  },
  {
    id: 'recipes',
    title: 'Building Recipes',
    intro: 'Combine foods into recipes and NourishPlan automatically calculates the nutrition for each serving. Great for meals you make regularly.',
    steps: [
      'Head to the Recipes page and tap "New Recipe".',
      'Your new recipe opens in edit mode — give it a name and set the number of servings.',
      'Tap "Add Ingredient" to search your food library and add ingredients.',
      'Set the quantity for each ingredient using the input field next to it.',
      'The per-serving nutrition updates automatically as you add ingredients.',
      'Add optional notes or variations at the bottom to help you remember how to make it.',
      'Imported recipes also land here ready to edit — see "Importing a Recipe" below.',
    ],
    tips: [
      'Tip: You can use another recipe as an ingredient — useful for things like a sauce you make separately.',
    ],
  },
  {
    id: 'recipe-import',
    title: 'Importing a Recipe',
    intro: 'Skip the manual typing — paste a recipe URL or raw text and NourishPlan extracts the name, ingredients, servings, and instructions for you. Great for saving recipes from blogs, videos, or a friend\'s message.',
    steps: [
      'Head to the Recipes page and tap "Import Recipe" beside the "+ New Recipe" button.',
      'Paste a blog URL, a YouTube cooking video URL, or the raw recipe text into the box.',
      'Tap "Import" and wait a few seconds for the AI to extract the recipe.',
      'The imported recipe opens in the recipe builder ready to edit — adjust ingredients, servings, or steps as needed.',
      'If the URL can\'t be fetched (some big recipe sites block automated requests), copy the recipe text from the page and paste it instead.',
      'Imported recipes keep a link back to the source URL when one was provided — you\'ll see it attributed at the top of the recipe.',
    ],
    tips: [
      'Tip: Raw text paste is the most reliable path — it works for any recipe you can copy, including DMs, PDFs, or hand-typed notes.',
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    intro: 'Track what\'s in your pantry, fridge, and freezer so you know what you already have when you cook or shop. NourishPlan can deduct ingredients as you cook and warn you about items nearing their expiry.',
    steps: [
      'Head to the Inventory page from the sidebar or mobile menu.',
      'Switch between Pantry, Fridge, and Freezer with the tabs across the top.',
      'Tap "Add Item" to add something manually — fill in name, quantity, unit, storage location, optional expiry date, and price.',
      'Tap "Scan" to add an item by barcode using your device camera (with a manual barcode entry fallback).',
      'Tap any item to expand it — from there you can Edit the details or Remove it (with a reason like "Used" or "Discarded").',
      'Items nearing expiry show a warning badge; the Home page shows a summary card with expiring-soon items.',
      'When you cook a recipe, NourishPlan deducts the ingredients from inventory (oldest batches first) and shows a receipt listing what was deducted and anything that was missing.',
    ],
    tips: [
      'Tip: After cooking, tap "Save leftover portion" on the receipt to log an uneaten portion as a new inventory item with a 3-day fridge expiry.',
    ],
  },
  {
    id: 'meal-plan',
    title: 'Creating a Meal Plan',
    intro: 'Organize your meals into a weekly plan shared with your whole household. Everyone sees the same plan and can check portion suggestions based on their own targets. You can place meals yourself, drag-and-drop them around, or generate a plan with AI.',
    steps: [
      'Head to the Meals page to create a meal first. Tap "New Meal" and give it a name.',
      'Add recipes or individual foods to your meal from the ingredient search.',
      'Once you have meals ready, head to the Plan page.',
      'You\'ll see a weekly grid with days across the top and meal slots (Breakfast, Lunch, Dinner, Snacks) below.',
      'Tap a day slot to assign a meal to it — search your meals and tap one to add it.',
      'To rearrange, drag a meal by its grip handle to another slot. On mobile, press and hold the handle then drag.',
      'Dropping onto an occupied slot offers Swap or Replace.',
      'To keep a meal fixed during AI generation, tap the lock badge on its slot — locked meals are preserved when you regenerate.',
      'Tap "Generate Plan" to let the AI fill empty slots using your recipes, nutrition targets, schedule, and budget. Locked slots stay put.',
      'After generation, a Nutrition Gaps card may appear below the grid with swap suggestions for any member falling short of their targets.',
      'To save your plan as a reusable template, tap the menu and choose "Save as Template".',
      'To start a new week, tap "New Week" and pick a start date.',
    ],
    tips: [
      'Tip: You can print your meal plan — tap the three-dot menu and choose "Print".',
    ],
  },
  {
    id: 'grocery-list',
    title: 'Grocery List',
    intro: 'Generate a shopping list from your active meal plan. NourishPlan subtracts anything you already have in inventory, groups items by store section, and keeps the list in sync across everyone in your household in real time.',
    steps: [
      'Head to the Grocery page from the sidebar or mobile menu.',
      'Tap "Generate from meal plan" to build a list from the current week\'s plan.',
      'Items you already have in inventory are marked "Already have" and split from the items you need to buy.',
      'Items are grouped by store section (Produce, Dairy, Meat, Pantry, etc.) so you can shop aisle by aisle.',
      'Tap an item to check it off as you shop — checked items stay visible but greyed out.',
      'Everyone in your household sees the same list and check-offs update live across devices.',
    ],
    tips: [
      'Tip: Generating a grocery list after you\'ve cooked updates the list with the remaining ingredients — items you already used drop off automatically.',
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking Your Day',
    intro: 'Log what you eat and see how you\'re doing against your nutrition targets. Your daily progress rings update in real time as you log, and you can cook a planned meal step by step with built-in timers.',
    steps: [
      'Head to the Home page. Your daily progress rings for calories and macros are at the top.',
      'Tap the search bar to find a food and log it — set your portion size and tap "Log".',
      'You can also log a planned meal by tapping "Log Meal" next to a meal slot in your plan.',
      'Set the portion size (you\'ll see a suggestion based on your targets) and tap "Log".',
      'Scroll down to see the micronutrient breakdown for the day.',
      'To cook a planned recipe, tap "Cook" on the slot — Cook Mode opens with step-by-step instructions, timers, and completion tracking.',
      'Finishing Cook Mode deducts ingredients from inventory, logs the spend to your weekly budget, and offers to save leftovers.',
      'After cooking, a "Rate today\'s meals" card appears on the Home page — tap a star (1-5) to rate the recipe. Ratings influence which recipes appear in future AI-generated plans.',
      'To edit or delete a log entry, tap it in the list below and use the Edit or Delete buttons.',
      'To set your personal nutrition targets, head to Settings and tap your name to open Member Targets.',
    ],
    tips: [
      'Tip: Portion suggestions show how much each family member should eat based on their individual targets.',
    ],
  },
  {
    id: 'prep-schedule',
    title: 'Prep & Schedule',
    intro: 'Tell NourishPlan when each household member is available to eat and cook, and it will suggest batch-prep opportunities for the week. Perfect for busy families who want to cook once and eat several times.',
    steps: [
      'Head to the Plan page and find the Schedule section.',
      'For each household member, mark each day slot as Prep (available to cook), Consume (eating only), Quick (quick meal only), or Away.',
      'Save the schedule — the AI plan generator respects these constraints (no big cook on a Quick day, no meals for members who are Away).',
      'Slots with a set schedule show a coloured dot on the Plan grid: peach for Consume, amber for Quick, red for Away.',
      'On the Plan page, tap the Batch Prep button to see which recipes share ingredients or prep steps across the week.',
      'Freezer-friendly recipes are flagged so you can cook a double batch and freeze half for later.',
      'When you tap Cook on a prep-slot meal with multiple recipes, NourishPlan generates an AI-optimised combined prep sequence (interleaves steps across recipes). For a reheat-slot, it generates a simple reheat sequence.',
    ],
    tips: [
      'Tip: Setting one Prep day and several Consume days per week is a common pattern — batch cook once, eat leftovers the rest of the week.',
    ],
  },
  {
    id: 'budget',
    title: 'Budget',
    intro: 'Set a weekly food budget and NourishPlan tracks your spend as you cook. Recipe cost is computed from the ingredient prices you\'ve entered — no receipt scanning required.',
    steps: [
      'Head to the Plan page and tap the budget amount in the Budget Summary section to edit your weekly household budget.',
      'Enter ingredient prices as you add them to recipes or inventory — NourishPlan normalises to cost per 100g automatically regardless of the unit you entered.',
      'Each recipe shows a computed cost per serving in the recipe builder.',
      'When you cook a recipe, the spend is logged against the current week and the Budget Summary on the Plan page updates.',
      'The summary shows weekly spend, remaining balance, and highlights if you\'re over budget.',
      'Over time, the AI plan generator uses cost per serving as one signal when picking recipes — so recipes with cheaper ingredients can get prioritised when the budget is tight.',
    ],
    tips: [
      'Tip: You only need to enter prices once per ingredient — they\'re remembered for future recipes and inventory items.',
    ],
  },
  {
    id: 'recipe-mix',
    title: 'Tier-aware Recipe Mix',
    intro: 'Control how often the AI plan generator picks your favourite, liked, or novel recipes. The three-slider Recipe Mix panel sets the percentage of each tier in your next generated plan.',
    steps: [
      'Head to the Plan page and expand the Recipe Mix panel.',
      'Three sliders control the mix: Favorites (highly rated or frequently cooked), Liked (moderately rated), and Novel (rarely or never cooked).',
      'Adjust the sliders — the total auto-normalises to 100%.',
      'Your choice is saved per household in your browser, so you don\'t have to reset it each week.',
      'Tap "Generate Plan" — the AI picks recipes in the proportions you set and labels each slot in the plan rationale as "Favorite — ...", "Liked — ...", or "Novel — ...".',
      'Ratings you add after cooking (see "Tracking Your Day") influence which tier each recipe ends up in for future plans.',
    ],
    tips: [
      'Tip: Set Novel to 0% for a week if you want familiar comfort meals; bump it back up when you\'re in an adventurous mood.',
    ],
  },
  {
    id: 'household-admin',
    title: 'Household Admin Tasks',
    intro: 'These options are only visible to household admins.',
    steps: [
      'To invite new members, head to the Household page and copy the invite link from the "Invite Link" section.',
      'To view all current household members and their roles, check the Members section on the Household page.',
      'To edit your household name, head to Settings — admins see an editable name field at the top.',
      'To add a managed profile (e.g. a child), head to the Household page and use the "Managed Profiles" section.',
      'To transfer the admin role, head to Settings, scroll to the Danger Zone, and use the admin transfer option before deleting your account.',
      'To delete your account, head to Settings and scroll to the Danger Zone — you\'ll be asked to transfer admin or confirm the household will be deleted.',
    ],
    tips: [
      'Tip: Transferring admin rights lets someone else manage the household if you leave.',
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
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <div className="mx-auto max-w-lg flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-text">User Guide</h1>

        {/* Quick-start card */}
        <div className="bg-surface rounded-[--radius-card] p-4 shadow-sm">
          <h2 className="font-bold text-text mb-2">Get started in 6 steps</h2>
          <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-text/80">
            {QUICK_START_STEPS.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>

        {/* Accordion sections */}
        <div className="flex flex-col gap-2">
          {GUIDE_SECTIONS.map(section => (
            <div key={section.id} id={section.id}>
              <button
                onClick={() => toggle(section.id)}
                aria-expanded={openSection === section.id}
                aria-controls={`${section.id}-body`}
                className="w-full flex justify-between items-center py-2 px-4 bg-surface rounded-[--radius-card] text-left font-bold text-text min-h-[44px]"
              >
                <span>{section.title}</span>
                <span className={`transition-transform ${openSection === section.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              <div
                id={`${section.id}-body`}
                className={openSection === section.id ? 'p-4 flex flex-col gap-2' : 'hidden'}
              >
                <p className="text-sm text-text/80">{section.intro}</p>
                <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-text">
                  {section.steps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
                {section.tips?.map((tip, i) => (
                  <div key={i} className="mt-1 rounded-[--radius-btn] bg-accent/20 px-4 py-2 text-sm font-bold text-text">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
