import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MobileDrawer } from './MobileDrawer'
import { Icon, type IconName } from '../Icon'

interface TabItem {
  label: string
  to: string
  icon: IconName
}

const tabs: TabItem[] = [
  { label: 'Home', to: '/', icon: 'home' },
  { label: 'Recipes', to: '/recipes', icon: 'book' },
  { label: 'Plan', to: '/plan', icon: 'calendar' },
]

export function TabBar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const baseTab =
    'relative flex-1 min-h-[58px] flex flex-col items-center justify-center gap-[3px] mono text-[9px] uppercase tracking-[0.14em] transition-colors'

  return (
    <>
      <nav
        role="tabbar"
        className="fixed bottom-0 left-0 right-0 grid grid-cols-4 bg-[var(--paper-2)] border-t-2 border-[var(--rule-c)] md:hidden z-40"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              [
                baseTab,
                isActive
                  ? 'text-[var(--tomato)] after:content-[""] after:absolute after:bottom-1.5 after:w-[6px] after:h-[6px] after:rounded-full after:bg-[var(--tomato)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
              ].join(' ')
            }
          >
            <Icon name={tab.icon} size={19} />
            <span>{tab.label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setDrawerOpen(true)}
          className={`${baseTab} text-[var(--ink-soft)] hover:text-[var(--ink)]`}
          aria-label="More navigation options"
        >
          <Icon name="more" size={19} />
          <span>More</span>
        </button>
      </nav>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
