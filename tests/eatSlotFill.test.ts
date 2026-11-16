import { describe, it, expect } from 'vitest'
import { fillEatSlots, readyMealServings, type PlanSlotInput, type ReadyMealInput } from '../supabase/functions/_shared/eatSlotFill'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const safe = () => false

function slot(day_index: number, slot_name: string, status: string, recipe_id: string | null, eaters = 4): PlanSlotInput {
  return { day_index, slot_name, status, recipe_id, eaters }
}

const beefRice: ReadyMealInput = { id: 'inv-rice', name: 'Mexican Beef Rice', storage_location: 'freezer', slots: ['Lunch', 'Dinner'], servings: 4, expires_at: null }
const burritos: ReadyMealInput = { id: 'inv-burrito', name: 'Breakfast Burritos', storage_location: 'freezer', slots: ['Breakfast'], servings: 6, expires_at: null }

describe('fillEatSlots', () => {
  it('week one: an Eat slot with nothing cooked before it uses a ready meal', () => {
    const r = fillEatSlots([slot(0, 'Lunch', 'consume', 'r-soup'), slot(0, 'Dinner', 'prep', 'r-chili')], [beefRice], DAYS, safe)
    expect(r.fills.get('0|Lunch')).toEqual({ fill_source: 'ready_meal', fill_note: 'Freezer · uses 4 of 4', recipe_id: null, ready_meal_id: 'inv-rice' })
    expect(r.readyMealServingsUsed.get('inv-rice')).toBe(4)
  })

  it('an Eat slot after a cooked meal becomes its leftovers and the cook gets extra portions', () => {
    const r = fillEatSlots([slot(0, 'Dinner', 'prep', 'r-chili'), slot(1, 'Dinner', 'consume', 'r-soup', 1)], [beefRice], DAYS, safe)
    expect(r.fills.get('1|Dinner')).toEqual({ fill_source: 'leftover', fill_note: 'from Mon dinner', recipe_id: 'r-chili', ready_meal_id: null })
    expect(r.extraPortions.get('0|Dinner')).toBe(1)
  })

  it('lunch can be leftovers of the previous dinner, but breakfast never is', () => {
    const r = fillEatSlots([slot(0, 'Dinner', 'prep', 'r-chili'), slot(1, 'Breakfast', 'consume', 'r-oats'), slot(1, 'Lunch', 'consume', 'r-x', 2)], [], DAYS, safe)
    expect(r.fills.get('1|Lunch')?.recipe_id).toBe('r-chili')
    expect(r.fills.get('1|Breakfast')).toEqual({ fill_source: 'make_ahead', fill_note: 'prep ahead', recipe_id: 'r-oats', ready_meal_id: null })
  })

  it('a Cook meal feeds one Eat slot; a Batch meal feeds up to three', () => {
    const cook = fillEatSlots([slot(0, 'Dinner', 'prep', 'r-a'), slot(1, 'Lunch', 'consume', 'r-x', 1), slot(1, 'Dinner', 'consume', 'r-y', 1)], [], DAYS, safe)
    expect(cook.fills.get('1|Lunch')?.fill_source).toBe('leftover')
    expect(cook.fills.get('1|Dinner')?.fill_source).toBe('make_ahead')
    const batch = fillEatSlots([slot(0, 'Dinner', 'batch', 'r-a'), slot(1, 'Lunch', 'consume', 'r-x', 1), slot(1, 'Dinner', 'consume', 'r-y', 1), slot(2, 'Lunch', 'consume', 'r-z', 1), slot(2, 'Dinner', 'consume', 'r-w', 1)], [], DAYS, safe)
    expect(['1|Lunch', '1|Dinner', '2|Lunch'].map(k => batch.fills.get(k)?.recipe_id)).toEqual(['r-a', 'r-a', 'r-a'])
    expect(batch.fills.get('2|Dinner')?.fill_source).toBe('make_ahead')
    expect(batch.extraPortions.get('0|Dinner')).toBe(3)
  })

  it('leftovers older than three days are not used', () => {
    const r = fillEatSlots([slot(0, 'Dinner', 'prep', 'r-a'), slot(4, 'Lunch', 'consume', 'r-x')], [], DAYS, safe)
    expect(r.fills.get('4|Lunch')?.fill_source).toBe('make_ahead')
  })

  it('skips ready meals without enough servings, of the wrong meal type, or pregnancy-unsafe', () => {
    const small = { ...beefRice, servings: 2 }
    expect(fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x', 4)], [small], DAYS, safe).fills.get('0|Lunch')?.fill_source).toBe('make_ahead')
    expect(fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x')], [burritos], DAYS, safe).fills.get('0|Lunch')?.fill_source).toBe('make_ahead')
    const unsafe = (n: string) => n.includes('Beef')
    expect(fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x')], [beefRice], DAYS, unsafe).fills.get('0|Lunch')?.fill_source).toBe('make_ahead')
  })

  it('does not use the same ready-meal servings twice', () => {
    const r = fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x'), slot(1, 'Lunch', 'consume', 'r-y')], [beefRice], DAYS, safe)
    expect(r.fills.get('0|Lunch')?.fill_source).toBe('ready_meal')
    expect(r.fills.get('1|Lunch')?.fill_source).toBe('make_ahead')
  })

  it('a Quick slot the AI left empty takes a ready meal; filled Quick slots and Cook slots are untouched', () => {
    const r = fillEatSlots([slot(0, 'Breakfast', 'quick', null), slot(1, 'Breakfast', 'quick', 'r-oats'), slot(2, 'Dinner', 'prep', 'r-a')], [burritos], DAYS, safe)
    expect(r.fills.get('0|Breakfast')?.ready_meal_id).toBe('inv-burrito')
    expect(r.fills.has('1|Breakfast')).toBe(false)
    expect(r.fills.has('2|Dinner')).toBe(false)
  })

  it('prefers the ready meal that expires first', () => {
    const soon = { ...beefRice, id: 'inv-soon', name: 'Chicken Fried Rice', expires_at: '2026-11-20' }
    const r = fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x')], [beefRice, soon], DAYS, safe)
    expect(r.fills.get('0|Lunch')?.ready_meal_id).toBe('inv-soon')
  })
})

describe('readyMealServings', () => {
  it('counts units, and weight against the serving size', () => {
    expect(readyMealServings(4, 'units', null)).toBe(4)
    expect(readyMealServings(0.5, 'kg', null)).toBe(1)
    expect(readyMealServings(1, 'kg', 250)).toBe(4)
  })
})

describe('fillEatSlots dates', () => {
  const dates = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']
  it('does not place a ready meal after it expires or on a day already past', () => {
    const fridgeMeal: ReadyMealInput = { ...beefRice, storage_location: 'fridge', expires_at: '2026-11-17' }
    const r = fillEatSlots([slot(4, 'Lunch', 'consume', 'r-x')], [fridgeMeal], DAYS, safe, dates, '2026-11-16')
    expect(r.fills.get('4|Lunch')?.fill_source).toBe('make_ahead')
    const past = fillEatSlots([slot(0, 'Lunch', 'consume', 'r-x')], [beefRice], DAYS, safe, dates, '2026-11-18')
    expect(past.fills.get('0|Lunch')?.fill_source).toBe('make_ahead')
  })
})

describe('readyMealServings per unit', () => {
  it('multiplies counted units by servings per unit', () => {
    expect(readyMealServings(2, 'units', null, 3)).toBe(6)
    expect(readyMealServings(10, 'units', null, 0.2)).toBe(2)
    expect(readyMealServings(6, 'units', null, null)).toBe(6)
  })
})
