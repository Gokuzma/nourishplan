import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_PRIORITIES = ['Nutrition', 'Preferences', 'Budget', 'Variety', 'Inventory']

interface SortableItemProps {
  id: string
  index: number
  total: number
}

function SortableItem({ id, index, total }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-label={`${id}, position ${index + 1} of ${total}`}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 select-none ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-text/30 cursor-grab active:cursor-grabbing p-0.5 touch-none"
        aria-label={`Drag to reorder ${id}`}
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" />
          <circle cx="10" cy="3" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="10" cy="11" r="1.2" />
        </svg>
      </button>
      <span className="flex-1 text-sm text-text font-sans">{id}</span>
      <span className="text-xs text-text/40">{index + 1}</span>
    </div>
  )
}

interface PriorityOrderPanelProps {
  householdId: string
  onOrderChange?: (order: string[]) => void
}

export function PriorityOrderPanel({ householdId, onOrderChange }: PriorityOrderPanelProps) {
  const storageKey = `plan-priority-order-${householdId}`
  const [expanded, setExpanded] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const [priorities, setPriorities] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PRIORITIES.length) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRIORITIES
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPriorities(prev => {
      const oldIndex = prev.indexOf(active.id as string)
      const newIndex = prev.indexOf(over.id as string)
      const next = arrayMove(prev, oldIndex, newIndex)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })

    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 1500)
  }, [storageKey])

  useEffect(() => {
    onOrderChange?.(priorities)
  }, [priorities, onOrderChange])

  return (
    <div className={expanded ? 'bg-secondary rounded-[--radius-card]' : ''}>
      <button
        className="w-full py-2.5 px-3 bg-secondary rounded-[--radius-card] flex items-center justify-between"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-text font-sans">Planning priorities</span>
        <div className="flex items-center gap-2">
          {showSaved && (
            <span className="text-xs text-primary font-sans">Saved</span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`transition-transform text-text/50 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-3 pt-1">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={priorities} strategy={verticalListSortingStrategy}>
              {priorities.map((priority, index) => (
                <SortableItem
                  key={priority}
                  id={priority}
                  index={index}
                  total={priorities.length}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

export function getPriorityOrder(householdId: string): string[] {
  try {
    const stored = localStorage.getItem(`plan-priority-order-${householdId}`)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PRIORITIES.length) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRIORITIES
}
