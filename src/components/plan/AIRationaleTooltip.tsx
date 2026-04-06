import { useEffect, useRef } from 'react'

interface AIRationaleTooltipProps {
  id: string
  text: string | null
  isOpen: boolean
  onClose: () => void
}

export function AIRationaleTooltip({ id, text, isOpen, onClose }: AIRationaleTooltipProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) return

    timerRef.current = setTimeout(() => {
      onClose()
    }, 5000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest(`[data-tooltip-id="${id}"]`)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, id, onClose])

  if (!isOpen || !text) return null

  return (
    <div
      role="tooltip"
      id={id}
      data-tooltip-id={id}
      className="absolute z-50 mt-1 bg-surface border border-accent/30 rounded-[--radius-card] shadow-md px-3 py-2 text-xs text-text/70 font-sans max-w-[240px]"
    >
      {text}
    </div>
  )
}
