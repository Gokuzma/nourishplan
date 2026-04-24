interface RoleSegmentedControlProps {
  value: 'admin' | 'member'
  onChange: (next: 'admin' | 'member') => void
  disabled?: boolean
  /** Optional id prefix so multiple controls on the same page have unique labels */
  idPrefix?: string
}

/**
 * Two-option segmented control for invite-time role selection (Phase 30 D-12).
 *
 * Pastel palette matches RoleBadge:
 *   - Selected: bg-primary/20 text-primary  (matches admin badge)
 *   - Unselected: bg-secondary text-text/60 (matches member badge)
 */
export function RoleSegmentedControl({
  value,
  onChange,
  disabled = false,
  idPrefix = 'role-seg',
}: RoleSegmentedControlProps) {
  const options: { key: 'member' | 'admin'; label: string }[] = [
    { key: 'member', label: 'Member' },
    { key: 'admin', label: 'Admin' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Invite role"
      className="inline-flex items-center gap-1 rounded-full bg-secondary/60 p-1"
    >
      {options.map((opt) => {
        const selected = opt.key === value
        return (
          <button
            key={opt.key}
            id={`${idPrefix}-${opt.key}`}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => { if (!disabled && !selected) onChange(opt.key) }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
              selected
                ? 'bg-primary/20 text-primary'
                : 'bg-transparent text-text/60 hover:bg-secondary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
