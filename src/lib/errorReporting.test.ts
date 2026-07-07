import { describe, it, expect } from 'vitest'
import { createReportGate } from './errorReporting'

describe('createReportGate', () => {
  it('allows distinct messages up to the cap', () => {
    const gate = createReportGate(3)
    expect(gate('a')).toBe(true)
    expect(gate('b')).toBe(true)
    expect(gate('c')).toBe(true)
    expect(gate('d')).toBe(false)
  })

  it('drops repeats of the same message', () => {
    const gate = createReportGate(10)
    expect(gate('same')).toBe(true)
    expect(gate('same')).toBe(false)
    expect(gate('other')).toBe(true)
  })

  it('repeats do not consume the cap', () => {
    const gate = createReportGate(2)
    expect(gate('a')).toBe(true)
    expect(gate('a')).toBe(false)
    expect(gate('b')).toBe(true)
  })
})
