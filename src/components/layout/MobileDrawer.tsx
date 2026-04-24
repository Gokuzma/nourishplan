import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Icon, type IconName } from '../Icon'

interface DrawerItem {
  label: string
  to: string
  icon: IconName
  num: string
}

const drawerItems: DrawerItem[] = [
  { label: 'Meals', to: '/meals', icon: 'plate', num: '03' },
  { label: 'Inventory', to: '/inventory', icon: 'box', num: '05' },
  { label: 'Grocery', to: '/grocery', icon: 'cart', num: '06' },
  { label: 'Insights', to: '/insights', icon: 'chart', num: '07' },
  { label: 'Household', to: '/household', icon: 'users', num: '08' },
  { label: 'Settings', to: '/settings', icon: 'gear', num: '09' },
  { label: 'User Guide', to: '/guide', icon: 'compass', num: '10' },
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
          <div className="mono text-[9px] uppercase tracking-[0.2em] text-[var(--butter)]">
            The Sunday Supper Gazette
          </div>
          <div
            className="serif-italic mt-1 text-[28px] font-normal leading-[0.9] tracking-[-0.03em] text-[var(--ink)]"
            aria-hidden="true"
          >
            More<span className="not-italic text-[var(--tomato)]"> ·</span>
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
                  'grid grid-cols-[20px_1fr_auto] items-center gap-3 px-[18px] py-[11px] text-[14px]',
                  isActive
                    ? 'bg-[var(--tomato)] text-[#1a0a05]'
                    : 'text-[var(--ink)] hover:bg-[rgba(255,245,225,0.06)]',
                ].join(' ')
              }
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              <span className="mono text-[10px] opacity-65" style={{ color: 'inherit' }}>
                {item.num}
              </span>
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
