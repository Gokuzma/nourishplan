import type { NutritionTarget, FoodLog, MacroSummary } from '../types/database';
import { calcLogEntryNutrition } from './nutrition';

export interface MemberInput {
  memberId: string
  memberName: string
  memberType: 'user' | 'profile'
  target: NutritionTarget | null
  logsToday: FoodLog[]
}

export interface MemberSuggestion {
  memberId: string
  memberName: string
  memberType: 'user' | 'profile'
  percentage: number | null  // null for members without targets
  servings: number           // 1.0 default for no-target members
  hasMacroWarning: boolean
}

export interface PortionResult {
  suggestions: MemberSuggestion[]
  leftoverPercentage: number  // 100 - sum(percentages of members with targets)
}

/**
 * Returns how many calories a member still has available today.
 * Clamps at zero — never returns a negative value.
 */
export function calcRemainingCalories(
  target: NutritionTarget | null,
  logs: FoodLog[],
): number {
  if (!target || target.calories == null) return 0;

  const logged = logs.reduce((sum, log) => {
    return sum + calcLogEntryNutrition(log).calories;
  }, 0);

  return Math.max(0, target.calories - logged);
}

/**
 * Calculates proportional portion suggestions for each household member.
 *
 * Members with calorie targets are split proportionally by their remaining
 * daily calories. Members without targets receive 1.0 serving with null percentage.
 * If all eligible members have zero remaining, everyone defaults to 1.0 serving.
 *
 * The current user is always placed first in the suggestions array.
 */
export function calcPortionSuggestions(
  members: MemberInput[],
  dishCaloriesPerServing: number,
  dishMacrosPerServing: MacroSummary,
  currentUserId: string,
): PortionResult {
  // Separate members with and without targets
  const withTarget = members.filter(m => m.target !== null);
  const withoutTarget = members.filter(m => m.target === null);

  // Calculate remaining calories for each member with a target
  const remainingMap = new Map<string, number>();
  for (const m of withTarget) {
    remainingMap.set(m.memberId, calcRemainingCalories(m.target, m.logsToday));
  }

  const totalRemaining = Array.from(remainingMap.values()).reduce((a, b) => a + b, 0);
  const allZero = totalRemaining === 0;

  const suggestions: MemberSuggestion[] = [];

  // Members with targets get proportional servings
  for (const m of withTarget) {
    const remaining = remainingMap.get(m.memberId) ?? 0;

    let percentage: number;
    let servings: number;

    if (allZero) {
      percentage = withTarget.length > 0 ? 100 / withTarget.length : 100;
      servings = 1.0;
    } else {
      percentage = (remaining / totalRemaining) * 100;
      servings = dishCaloriesPerServing > 0
        ? (remaining / totalRemaining)
        : 1.0;
    }

    const portionMacros: MacroSummary = {
      calories: dishMacrosPerServing.calories * servings,
      protein: dishMacrosPerServing.protein * servings,
      fat: dishMacrosPerServing.fat * servings,
      carbs: dishMacrosPerServing.carbs * servings,
    };

    suggestions.push({
      memberId: m.memberId,
      memberName: m.memberName,
      memberType: m.memberType,
      percentage,
      servings,
      hasMacroWarning: hasMacroWarning(m.target, m.logsToday, portionMacros),
    });
  }

  // Members without targets get 1.0 serving default with null percentage
  for (const m of withoutTarget) {
    suggestions.push({
      memberId: m.memberId,
      memberName: m.memberName,
      memberType: m.memberType,
      percentage: null,
      servings: 1.0,
      hasMacroWarning: false,
    });
  }

  // Sort: current user first, then preserve original order
  suggestions.sort((a, b) => {
    if (a.memberId === currentUserId) return -1;
    if (b.memberId === currentUserId) return 1;
    return 0;
  });

  // Leftover = 100 - sum of percentages for members with targets
  const sumPercentages = suggestions
    .filter(s => s.percentage !== null)
    .reduce((sum, s) => sum + (s.percentage ?? 0), 0);
  const leftoverPercentage = allZero ? 0 : Math.max(0, 100 - sumPercentages);

  return { suggestions, leftoverPercentage };
}

/**
 * Returns true if the suggested portion would push any macro >20% over or under
 * the member's daily target when combined with what is already logged.
 *
 * Over-warning:  logged + portion > target * 1.2
 * Under-warning: logged + portion < target * 0.8
 *
 * A null target or a null individual macro target skips that check.
 */
export function hasMacroWarning(
  target: NutritionTarget | null,
  logs: FoodLog[],
  portionMacros: MacroSummary,
): boolean {
  if (!target) return false;

  const loggedTotals = logs.reduce(
    (acc, log) => {
      const n = calcLogEntryNutrition(log);
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        fat: acc.fat + n.fat,
        carbs: acc.carbs + n.carbs,
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  function checkMacro(loggedAmount: number, portionAmount: number, targetAmount: number | null): boolean {
    if (targetAmount == null || targetAmount === 0) return false;
    const total = loggedAmount + portionAmount;
    return total > targetAmount * 1.2 || total < targetAmount * 0.8;
  }

  return (
    checkMacro(loggedTotals.protein, portionMacros.protein, target.protein_g) ||
    checkMacro(loggedTotals.carbs, portionMacros.carbs, target.carbs_g) ||
    checkMacro(loggedTotals.fat, portionMacros.fat, target.fat_g)
  );
}
