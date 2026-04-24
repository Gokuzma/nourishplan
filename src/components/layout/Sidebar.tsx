import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../hooks/useHousehold'
import { Icon, type IconName } from '../Icon'

interface NavItem {
  label: string
  to: string
  icon: IconName
  num: string
}

const NAV_DAILY: NavItem[] = [
  { label: 'Home', to: '/', icon: 'home', num: '01' },
  { label: 'Recipes', to: '/recipes', icon: 'book', num: '02' },
  { label: 'Meals', to: '/meals', icon: 'plate', num: '03' },
]

const NAV_WORKBENCH: NavItem[] = [
  { label: 'Plan', to: '/plan', icon: 'calendar', num: '04' },
  { label: 'Inventory', to: '/inventory', icon: 'box', num: '05' },
  { label: 'Grocery', to: '/grocery', icon: 'cart', num: '06' },
]

const NAV_LEDGER: NavItem[] = [
  { label: 'Insights', to: '/insights', icon: 'chart', num: '07' },
  { label: 'Household', to: '/household', icon: 'users', num: '08' },
  { label: 'Settings', to: '/settings', icon: 'gear', num: '09' },
  { label: 'User Guide', to: '/guide', icon: 'compass', num: '10' },
]

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <>
      <div className="mono px-[18px] pt-[18px] pb-1.5 text-[9px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
        {label}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'relative grid grid-cols-[20px_1fr_auto] items-center gap-3 px-[18px] py-[9px] text-[14px]',
              isActive
                ? 'bg-[var(--tomato)] text-[#1a0a05] before:content-["→"] before:absolute before:-left-2.5 before:top-1/2 before:-translate-y-1/2 before:text-[var(--tomato)] before:font-[var(--font-display)] before:text-[20px] before:leading-none'
                : 'text-[var(--ink)] hover:bg-[rgba(255,245,225,0.04)]',
            ].join(' ')
          }
        >
          <Icon name={item.icon} size={18} />
          <span className="tracking-[-0.005em]">{item.label}</span>
          <span
            className={[
              'mono text-[10px]',
              'group-[.active]:text-[#1a0a05]',
            ].join(' ')}
            style={{ color: 'inherit', opacity: 0.65 }}
          >
            {item.num}
          </span>
        </NavLink>
      ))}
    </>
  )
}

export function Sidebar() {
  const { signOut } = useAuth()
  const { data: membership } = useHousehold()
  const householdName = membership?.households?.name

  return (
    <aside
      className="relative hidden md:flex flex-col w-[220px] min-h-screen bg-[var(--paper-2)] border-r border-[var(--rule-c)] pt-[18px] pb-5 after:content-[''] after:absolute after:-right-px after:top-0 after:bottom-0 after:w-px after:opacity-50"
      style={{
        backgroundImage: 'none',
      }}
    >
      {/* decorative dashed right edge (sidebar::after equivalent) */}
      <div
        aria-hidden="true"
        className="absolute right-[-1px] top-0 bottom-0 w-px opacity-50"
        style={{
          background:
            'repeating-linear-gradient(to bottom, var(--rule-c) 0 3px, transparent 3px 6px)',
        }}
      />

      {/* Brand */}
      <div className="px-[18px] pb-4 border-b-2 border-[var(--rule-c)] relative">
        {/* Accessible: preserve "NourishPlan" as a single word for existing tests/screen readers. */}
        <span className="sr-only">NourishPlan</span>
        <div
          className="serif-italic text-[30px] font-normal leading-[0.9] tracking-[-0.03em] text-[var(--ink)]"
          aria-hidden="true"
        >
          Nourish<span className="not-italic text-[var(--tomato)]">·</span>plan
        </div>
        <div className="mono mt-2 text-[9px] tracking-[0.2em] uppercase text-[var(--butter)]">
          The Sunday Supper Gazette
        </div>
        {householdName && (
          <div className="mono mt-0.5 text-[8px] tracking-[0.18em] uppercase text-[var(--ink-soft)] truncate">
            {householdName}
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col overflow-y-auto">
        <NavGroup label="Daily" items={NAV_DAILY} />
        <NavGroup label="Workbench" items={NAV_WORKBENCH} />
        <NavGroup label="Ledger" items={NAV_LEDGER} />
      </nav>

      {/* Sign out */}
      <div className="px-[18px] pt-4 mt-auto">
        <hr className="rule-soft" />
        <button
          onClick={signOut}
          className="mt-3 w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[var(--ink)] hover:bg-[rgba(255,245,225,0.06)] transition-colors"
        >
          <Icon name="door" size={16} aria-label="Sign out icon" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
