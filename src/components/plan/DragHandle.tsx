interface DragHandleProps {
  listeners?: Record<string, Function>
  attributes?: Record<string, unknown>
  ariaLabel?: string
  className?: string
}

export function DragHandle({ listeners, attributes, ariaLabel = 'Drag to reorder', className }: DragHandleProps) {
  return (
    <button
      type="button"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] flex items-center justify-center text-accent cursor-grab active:cursor-grabbing shrink-0 ${className ?? ''}`}
      style={{ touchAction: 'none' }}
      {...(listeners as Record<string, unknown>)}
      {...(attributes as Record<string, unknown>)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12" x2="14" y2="12" />
      </svg>
    </button>
  )
}
