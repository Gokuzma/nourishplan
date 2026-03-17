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
  'Build a recipe from your foods',
  'Put your recipe into a meal plan',
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
    ],
    tips: [
      'Tip: You can use another recipe as an ingredient — useful for things like a sauce you make separately.',
    ],
  },
  {
    id: 'meal-plan',
    title: 'Creating a Meal Plan',
    intro: 'Organize your meals into a weekly plan shared with your whole household. Everyone sees the same plan and can check portion suggestions based on their own targets.',
    steps: [
      'Head to the Meals page to create a meal first. Tap "New Meal" and give it a name.',
      'Add recipes or individual foods to your meal from the ingredient search.',
      'Once you have meals ready, head to the Plan page.',
      'You\'ll see a weekly grid with days across the top and meal slots (Breakfast, Lunch, Dinner, Snacks) below.',
      'Tap a day slot to assign a meal to it — search your meals and tap one to add it.',
      'To swap a meal on a specific day, tap the slot and choose a different meal.',
      'To save your plan as a reusable template, tap the menu and choose "Save as Template".',
      'To start a new week, tap "New Week" and pick a start date.',
    ],
    tips: [
      'Tip: You can print your meal plan — tap the three-dot menu and choose "Print".',
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking Your Day',
    intro: 'Log what you eat and see how you\'re doing against your nutrition targets. Your daily progress rings update in real time as you log.',
    steps: [
      'Head to the Home page. Your daily progress rings for calories and macros are at the top.',
      'Tap the search bar to find a food and log it — set your portion size and tap "Log".',
      'You can also log a planned meal by tapping "Log Meal" next to a meal slot in your plan.',
      'Set the portion size (you\'ll see a suggestion based on your targets) and tap "Log".',
      'Scroll down to see the micronutrient breakdown for the day.',
      'To edit or delete a log entry, tap it in the list below and use the Edit or Delete buttons.',
      'To set your personal nutrition targets, head to Settings and tap your name to open Member Targets.',
    ],
    tips: [
      'Tip: Portion suggestions show how much each family member should eat based on their individual targets.',
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
          <h2 className="font-bold text-text mb-2">Get started in 5 steps</h2>
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
