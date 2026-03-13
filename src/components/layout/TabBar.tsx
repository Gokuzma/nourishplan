import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Plan', to: '/plan', icon: '📋', comingSoon: true },
  { label: 'Household', to: '/household', icon: '👨‍👩‍👧' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
]

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-secondary flex md:hidden z-40">
      {tabs.map((tab) => (
        tab.comingSoon ? (
          <span
            key={tab.label}
            role="link"
            aria-disabled="true"
            className="flex-1 flex flex-col items-center justify-center py-2 text-text/40 cursor-not-allowed select-none"
            title="Coming soon"
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs mt-0.5">{tab.label}</span>
          </span>
        ) : (
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
        )
      ))}
    </nav>
  )
}
