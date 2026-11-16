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

  it('matches -ies plurals of terms ending in y', () => {
    expect(isPregnancyUnsafe('Flight of whiskies', [])).toBe(true)
    expect(isPregnancyUnsafe('Cake', ['assorted brandies'])).toBe(true)
    expect(isPregnancyUnsafe('Brandy Snaps', [])).toBe(true)
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
      'liverwurst', 'foie gras', 'carpaccio', 'gravlax', 'crudo', 'sherry', 'tequila', 'vermouth',
      'champagne', 'prosecco', 'cognac', 'marsala', 'gin', 'mirin',
    ])
  })

  it('flags the added cured, raw and alcohol terms', () => {
    expect(isPregnancyUnsafe('Liverwurst Sandwich', [])).toBe(true)
    expect(isPregnancyUnsafe('Seared Foie Gras', [])).toBe(true)
    expect(isPregnancyUnsafe('Beef Carpaccio', [])).toBe(true)
    expect(isPregnancyUnsafe('Dill Gravlax', [])).toBe(true)
    expect(isPregnancyUnsafe('Tuna Crudo', [])).toBe(true)
    expect(isPregnancyUnsafe('Trifle', ['sherry'])).toBe(true)
    expect(isPregnancyUnsafe('Tequila Lime Chicken', [])).toBe(true)
    expect(isPregnancyUnsafe('Braise', ['dry vermouth'])).toBe(true)
    expect(isPregnancyUnsafe('Champagne Risotto', [])).toBe(true)
    expect(isPregnancyUnsafe('Prosecco Sorbet', [])).toBe(true)
    expect(isPregnancyUnsafe('Steak au Poivre', ['cognac'])).toBe(true)
    expect(isPregnancyUnsafe('Chicken Marsala', [])).toBe(true)
    expect(isPregnancyUnsafe('Gin Cured Salmon', [])).toBe(true)
    expect(isPregnancyUnsafe('Teriyaki', ['mirin'])).toBe(true)
  })

  it('matches "gin" only as a whole word', () => {
    expect(isPregnancyUnsafe('Ginger Chicken', ['fresh ginger'])).toBe(false)
    expect(isPregnancyUnsafe('Engine Room Chili', [])).toBe(false)
    expect(isPregnancyUnsafe('Chicken Tikka Masala', [])).toBe(false)
  })

  it('does not treat pâte brisée or pâte sucrée as pâté', () => {
    expect(isPregnancyUnsafe('Apple Tart', ['pate brisee'])).toBe(false)
    expect(isPregnancyUnsafe('Apple Tart', ['pate brisée'])).toBe(false)
    expect(isPregnancyUnsafe('Lemon Tart', ['pate sucree'])).toBe(false)
    expect(isPregnancyUnsafe('Lemon Tart', ['pâte sucrée'])).toBe(false)
    expect(isPregnancyUnsafe('Quiche', ['pâte brisée'])).toBe(false)
    expect(isPregnancyUnsafe('Chicken liver pate', [])).toBe(true)
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

  it('stays true up to 28 days past due', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, -1) }, today)).toBe(true)
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, -28) }, today)).toBe(true)
  })

  it('is false more than 28 days past due', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, -29) }, today)).toBe(false)
  })

  it('fails safe (true) for a due date more than 300 days out', () => {
    expect(isCurrentlyPregnant({ is_pregnant: true, due_date: daysFromToday(today, 301) }, today)).toBe(true)
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

  it('fails safe when the nutrition_targets read errors', () => {
    expect(source).toMatch(/if \(nutritionResult\.error\)\s*\{[^}]*pregnancyUnknown = true/)
    expect(source).toContain('const pregnancyActive = pregnancyUnknown || nutritionTargets.some(')
    expect(source).toContain('pregnancySafety: { active: true, checked: pregnancySafetyChecked, ...(pregnancyUnknown ? { unknown: true } : {}) }')
  })

  it('restricts guardrail swap pools to the pregnancy-safe shortlist', () => {
    expect(source).toContain('const pregnancySafeShortlistIds = new Set(shortlistedRecipes.map((r) => r.id));')
    expect(source).toMatch(/const poolForSlot = [\s\S]{0,400}\(!pregnancyActive \|\| pregnancySafeShortlistIds\.has\(r\.id\)\)/)
  })

  it('tops up the shortlist so every slot type still to fill has tagged candidates', () => {
    expect(source).toContain('const MIN_SHORTLIST_PER_SLOT = 6;')
    expect(source).toMatch(/for \(const slotName of neededSlotNames\)[\s\S]{0,400}\.includes\(slotName\) &&\s*!pregnancyUnsafeIds\.has\(r\.id\)/)
    expect(source.indexOf('shortlistedIds = [...toppedUpIds];')).toBeLessThan(source.indexOf('const shortlistedSet = new Set(shortlistedIds);'))
  })

  it('accepts the forced safety re-check without comparing violation counts', () => {
    const block = source.slice(source.indexOf('const acceptForcedCheck'), source.indexOf('if (acceptForcedCheck ||'))
    expect(block).toContain('(parsed.slots.length > 0 || clearedByForcedPass.length > 0)')
    expect(block).not.toContain('violations')
  })

  it('screens suggested recipe descriptions, not just names', () => {
    expect(source).toContain('isPregnancyUnsafe(String(r.name ?? ""), [String(r.description ?? "")])')
  })

  it('selects the new profile columns from nutrition_targets', () => {
    expect(source).toMatch(/from\("nutrition_targets"\)\s*\.select\("[^"]*is_pregnant, due_date, notes/)
  })
})
