import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  isPregnancyUnsafe,
  isCurrentlyPregnant,
  PREGNANCY_BANNED_TERMS,
  PREGNANCY_AVOID_RULE,
} from '../supabase/functions/_shared/pregnancySafety'

const ROOT = path.resolve(__dirname, '..')

function daysFromToday(today: Date, days: number): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days))
  return d.toISOString().slice(0, 10)
}

describe('isPregnancyUnsafe', () => {
  it('flags a banned term in the recipe name', () => {
    expect(isPregnancyUnsafe('Salmon Sashimi', [])).toBe(true)
  })

  it('does not match "rum" inside "drumstick"', () => {
    expect(isPregnancyUnsafe('Chicken Drumsticks', ['chicken drumstick'])).toBe(false)
  })

  it('flags a banned term in an ingredient', () => {
    expect(isPregnancyUnsafe('Beef Stew', ['red wine'])).toBe(true)
  })

  it('does not match "pate" inside "pates"', () => {
    expect(isPregnancyUnsafe('Pasta', ['pates'])).toBe(false)
  })

  it('matches accented and multi-word terms case-insensitively', () => {
    expect(isPregnancyUnsafe('Chicken Liver Pâté', [])).toBe(true)
    expect(isPregnancyUnsafe('Grilled KING MACKEREL', [])).toBe(true)
  })

  it('matches a decomposed-unicode pâté', () => {
    expect(isPregnancyUnsafe('Pâté on toast', [])).toBe(true)
  })

  it('matches plural and inflected forms', () => {
    expect(isPregnancyUnsafe('Fried Chicken Livers', [])).toBe(true)
    expect(isPregnancyUnsafe('Braise', ['red wines'])).toBe(true)
    expect(isPregnancyUnsafe('Whiskey Glaze', [])).toBe(true)
  })

  it('does not flag wine vinegar, ginger beer or root beer', () => {
    expect(isPregnancyUnsafe('Salad', ['red wine vinegar'])).toBe(false)
    expect(isPregnancyUnsafe('Salad', ['white wine vinegar'])).toBe(false)
    expect(isPregnancyUnsafe('Stir Fry', ['rice wine vinegar'])).toBe(false)
    expect(isPregnancyUnsafe('Ginger Beer Chicken', [])).toBe(false)
    expect(isPregnancyUnsafe('Root Beer Pulled Pork', [])).toBe(false)
  })

  it('still flags real wine alongside wine vinegar', () => {
    expect(isPregnancyUnsafe('Beef Stew', ['red wine'])).toBe(true)
    expect(isPregnancyUnsafe('Beef Stew', ['red wine vinegar', 'red wine'])).toBe(true)
    expect(isPregnancyUnsafe('Red wine and red wine vinegar braise', [])).toBe(true)
  })

  it('passes ordinary safe recipes', () => {
    expect(isPregnancyUnsafe('Chicken Stir Fry', ['chicken breast', 'broccoli', 'soy sauce'])).toBe(false)
  })

  it('exports the exact banned term list', () => {
    expect(PREGNANCY_BANNED_TERMS).toEqual([
      'wine', 'beer', 'liqueur', 'rum', 'vodka', 'whisky', 'whiskey', 'bourbon', 'brandy', 'sake',
      'liver', 'pâté', 'pate', 'shark', 'swordfish', 'king mackerel', 'tilefish',
      'bigeye tuna', 'marlin', 'sushi', 'sashimi', 'tartare', 'ceviche',
    ])
  })

  it('avoid rule covers the spec categories', () => {
    for (const phrase of ['deli', 'steaming', 'sushi', 'swordfish', 'bigeye tuna', 'unpasteurized', 'blue', 'sprouts', 'liver', 'alcohol']) {
      expect(PREGNANCY_AVOID_RULE.toLowerCase()).toContain(phrase)
    }
  })
})

describe('isCurrentlyPregnant', () => {
  const today = new Date()

  it('is true for a due date 100 days out', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, 100) }, today)).toBe(true)
  })

  it('is true when due today', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, 0) }, today)).toBe(true)
  })

  it('is false for a past due date', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, -1) }, today)).toBe(false)
  })

  it('is false for a due date more than 300 days out', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, 301) }, today)).toBe(false)
  })

  it('is false when not pregnant', () => {
    expect(isCurrentlyPregnant({ is_pregnant: false, due_date: daysFromToday(today, 100) }, today)).toBe(false)
  })

  it('fails safe (true) when pregnant with no due date', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: null }, today)).toBe(true)
  })
})

describe('generate-plan pregnancy wiring', () => {
  const source = fs.readFileSync(path.join(ROOT, 'supabase/functions/generate-plan/index.ts'), 'utf8')

  it('imports the shared pregnancy module with the .ts extension', () => {
    expect(source).toContain('from "../_shared/pregnancySafety.ts"')
  })

  it('passes pregnancySafety constraints and records it in the snapshot', () => {
    expect(source).toContain('pregnancySafety')
    expect(source).toContain('If constraints.pregnancySafety is present it is a HARD rule like allergens.')
    expect(source).toContain('PREGNANT_ASSIGN_DEADLINE_MS = 100000')
    expect(source).toContain('pregnancyFilterRepairs')
  })

  it('selects the new profile columns from nutrition_targets', () => {
    expect(source).toMatch(/from\("nutrition_targets"\)\s*\.select\("[^"]*is_pregnant, due_date, notes/)
  })
})
