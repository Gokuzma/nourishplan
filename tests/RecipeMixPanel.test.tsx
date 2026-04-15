import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { RecipeMixPanel, getRecipeMix } from '../src/components/plan/RecipeMixPanel'

const HOUSEHOLD_ID = 'hh-test'
const STORAGE_KEY = `plan-recipe-mix-${HOUSEHOLD_ID}`

describe('RecipeMixPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders collapsed header "Recipe mix" with aria-expanded="false"', () => {
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    const header = screen.getByRole('button', { name: /Recipe mix/i })
    expect(header).not.toBeNull()
    expect(header.getAttribute('aria-expanded')).toBe('false')
    // Sliders should not be in the DOM when collapsed
    expect(screen.queryByLabelText('Favorites percentage')).toBeNull()
  })

  it('expands to reveal three sliders after clicking the header', () => {
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    const header = screen.getByRole('button', { name: /Recipe mix/i })
    fireEvent.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('true')
    expect(screen.queryByLabelText('Favorites percentage')).not.toBeNull()
    expect(screen.queryByLabelText('Liked percentage')).not.toBeNull()
    expect(screen.queryByLabelText('Novel percentage')).not.toBeNull()
  })

  it('shows default values 50/30/20 when localStorage is empty', () => {
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    fireEvent.click(screen.getByRole('button', { name: /Recipe mix/i }))
    const favorites = screen.getByLabelText('Favorites percentage') as HTMLInputElement
    const liked = screen.getByLabelText('Liked percentage') as HTMLInputElement
    const novel = screen.getByLabelText('Novel percentage') as HTMLInputElement
    expect(favorites.value).toBe('50')
    expect(liked.value).toBe('30')
    expect(novel.value).toBe('20')
  })

  it('hydrates sliders from valid localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites: 40, liked: 40, novel: 20 }))
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    fireEvent.click(screen.getByRole('button', { name: /Recipe mix/i }))
    const favorites = screen.getByLabelText('Favorites percentage') as HTMLInputElement
    const liked = screen.getByLabelText('Liked percentage') as HTMLInputElement
    const novel = screen.getByLabelText('Novel percentage') as HTMLInputElement
    expect(favorites.value).toBe('40')
    expect(liked.value).toBe('40')
    expect(novel.value).toBe('20')
  })

  it('falls back to defaults on malformed localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    fireEvent.click(screen.getByRole('button', { name: /Recipe mix/i }))
    const favorites = screen.getByLabelText('Favorites percentage') as HTMLInputElement
    const liked = screen.getByLabelText('Liked percentage') as HTMLInputElement
    const novel = screen.getByLabelText('Novel percentage') as HTMLInputElement
    expect(favorites.value).toBe('50')
    expect(liked.value).toBe('30')
    expect(novel.value).toBe('20')
  })

  it('auto-rebalances the other two sliders so the total stays at 100 after a change', () => {
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    fireEvent.click(screen.getByRole('button', { name: /Recipe mix/i }))
    const favorites = screen.getByLabelText('Favorites percentage') as HTMLInputElement
    fireEvent.change(favorites, { target: { value: '70' } })

    const liked = screen.getByLabelText('Liked percentage') as HTMLInputElement
    const novel = screen.getByLabelText('Novel percentage') as HTMLInputElement
    const total =
      Number(favorites.value) + Number(liked.value) + Number(novel.value)
    expect(total).toBe(100)
    expect(Number(favorites.value)).toBe(70)
  })

  it('persists serialized mix summing to 100 to localStorage on change', () => {
    render(React.createElement(RecipeMixPanel, { householdId: HOUSEHOLD_ID }))
    fireEvent.click(screen.getByRole('button', { name: /Recipe mix/i }))
    const favorites = screen.getByLabelText('Favorites percentage') as HTMLInputElement
    fireEvent.change(favorites, { target: { value: '60' } })

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!) as { favorites: number; liked: number; novel: number }
    expect(parsed.favorites).toBe(60)
    expect(parsed.favorites + parsed.liked + parsed.novel).toBe(100)
  })

  it('getRecipeMix returns stored values when valid, defaults otherwise', () => {
    // Missing key
    expect(getRecipeMix('missing-household')).toEqual({ favorites: 50, liked: 30, novel: 20 })

    // Valid stored shape
    localStorage.setItem(
      'plan-recipe-mix-h1',
      JSON.stringify({ favorites: 45, liked: 35, novel: 20 }),
    )
    expect(getRecipeMix('h1')).toEqual({ favorites: 45, liked: 35, novel: 20 })

    // Invalid shape (non-numeric field)
    localStorage.setItem(
      'plan-recipe-mix-h2',
      JSON.stringify({ favorites: 'nope', liked: 30, novel: 20 }),
    )
    expect(getRecipeMix('h2')).toEqual({ favorites: 50, liked: 30, novel: 20 })

    // Sum significantly off 100
    localStorage.setItem(
      'plan-recipe-mix-h3',
      JSON.stringify({ favorites: 10, liked: 10, novel: 10 }),
    )
    expect(getRecipeMix('h3')).toEqual({ favorites: 50, liked: 30, novel: 20 })
  })
})
