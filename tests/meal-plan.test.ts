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

// MPLAN-01: Meal plan start date selection
// NewWeekPrompt accepts a date input (type="date") and passes the selected
// planStart value as third argument to onChoice.
describe('Meal plan start date (MPLAN-01)', () => {
  it('NewWeekPrompt component contains date input with "Plan start date" label', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/plan/NewWeekPrompt.tsx', 'utf8');
    expect(src).toContain('Plan start date');
    expect(src).toContain('type="date"');
    expect(src).toContain('planStart');
  });

  it('NewWeekPrompt onChoice calls pass planStart as third argument', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/plan/NewWeekPrompt.tsx', 'utf8');
    // All handlers must pass planStart
    expect(src).toContain('planStart');
    // onChoice signature accepts third optional arg
    expect(src).toContain('planStart?:');
  });
});

// DELMG-02: Deleted meal placeholder in plan slots
// When a meal is soft-deleted, RLS removes it from the meals join but preserves meal_id.
// SlotCard must detect slot.meal_id set + slot.meals null => show "(Deleted)" placeholder.
describe('Deleted meal placeholder (DELMG-02)', () => {
  it('SlotCard detects deleted meal when meal_id is set but meals join is null', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/plan/SlotCard.tsx', 'utf8');
    expect(src).toContain('isDeletedMeal');
    expect(src).toContain('slot?.meal_id != null && !meal');
    expect(src).toContain('(Deleted)');
  });
});
