import { describe, it, expect } from 'vitest';
import { getWeekStart } from '../src/utils/mealPlan';

describe('getWeekStart', () => {
  it('returns the same date when today is the week start day (Sunday start)', () => {
    // 2026-03-15 is a Sunday
    const result = getWeekStart(new Date('2026-03-15'), 0);
    expect(result).toBe('2026-03-15');
  });

  it('returns previous Sunday for a mid-week date (Sunday start)', () => {
    // 2026-03-18 is a Wednesday
    const result = getWeekStart(new Date('2026-03-18'), 0);
    expect(result).toBe('2026-03-15');
  });

  it('returns correct week start for Thursday start day', () => {
    // 2026-03-18 is a Wednesday, so week started on 2026-03-12 (Thursday)
    const result = getWeekStart(new Date('2026-03-18'), 4);
    expect(result).toBe('2026-03-12');
  });

  it('returns the same date when today is the custom start day (Thursday)', () => {
    // 2026-03-12 is a Thursday
    const result = getWeekStart(new Date('2026-03-12'), 4);
    expect(result).toBe('2026-03-12');
  });

  it('handles week boundary crossing a month boundary', () => {
    // 2026-03-02 is a Monday (UTC), week start Sunday = 2026-03-01
    const result = getWeekStart(new Date('2026-03-02'), 0);
    expect(result).toBe('2026-03-01');
  });

  it('handles week start on Monday (weekStartDay=1)', () => {
    // 2026-03-18 is a Wednesday (UTC), week started on 2026-03-16 (Monday)
    const result = getWeekStart(new Date('2026-03-18'), 1);
    expect(result).toBe('2026-03-16');
  });
});
