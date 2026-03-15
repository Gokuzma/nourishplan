import { describe, it, expect } from 'vitest'
import { scoreFood } from '../src/hooks/useFoodSearch'

describe('scoreFood', () => {
  it('returns 1.0 for exact match (case-insensitive)', () => {
    expect(scoreFood('Banana', 'banana')).toBe(1.0)
    expect(scoreFood('banana', 'Banana')).toBe(1.0)
  })

  it('returns 0.9 for starts-with match', () => {
    expect(scoreFood('Banana split', 'banana')).toBe(0.9)
    expect(scoreFood('banana bread', 'ban')).toBe(0.9)
  })

  it('returns 0.7 for word boundary match', () => {
    expect(scoreFood('Frozen banana', 'banana')).toBe(0.7)
    expect(scoreFood('organic banana chips', 'banana')).toBe(0.7)
  })

  it('returns 0.5 for contains match', () => {
    // 'turban' contains 'ban' but does not start with 'ban' at any word boundary
    expect(scoreFood('turban squash', 'ban')).toBe(0.5)
  })

  it('returns 0.3 for no match', () => {
    expect(scoreFood('chicken breast', 'banana')).toBe(0.3)
  })

  it('returns 0.5 for empty query', () => {
    expect(scoreFood('anything', '')).toBe(0.5)
  })
})

describe('scoreFood sort order', () => {
  it('sorts exact match before starts-with', () => {
    const foods = [
      { name: 'Banana split', id: '1' },
      { name: 'Banana', id: '2' },
    ]
    const scored = foods
      .map(f => ({ name: f.name, score: scoreFood(f.name, 'banana') }))
      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.name.length - b.name.length)
    expect(scored[0].name).toBe('Banana')
    expect(scored[1].name).toBe('Banana split')
  })

  it('sorts shorter names first within same tier', () => {
    const foods = [
      { name: 'Banana bread pudding', id: '1' },
      { name: 'Banana bread', id: '2' },
    ]
    const scored = foods
      .map(f => ({ name: f.name, score: scoreFood(f.name, 'banana') }))
      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.name.length - b.name.length)
    expect(scored[0].name).toBe('Banana bread')
    expect(scored[1].name).toBe('Banana bread pudding')
  })
})
