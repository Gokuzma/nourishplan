import { describe, it, expect } from 'vitest'
import {
  pctToGrams,
  gramsToPct,
  isMacroSumValid,
  PROTEIN_KCAL_PER_G,
  CARBS_KCAL_PER_G,
  FAT_KCAL_PER_G,
} from '../macroConversion'

describe('macroConversion constants', () => {
  it('PROTEIN_KCAL_PER_G is 4', () => {
    expect(PROTEIN_KCAL_PER_G).toBe(4)
  })
  it('CARBS_KCAL_PER_G is 4', () => {
    expect(CARBS_KCAL_PER_G).toBe(4)
  })
  it('FAT_KCAL_PER_G is 9', () => {
    expect(FAT_KCAL_PER_G).toBe(9)
  })
})

describe('pctToGrams', () => {
  it('converts 30% of 2000 kcal at 4 kcal/g to 150g', () => {
    expect(pctToGrams(30, 2000, 4)).toBe(150)
  })

  it('converts 30% of 2000 kcal at 9 kcal/g to 67g (fat)', () => {
    expect(pctToGrams(30, 2000, 9)).toBe(67)
  })

  it('returns 0 when pct is 0', () => {
    expect(pctToGrams(0, 2000, 4)).toBe(0)
  })

  it('returns 0 when calories is 0', () => {
    expect(pctToGrams(30, 0, 4)).toBe(0)
  })
})

describe('gramsToPct', () => {
  it('converts 150g at 4 kcal/g with 2000 kcal to 30%', () => {
    expect(gramsToPct(150, 2000, 4)).toBe(30)
  })

  it('returns 0 when grams is 0', () => {
    expect(gramsToPct(0, 2000, 4)).toBe(0)
  })

  it('returns 0 when calories is 0 (zero division guard)', () => {
    expect(gramsToPct(100, 0, 4)).toBe(0)
  })
})

describe('isMacroSumValid', () => {
  it('returns true when P+C+F = 100', () => {
    expect(isMacroSumValid(30, 40, 30)).toBe(true)
  })

  it('returns false when P+C+F = 101 (exceeds 0.5 tolerance)', () => {
    expect(isMacroSumValid(30, 40, 31)).toBe(false)
  })

  it('returns true when sum is 100.1 (within 0.5 tolerance)', () => {
    expect(isMacroSumValid(33.3, 33.3, 33.4)).toBe(true)
  })

  it('returns false when sum is 99 (below tolerance)', () => {
    expect(isMacroSumValid(30, 30, 39)).toBe(false)
  })
})
