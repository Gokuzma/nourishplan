import { useApplySuggestedTargets } from '../../hooks/useNutritionTargets'
import { suggestTargets, targetsDifferFromSuggestion } from '../../utils/nutritionProfile'
import type { MemberStats, ProfileField, SuggestedTargets } from '../../utils/nutritionProfile'
import type { NutritionTarget } from '../../types/database'

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  isChild: boolean
  target: NutritionTarget | null
  canEdit: boolean
}

const FIELD_LABEL: Record<ProfileField, string> = {
  birth_date: 'birth date',
  sex: 'sex',
  height_cm: 'height',
  weight_kg: 'weight',
  activity_level: 'activity level',
  due_date: 'due date',
}

const DISCLAIMER: Record<SuggestedTargets['kind'], string> = {
  adult: 'Estimates only.',
  pregnant: 'Estimates only. Check with your doctor or midwife.',
  child: 'Estimates only. Check with your pediatrician.',
}

function statsFromTarget(target: NutritionTarget | null): MemberStats {
  return {
    birth_date: target?.birth_date ?? null,
    sex: target?.sex ?? null,
    height_cm: target?.height_cm ?? null,
    weight_kg: target?.weight_kg ?? null,
    target_weight_kg: target?.target_weight_kg ?? null,
    pre_pregnancy_weight_kg: target?.pre_pregnancy_weight_kg ?? null,
    activity_level: target?.activity_level ?? null,
    is_pregnant: target?.is_pregnant ?? false,
    due_date: target?.due_date ?? null,
  }
}

export function SuggestedTargetsCard({
  householdId,
  memberId,
  memberType,
  isChild,
  target,
  canEdit,
}: Props) {
  const apply = useApplySuggestedTargets()
  const result = suggestTargets(statsFromTarget(target), isChild, new Date())

  let body: React.ReactNode
  if (!result.ok) {
    body =
      result.reason === 'under_one' ? (
        <p className="text-sm text-text/70">Under 1 year: talk to your pediatrician.</p>
      ) : (
        <p className="text-sm text-text/70">
          Add {result.missing.map((field) => FIELD_LABEL[field]).join(', ')} to get a suggestion
        </p>
      )
  } else {
    const { suggestion } = result
    const differs = targetsDifferFromSuggestion(target, suggestion)
    const { fiber_g, calcium_mg, iron_mg, folate_mcg } = suggestion.micronutrients
    body = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm text-text">
          <span>Calories: {suggestion.calories} kcal</span>
          <span>Protein: {suggestion.protein_g} g</span>
          <span>Carbs: {suggestion.carbs_g} g</span>
          <span>Fat: {suggestion.fat_g} g</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-text/70">
          <span>Fiber: {fiber_g} g</span>
          <span>Calcium: {calcium_mg} mg</span>
          <span>Iron: {iron_mg} mg</span>
          <span>Folate: {folate_mcg} mcg</span>
        </div>
        <ul className="flex flex-col gap-1 text-xs text-text/60">
          {suggestion.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-xs text-text/50">{DISCLAIMER[suggestion.kind]}</p>
        {target?.calories != null && differs && (
          <p className="text-sm text-text/70">Your targets differ from the suggestion</p>
        )}
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!differs || apply.isPending}
              onClick={() => apply.mutate({ householdId, memberId, memberType, existing: target, suggestion })}
              className="rounded-btn bg-primary px-5 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {differs ? 'Apply to targets' : 'Targets match suggestion'}
            </button>
            {apply.isError && (
              <span className="text-sm text-red-500">
                {apply.error instanceof Error ? apply.error.message : 'Failed to apply.'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-card border border-accent/30 bg-surface p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text/60">
        Suggested targets
      </h3>
      <p className="mb-3 text-xs text-text/50">Based on your saved profile. Save changes to update.</p>
      {body}
    </div>
  )
}
