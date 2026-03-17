import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useHousehold } from '../../hooks/useHousehold'

const navItems = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Recipes', to: '/recipes', icon: '📖' },
  { label: 'Meals', to: '/meals', icon: '🍽️' },
  { label: 'Plan', to: '/plan', icon: '📋' },
  { label: 'Household', to: '/household', icon: '👨‍👩‍👧' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
  { label: 'User Guide', to: '/guide', icon: '📘' },
]

export function Sidebar() {
  const { signOut } = useAuth()
  const { data: membership } = useHousehold()
  const householdName = membership?.households?.name

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface border-r border-secondary">
      <div className="px-6 py-5 border-b border-secondary">
        <span className="text-xl font-bold text-primary">NourishPlan</span>
        {householdName && (
          <p className="text-xs text-text/50 mt-0.5 truncate">{householdName}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-[--radius-btn] transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text/70 hover:bg-secondary hover:text-text'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-secondary">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[--radius-btn] text-text/70 hover:bg-secondary hover:text-text transition-colors"
        >
          <span>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
