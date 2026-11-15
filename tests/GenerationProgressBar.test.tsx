import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { GenerationProgressBar, estimateFill } from '../src/components/plan/GenerationProgressBar'

describe('estimateFill', () => {
  it('creeps within a stage from elapsed time', () => {
    expect(estimateFill(1, 20, 40)).toBe(48)
  })
  it('never drops below the stage floor', () => {
    expect(estimateFill(5, 0, 40)).toBe(90)
  })
  it('caps the creep at 95', () => {
    expect(estimateFill(1, 200, 40)).toBe(95)
  })
})

describe('GenerationProgressBar timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows elapsed time ticking and the typical duration', () => {
    render(<GenerationProgressBar passCount={1} isVisible startedAt="2026-11-15T12:00:00Z" typicalSeconds={40} />)
    expect(screen.getByText(/0:00/)).toBeTruthy()
    expect(screen.getByText(/Usually about 40 s/)).toBeTruthy()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByText(/0:05/)).toBeTruthy()
  })

  it('switches to the long-running message after the typical time', () => {
    render(<GenerationProgressBar passCount={1} isVisible startedAt="2026-11-15T12:00:00Z" typicalSeconds={40} />)
    act(() => { vi.advanceTimersByTime(41000) })
    expect(screen.getByText('Taking longer than usual, still working…')).toBeTruthy()
    expect(screen.queryByText(/Usually about/)).toBeNull()
  })

  it('counts from mount when startedAt is missing', () => {
    render(<GenerationProgressBar passCount={1} isVisible typicalSeconds={40} />)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByText(/0:03/)).toBeTruthy()
  })

  it('shows the pregnancy label from pass 3', () => {
    render(<GenerationProgressBar passCount={3} isVisible pregnancyCheck startedAt="2026-11-15T12:00:00Z" typicalSeconds={40} />)
    expect(screen.getByText('Extra safety check for pregnancy')).toBeTruthy()
  })

  it('keeps the normal label before pass 3 when pregnancyCheck is set', () => {
    render(<GenerationProgressBar passCount={2} isVisible pregnancyCheck typicalSeconds={40} />)
    expect(screen.queryByText('Extra safety check for pregnancy')).toBeNull()
  })

  it('hides the Usually-about subtitle on timeout', () => {
    render(<GenerationProgressBar passCount={3} isVisible isTimeout typicalSeconds={40} />)
    expect(screen.queryByText(/Usually about/)).toBeNull()
  })
})
