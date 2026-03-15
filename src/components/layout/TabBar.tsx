import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MobileDrawer } from './MobileDrawer'

const tabs = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Foods', to: '/foods', icon: '🥦' },
  { label: 'Recipes', to: '/recipes', icon: '📖' },
  { label: 'Plan', to: '/plan', icon: '📋' },
]

export function TabBar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-secondary flex md:hidden z-40">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-text/60 hover:text-text'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs mt-0.5">{tab.label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 text-text/60 hover:text-text transition-colors"
          aria-label="More navigation options"
        >
          <span className="text-xl">☰</span>
          <span className="text-xs mt-0.5">More</span>
        </button>
      </nav>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
