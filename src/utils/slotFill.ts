import type { MealPlanSlot } from '../types/database'

export interface FillLabel {
  text: string
  tooltip: string
}

// Labels for how the planner filled an "Eat" slot, and for a cooked meal that
// must be made with extra portions to provide those leftovers.
export function slotFillLabels(slot: Pick<MealPlanSlot, 'fill_source' | 'fill_note' | 'extra_portions'> | null): FillLabel[] {
  if (!slot) return []
  const labels: FillLabel[] = []
  const note = slot.fill_note ?? ''
  if (slot.fill_source === 'leftover') {
    const from = note.replace(/^from\s+/i, '')
    labels.push({ text: from ? `Leftovers · ${from}` : 'Leftovers', tooltip: `Leftovers ${note}`.trim() })
  } else if (slot.fill_source === 'ready_meal') {
    const [location, usage] = note.split(' · ')
    labels.push({
      text: location ? `From ${location.toLowerCase()}` : 'Ready meal',
      tooltip: usage ? `Ready meal from inventory — ${usage} servings` : 'Ready meal from inventory',
    })
  } else if (slot.fill_source === 'make_ahead') {
    labels.push({ text: 'Make ahead', tooltip: "Nobody's cooking at this meal — prep it ahead of time" })
  }
  if (slot.extra_portions > 0) {
    const n = slot.extra_portions
    labels.push({ text: `+${n} portion${n === 1 ? '' : 's'}`, tooltip: `Cook ${n} extra portion${n === 1 ? '' : 's'} for leftovers later this week` })
  }
  return labels
}
