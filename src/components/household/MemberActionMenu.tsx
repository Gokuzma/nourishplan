import { useEffect, useRef, useState } from 'react'

export interface MemberActionMenuItemProps {
  /** Visible label */
  label: string
  /** Triggered when the item is activated; the menu auto-closes after */
  onSelect: () => void
  /** If true, item is visually muted and does not fire onSelect — shows tooltip instead */
  disabled?: boolean
  /** Tooltip text shown on hover (desktop) or below the item (mobile) when disabled */
  disabledTooltip?: string
  /** If true, item text is red (destructive — e.g. Remove / Leave) */
  destructive?: boolean
}

export interface MemberActionMenuProps {
  /** Accessible label for the trigger button — e.g. "Actions for Sarah" */
  triggerAriaLabel: string
  items: MemberActionMenuItemProps[]
}

/**
 * Overflow menu (⋮) popover used in MemberList (Phase 30 D-01).
 *
 * - Kebab button opens a right-anchored popover with 1-4 action items.
 * - Closes on Escape, outside-click, or item selection.
 * - Disabled items show `disabledTooltip` via:
 *     - hover on desktop (CSS :hover state on the wrapper)
 *     - tap-to-reveal on mobile: clicking a disabled item toggles a persistent
 *       helper row below it (tap again to hide). Per D-04 mobile requirement.
 */
export function MemberActionMenu({ triggerAriaLabel, items }: MemberActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [revealedTip, setRevealedTip] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setRevealedTip(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setRevealedTip(null)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleItemClick(idx: number) {
    const item = items[idx]
    if (item.disabled) {
      // Mobile: toggle tooltip row. Desktop users see the hover tooltip; click also reveals it (harmless).
      setRevealedTip(revealedTip === idx ? null : idx)
      return
    }
    setOpen(false)
    setRevealedTip(null)
    item.onSelect()
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text/60 hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span aria-hidden="true" className="text-lg leading-none">⋮</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 min-w-[12rem] overflow-hidden rounded-card border border-accent/40 bg-surface shadow-lg"
        >
          {items.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="group relative">
              <button
                type="button"
                role="menuitem"
                aria-disabled={item.disabled ? true : undefined}
                onClick={() => handleItemClick(idx)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                  item.disabled
                    ? 'cursor-not-allowed text-text/40'
                    : item.destructive
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-text hover:bg-secondary/60'
                }`}
              >
                {item.label}
              </button>
              {/* Desktop tooltip (hover) — hidden on touch via CSS :hover which touch does not trigger */}
              {item.disabled && item.disabledTooltip && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 hidden -translate-y-1/2 whitespace-nowrap rounded-btn bg-text px-2 py-1 text-xs text-surface group-hover:block"
                >
                  {item.disabledTooltip}
                </div>
              )}
              {/* Mobile tap-to-reveal row — inlined under the disabled item when tapped */}
              {item.disabled && item.disabledTooltip && revealedTip === idx && (
                <p className="border-t border-accent/30 bg-secondary/40 px-3 py-2 text-xs text-text/60">
                  {item.disabledTooltip}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
