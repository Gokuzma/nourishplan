import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Icon } from '../Icon'
import { Chip } from '../editorial'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { DropActionMenu } from './DropActionMenu'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { ScheduleStatus } from '../../types/database'

interface PlanCellProps {
  dayIndex: number
  slotName: string
  slot: SlotWithMeal | null
  isToday: boolean
  isLocked: boolean
  scheduleStatus?: ScheduleStatus
  scheduleTooltip?: string
  violationCount?: number
  hasAllergyViolation?: boolean
  isFreezerFriendly?: boolean
  pendingDrop: boolean
  onAssign: () => void
  onSwap: () => void
  onClear: () => void
  onToggleLock: () => void
  onDropSwap: () => void
  onDropReplace: () => void
  onDropCancel: () => void
}

function calcSlotKcal(slot: SlotWithMeal | null): number {
  const meal = slot?.meals
  if (!meal || !meal.meal_items.length) return 0
  const items = meal.meal_items.map(item => ({
    nutrition: calcIngredientNutrition(
      {
        calories: item.calories_per_100g,
        protein: item.protein_per_100g,
        fat: item.fat_per_100g,
        carbs: item.carbs_per_100g,
      },
      item.quantity_grams,
    ),
  }))
  return calcMealNutrition(items).calories
}

function ScheduleChip({ status, tooltip }: { status: ScheduleStatus; tooltip?: string }) {
  const aria = `Schedule: ${status}`
  if (status === 'consume') return <Chip kind="butter" ariaLabel={aria} title={tooltip ?? 'Pre-made from prep day'}>USE UP</Chip>
  if (status === 'quick') return <Chip kind="chart" ariaLabel={aria} title={tooltip ?? 'Quick meal only'}>&lt;20 MIN</Chip>
  if (status === 'away') return <Chip kind="sky" ariaLabel={aria} title={tooltip ?? 'Away — not eating at home'}>AWAY</Chip>
  return null
}

/**
 * Single cell in the desktop 7×4 .plan-grid. Editorial slot view —
 * serif title, mono kcal, optional schedule chip + lock badge.
 * Drag-and-drop wired via dnd-kit (matches SlotCard's pattern).
 * Click occupied → swap; click empty → assign.
 */
export function PlanCell({
  dayIndex,
  slotName,
  slot,
  isToday,
  isLocked,
  scheduleStatus,
  scheduleTooltip,
  violationCount,
  hasAllergyViolation,
  isFreezerFriendly,
  pendingDrop,
  onAssign,
  onSwap,
  onClear,
  onToggleLock,
  onDropSwap,
  onDropReplace,
  onDropCancel,
}: PlanCellProps) {
  const [hovered, setHovered] = useState(false)

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${dayIndex}-${slotName}`,
    data: { dayIndex, slotName, currentSlot: slot },
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `slot-${slot?.id ?? `empty-${dayIndex}-${slotName}`}`,
    data: { slot },
    disabled: !slot?.meal_id,
  })

  const kcal = calcSlotKcal(slot)
  const occupied = slot?.meal_id != null && slot?.meals != null

  return (
    <div
      ref={setDropRef}
      className={`gcell ${isToday ? 'today-col' : ''}`}
      style={{
        background: isOver ? 'rgba(217, 232, 90, 0.12)' : undefined,
        outline: isOver ? '1px solid var(--chartreuse)' : undefined,
        outlineOffset: '-2px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {occupied ? (
        <div
          ref={setDragRef}
          {...attributes}
          {...listeners}
          className="slot"
          style={{ opacity: isDragging ? 0.4 : 1 }}
          onDoubleClick={onSwap}
          title={scheduleTooltip}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
            <button
              type="button"
              onClick={onSwap}
              className="slot-title"
              style={{ background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer', flex: 1, minWidth: 0 }}
              aria-label={`Change ${slot.meals!.name}`}
            >
              <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                {slot.meals!.name}
              </span>
            </button>
            {(hovered || isLocked) && (
              <button
                type="button"
                onClick={onToggleLock}
                style={{ background: 'none', border: 0, padding: 2, color: isLocked ? 'var(--tomato)' : 'var(--ink-soft)', cursor: 'pointer', lineHeight: 0 }}
                aria-label={isLocked ? 'Unlock slot' : 'Lock slot'}
                title={isLocked ? 'Unlock' : 'Lock'}
              >
                <Icon name={isLocked ? 'lock' : 'unlock'} size={11} />
              </button>
            )}
          </div>
          <div className="slot-meta tnum">
            {Math.round(kcal)} kcal
            {isFreezerFriendly && <span style={{ marginLeft: 6, color: 'var(--sky)' }} title="Freezer-friendly">❄</span>}
          </div>
          {scheduleStatus && scheduleStatus !== 'prep' && (
            <div className="slot-tags">
              <ScheduleChip status={scheduleStatus} tooltip={scheduleTooltip} />
            </div>
          )}
          {violationCount != null && violationCount > 0 && (
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: hasAllergyViolation ? 'var(--tomato)' : 'var(--butter)',
                  fontWeight: 600,
                }}
                title={hasAllergyViolation ? 'Contains allergen' : 'Conflicts with restrictions'}
              >
                ⚠ {violationCount}
              </span>
            </div>
          )}
          {hovered && !isLocked && (
            <button
              type="button"
              onClick={onClear}
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                background: 'none',
                border: 0,
                padding: 2,
                color: 'var(--ink-soft)',
                cursor: 'pointer',
                lineHeight: 0,
                opacity: 0.7,
              }}
              aria-label="Clear slot"
              title="Clear"
            >
              <Icon name="x" size={11} />
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onAssign}
            className="slot empty"
            style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', width: '100%' }}
            aria-label={`Add meal to ${slotName}`}
          >
            add
          </button>
          {scheduleStatus && scheduleStatus !== 'prep' && (
            <div className="slot-tags" style={{ marginTop: 4 }}>
              <ScheduleChip status={scheduleStatus} tooltip={scheduleTooltip} />
            </div>
          )}
        </>
      )}

      {pendingDrop && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <DropActionMenu onSwap={onDropSwap} onReplace={onDropReplace} onCancel={onDropCancel} />
        </div>
      )}
    </div>
  )
}
