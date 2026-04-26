import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Icon, type IconName } from '../Icon'

interface DrawerItem {
  label: string
  to: string
  icon: IconName
}

const drawerItems: DrawerItem[] = [
  { label: 'Inventory', to: '/inventory', icon: 'box' },
  { label: 'Grocery', to: '/grocery', icon: 'cart' },
  { label: 'Insights', to: '/insights', icon: 'chart' },
  { label: 'Household', to: '/household', icon: 'users' },
  { label: 'Settings', to: '/settings', icon: 'gear' },
  { label: 'User Guide', to: '/guide', icon: 'compass' },
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
          className="fixed inset-0 bg-black/60 z-50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[var(--paper-2)] border-l-2 border-[var(--rule-c)] z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Masthead */}
        <div className="px-[18px] py-5 border-b-2 border-[var(--rule-c)]">
          <div className="mono text-[9px] uppercase tracking-[0.2em] text-[var(--tomato)]">
            Meal planning for the household
          </div>
          <div
            className="serif-italic mt-1 text-[28px] font-normal leading-[0.9] tracking-[-0.03em] text-[var(--ink)]"
            aria-hidden="true"
          >
            More
          </div>
          <span className="sr-only">More navigation options</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto">
          {drawerItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'grid grid-cols-[20px_1fr] items-center gap-3 px-[18px] py-[11px] text-[14px]',
                  isActive
                    ? 'bg-[var(--tomato)] text-[var(--on-accent)]'
                    : 'text-[var(--ink)] hover:bg-[rgba(40,34,32,0.04)]',
                ].join(' ')
              }
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-[18px] py-4 border-t-2 border-[var(--rule-c)]">
          <button
            onClick={async () => {
              onClose()
              await signOut()
            }}
            className="w-full flex items-center gap-3 px-2 py-2 text-[13px] text-[var(--ink)] hover:bg-[rgba(255,245,225,0.06)] transition-colors"
          >
            <Icon name="door" size={16} aria-label="Sign out icon" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
