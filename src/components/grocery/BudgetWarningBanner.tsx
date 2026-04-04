import { formatCost } from '../../utils/cost'

interface BudgetWarningBannerProps {
  overAmount: number
  weeklyBudget: number
}

export function BudgetWarningBanner({ overAmount, weeklyBudget }: BudgetWarningBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-[--radius-card] px-4 py-3 text-sm text-red-700 dark:text-red-400"
    >
      Over budget by {formatCost(overAmount)}. Your grocery estimate exceeds this week&apos;s{' '}
      {formatCost(weeklyBudget)} budget.
    </div>
  )
}
