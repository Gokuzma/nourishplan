import { describe, it, expect } from 'vitest'
import { kgToLb, lbToKg, cmToFtIn, ftInToCm } from './units'

describe('units', () => {
  it('round-trips 5 ft 4 in', () => {
    expect(cmToFtIn(ftInToCm(5, 4))).toEqual({ ft: 5, in: 4 })
  })

  it('round-trips 150 lb', () => {
    expect(kgToLb(lbToKg(150))).toBe(150)
  })

  it('converts with exact factors', () => {
    expect(lbToKg(100)).toBeCloseTo(45.36, 2)
    expect(ftInToCm(6, 0)).toBeCloseTo(182.9, 1)
    expect(kgToLb(70)).toBe(154.3)
  })

  it('rolls 12 inches into the next foot', () => {
    expect(cmToFtIn(182.8)).toEqual({ ft: 6, in: 0 })
  })
})
