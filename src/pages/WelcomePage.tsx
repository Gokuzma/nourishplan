import { NavLink } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { Icon, type IconName } from '../components/Icon'
import { Nameplate, StoryHead, SectionHead, Folio, Rule } from '../components/editorial'

interface Destination {
  to: string
  icon: IconName
  title: string
  blurb: string
}

const DESTINATIONS: Destination[] = [
  {
    to: '/plan',
    icon: 'calendar',
    title: 'Plan the week',
    blurb: 'Build a weekly meal plan by hand, or let the AI optimise it around your targets, schedule, and budget.',
  },
  {
    to: '/today',
    icon: 'sun',
    title: 'Track today',
    blurb: "Log what everyone eats and watch calories and macros against each person's own targets.",
  },
  {
    to: '/recipes',
    icon: 'book',
    title: 'Build recipes',
    blurb: 'Create recipes or import them from any URL or pasted text — nutrition is calculated for you.',
  },
  {
    to: '/grocery',
    icon: 'cart',
    title: 'Shop smart',
    blurb: "Generate a grocery list from your plan, minus whatever's already in your pantry.",
  },
  {
    to: '/inventory',
    icon: 'box',
    title: 'Stock the kitchen',
    blurb: 'Track your pantry, fridge, and freezer. Ingredients deduct automatically as you cook.',
  },
  {
    to: '/insights',
    icon: 'chart',
    title: 'See the trends',
    blurb: "Track how your household's nutrition and spending trend over time.",
  },
]

function DestinationCard({ to, icon, title, blurb }: Destination) {
  return (
    <NavLink
      to={to}
      className="group flex flex-col gap-2 p-4 no-underline transition-colors hover:bg-[rgba(122,140,112,0.06)]"
      style={{ border: '1.5px solid var(--rule-c)', color: 'var(--ink)' }}
    >
      <div className="flex items-center justify-between">
        <Icon name={icon} size={22} style={{ color: 'var(--tomato)' }} />
        <Icon name="arrow-right" size={16} style={{ color: 'var(--ink-soft)' }} />
      </div>
      <div className="serif" style={{ fontSize: 22, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
        {title}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-dim)' }}>{blurb}</p>
    </NavLink>
  )
}

export function WelcomePage() {
  const { data: membership } = useHousehold()
  const householdName = membership?.households?.name

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — desktop only */}
      <div className="hidden md:block">
        <Nameplate
          left={householdName ? householdName.toUpperCase() : 'YOUR HOUSEHOLD'}
          title={<>Nourish<span className="amp">·</span>plan</>}
          right="Meal planning for the household"
        />
      </div>

      <StoryHead
        kicker="WELCOME"
        headline="Plan, cook, and track"
        headlineAccent="together"
        byline={"Everything your household eats — planned ahead,\nshopped for, and tracked in one place."}
      />

      <p
        className="serif-italic mt-4"
        style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--ink-dim)', maxWidth: '46ch' }}
      >
        NourishPlan turns a shared weekly meal plan into grocery lists, step-by-step
        cooking, and per-person nutrition tracking. Pick a place to start.
      </p>

      <div className="mt-6">
        <SectionHead label="What you can do" />
        <Rule />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-4">
        {DESTINATIONS.map(dest => (
          <DestinationCard key={dest.to} {...dest} />
        ))}
      </div>

      <div className="mt-6">
        <Rule variant="dashed" />
        <NavLink
          to="/guide"
          className="mono inline-flex items-center gap-2 mt-4 no-underline"
          style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tomato)' }}
        >
          New here? Read the full guide
          <Icon name="arrow-right" size={14} />
        </NavLink>
      </div>

      <div className="hidden md:block">
        <Folio
          num="00"
          title="Welcome"
          tagline="Start anywhere — the plan ties it together."
          pageOf="PAGE 0 OF 10"
        />
      </div>
    </div>
  )
}
