// V-01: parseStepsSafely malformed JSON resilience unit tests
import { describe, it, expect } from 'vitest'
import { parseStepsSafely, isValidRecipeStep, generateStepId } from '../src/utils/recipeSteps'
import type { RecipeStep } from '../src/types/database'

const validStep: RecipeStep = {
  id: 'step-1',
  text: 'Chop the vegetables',
  duration_minutes: 5,
  is_active: false,
  ingredients_used: ['carrot', 'onion'],
  equipment: ['knife', 'cutting board'],
}

describe('parseStepsSafely (V-01)', () => {
  it('returns null for null input', () => {
    expect(parseStepsSafely(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseStepsSafely(undefined)).toBeNull()
  })

  it('returns null for string input', () => {
    expect(parseStepsSafely('not an array')).toBeNull()
  })

  it('returns null for number input', () => {
    expect(parseStepsSafely(42)).toBeNull()
  })

  it('returns null for object input (non-array)', () => {
    expect(parseStepsSafely({ id: 'step-1' })).toBeNull()
  })

  it('returns empty array for empty array input', () => {
    expect(parseStepsSafely([])).toEqual([])
  })

  it('returns the array for a valid single step', () => {
    const result = parseStepsSafely([validStep])
    expect(result).toEqual([validStep])
  })

  it('returns the array for multiple valid steps', () => {
    const step2: RecipeStep = { ...validStep, id: 'step-2', text: 'Boil water' }
    const result = parseStepsSafely([validStep, step2])
    expect(result).toHaveLength(2)
  })

  it('returns null when a step is missing required id field', () => {
    const { id: _omit, ...missingId } = validStep
    expect(parseStepsSafely([missingId])).toBeNull()
  })

  it('returns null when a step has an empty id string', () => {
    expect(parseStepsSafely([{ ...validStep, id: '' }])).toBeNull()
  })

  it('returns null when a step has a negative duration_minutes', () => {
    expect(parseStepsSafely([{ ...validStep, duration_minutes: -1 }])).toBeNull()
  })

  it('returns null when a step has NaN duration_minutes', () => {
    expect(parseStepsSafely([{ ...validStep, duration_minutes: NaN }])).toBeNull()
  })

  it('returns null when a step has Infinity duration_minutes', () => {
    expect(parseStepsSafely([{ ...validStep, duration_minutes: Infinity }])).toBeNull()
  })

  it('accepts zero duration_minutes as valid', () => {
    const result = parseStepsSafely([{ ...validStep, duration_minutes: 0 }])
    expect(result).not.toBeNull()
  })

  it('returns null when a step has non-string text', () => {
    expect(parseStepsSafely([{ ...validStep, text: 123 }])).toBeNull()
  })

  it('returns null when a step has non-boolean is_active', () => {
    expect(parseStepsSafely([{ ...validStep, is_active: 'true' }])).toBeNull()
  })

  it('returns null when ingredients_used contains non-string values', () => {
    expect(parseStepsSafely([{ ...validStep, ingredients_used: [1, 2] }])).toBeNull()
  })

  it('returns null when equipment contains non-string values', () => {
    expect(parseStepsSafely([{ ...validStep, equipment: [null] }])).toBeNull()
  })

  it('returns null when any step in a mixed array is invalid', () => {
    const invalidStep = { id: '', text: 'bad step', duration_minutes: 5, is_active: false, ingredients_used: [], equipment: [] }
    expect(parseStepsSafely([validStep, invalidStep])).toBeNull()
  })

  it('returns null for array of primitive values', () => {
    expect(parseStepsSafely([1, 2, 3])).toBeNull()
  })

  it('returns null for array of null values', () => {
    expect(parseStepsSafely([null])).toBeNull()
  })
})

describe('isValidRecipeStep (V-01)', () => {
  it('returns true for a valid step', () => {
    expect(isValidRecipeStep(validStep)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isValidRecipeStep(null)).toBe(false)
  })

  it('returns false for a plain string', () => {
    expect(isValidRecipeStep('step')).toBe(false)
  })

  it('returns false when id is an empty string', () => {
    expect(isValidRecipeStep({ ...validStep, id: '' })).toBe(false)
  })

  it('returns false when duration_minutes is negative', () => {
    expect(isValidRecipeStep({ ...validStep, duration_minutes: -5 })).toBe(false)
  })

  it('returns false when is_active is not a boolean', () => {
    expect(isValidRecipeStep({ ...validStep, is_active: 1 })).toBe(false)
  })

  it('returns false when ingredients_used is not an array', () => {
    expect(isValidRecipeStep({ ...validStep, ingredients_used: 'carrot' })).toBe(false)
  })

  it('returns false when equipment is not an array', () => {
    expect(isValidRecipeStep({ ...validStep, equipment: null })).toBe(false)
  })
})

describe('generateStepId (V-01)', () => {
  it('returns a non-empty string', () => {
    const id = generateStepId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns unique values on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateStepId()))
    expect(ids.size).toBe(10)
  })
})
