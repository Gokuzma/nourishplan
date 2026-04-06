import { describe, it, expect } from 'vitest'
import { detectMonotony, SlotEntry } from './monotonyDetection'

describe('detectMonotony', () => {
  const currentWeek = '2026-04-06'
  const priorWeek = '2026-03-30'
  const twoWeeksAgo = '2026-03-23'

  it('returns empty array when no recipe exceeds threshold', () => {
    const slots: SlotEntry[] = [
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 0 },
      { recipeId: 'r2', recipeName: 'Salad', weekStart: currentWeek, dayIndex: 1 },
    ]
    expect(detectMonotony(slots, currentWeek)).toEqual([])
  })

  it('returns recipe appearing 3x when threshold is 2', () => {
    const slots: SlotEntry[] = [
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 0 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 2 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: priorWeek, dayIndex: 5 },
    ]
    const result = detectMonotony(slots, currentWeek)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ recipeId: 'r1', recipeName: 'Pasta', count: 3 })
  })

  it('ignores slots from more than 2 weeks ago', () => {
    const slots: SlotEntry[] = [
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: twoWeeksAgo, dayIndex: 0 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: twoWeeksAgo, dayIndex: 1 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: twoWeeksAgo, dayIndex: 2 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 0 },
    ]
    const result = detectMonotony(slots, currentWeek)
    expect(result).toEqual([])
  })

  it('counts correctly across two weeks', () => {
    const slots: SlotEntry[] = [
      { recipeId: 'r1', recipeName: 'Stir Fry', weekStart: currentWeek, dayIndex: 0 },
      { recipeId: 'r1', recipeName: 'Stir Fry', weekStart: priorWeek, dayIndex: 3 },
      { recipeId: 'r1', recipeName: 'Stir Fry', weekStart: priorWeek, dayIndex: 6 },
      { recipeId: 'r2', recipeName: 'Soup', weekStart: currentWeek, dayIndex: 1 },
    ]
    const result = detectMonotony(slots, currentWeek)
    expect(result).toHaveLength(1)
    expect(result[0].recipeId).toBe('r1')
    expect(result[0].count).toBe(3)
  })

  it('uses default threshold of 2 when not specified', () => {
    const slots: SlotEntry[] = [
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 0 },
      { recipeId: 'r1', recipeName: 'Pasta', weekStart: currentWeek, dayIndex: 1 },
    ]
    // 2 occurrences with threshold=2 should NOT trigger (>2 required, not >=2)
    expect(detectMonotony(slots, currentWeek)).toEqual([])
  })
})
