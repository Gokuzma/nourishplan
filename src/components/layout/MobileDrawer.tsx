import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const drawerItems = [
  { label: 'Meals', to: '/meals', icon: '🍽️' },
  { label: 'Household', to: '/household', icon: '👨‍👩‍👧' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
]

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-surface border-l border-secondary z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-6 py-5 border-b border-secondary">
          <span className="text-lg font-bold text-primary">More</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {drawerItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onClose}
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
            onClick={async () => {
              onClose()
              await signOut()
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[--radius-btn] text-text/70 hover:bg-secondary hover:text-text transition-colors"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
