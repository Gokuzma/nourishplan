import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  useCookSession,
  useCreateCookSession,
  useUpdateCookStep,
  useCompleteCookSession,
  useLatestCookSessionForMeal,
  useActiveCookSessions,
} from '../hooks/useCookSession'
import { useRecipeSteps } from '../hooks/useRecipeSteps'
import { useMealPlanSlots } from '../hooks/useMealPlan'
import { CookModeShell } from '../components/cook/CookModeShell'
import { CookStepPrimaryAction } from '../components/cook/CookStepPrimaryAction'
import { ReheatSequenceCard } from '../components/cook/ReheatSequenceCard'
import { MultiMealPromptOverlay } from '../components/cook/MultiMealPromptOverlay'
import { NotificationPermissionBanner } from '../components/cook/NotificationPermissionBanner'
import { InAppTimerAlert } from '../components/cook/InAppTimerAlert'
import { fireStepDoneNotification, playTimerChime } from '../components/cook/CookTimerNotifications'
import type { RecipeStep } from '../types/database'
import { useRecipe, useRecipeIngredients } from '../hooks/useRecipes'
import { useMeal } from '../hooks/useMeals'
import { useCookCompletion } from '../hooks/useCookCompletion'
import { CookDeductionReceipt } from '../components/inventory/CookDeductionReceipt'
import { AddInventoryItemModal } from '../components/inventory/AddInventoryItemModal'
import type { DeductionResult } from '../hooks/useInventoryDeduct'
import { useGenerateCookSequence } from '../hooks/useGenerateCookSequence'
import { useGenerateReheatSequence } from '../hooks/useGenerateReheatSequence'
import { CookSequenceLoadingOverlay } from '../components/cook/CookSequenceLoadingOverlay'

// D-21 flow modes
type FlowMode = 'loading' | 'resume-prompt' | 'multi-meal-prompt' | 'reheat' | 'cook' | 'error'

// D-02 fallback: hardcoded 3-step microwave sequence used when generate-reheat-sequence fails.
// This array is the silent-fall-through target per CONTEXT.md D-02 and UI-SPEC line 182.
const HARDCODED_REHEAT_FALLBACK: { id: string; text: string }[] = [
  { id: 'reheat-1', text: 'Remove from storage and place in a microwave-safe container.' },
  { id: 'reheat-2', text: 'Heat on medium power, stirring halfway through.' },
  { id: 'reheat-3', text: 'Check temperature is hot throughout before serving.' },
]

export function CookModePage() {
  const { mealId, sessionId: routeSessionId } = useParams<{ mealId?: string; sessionId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session: authSession } = useAuth()

  const slotId = searchParams.get('slotId') ?? undefined
  const planId = searchParams.get('planId') ?? undefined
  const source = searchParams.get('source') ?? undefined

  // For D-21 flow branching — look up schedule_status from the slot
  const { data: slots } = useMealPlanSlots(planId)
  const currentSlot = slots?.find(s => s.id === slotId) ?? null
  const scheduleStatus = (currentSlot as { schedule_status?: 'prep' | 'consume' | 'quick' | 'away' } | null)?.schedule_status ?? null

  // Existing session from URL (session resume route)
  const { data: routeSession, isFetching: routeSessionFetching } = useCookSession(routeSessionId)
  // When routeSessionId is undefined, the query is disabled — treat as not loading
  const routeSessionLoading = !!routeSessionId && routeSessionFetching

  // Latest in-progress session for this meal (D-22 resume detection)
  const { data: existingSession, isFetching: existingSessionFetching } = useLatestCookSessionForMeal(mealId)
  const existingSessionLoading = !!mealId && existingSessionFetching

  // All active sessions (D-26 MultiMealSwitcher)
  const { data: activeSessions = [] } = useActiveCookSessions()

  // Active session in use
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(routeSessionId)
  const { data: activeSession } = useCookSession(activeSessionId)

  // Notification state (D-25, R-03)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const [timerAlert, setTimerAlert] = useState<{ stepText: string; mealName: string } | null>(null)
  const notificationPromptShownRef = useRef(false)

  const createSession = useCreateCookSession()
  const updateStep = useUpdateCookStep()
  const completeSession = useCompleteCookSession()
  const generateCookSequence = useGenerateCookSequence()
  const generateReheatSequence = useGenerateReheatSequence()

  // For single-recipe cook: load recipe steps live (R-02 — live-bound, not snapshotted)
  // When entering from a plan slot (source !== 'recipe'), mealId is a meal_id — resolve
  // the recipe_id(s) from the meal's meal_items (item_type='recipe') rows.
  const isFromRecipe = source === 'recipe'
  const { data: mealData } = useMeal(!isFromRecipe && mealId ? mealId : '')
  const mealRecipeIds: string[] = mealData?.meal_items
    ? mealData.meal_items.filter(i => i.item_type === 'recipe').map(i => i.item_id)
    : []
  const recipeIdForSteps = activeSession?.recipe_ids[0]
    ?? (isFromRecipe ? mealId : mealRecipeIds[0])
  const { data: cookingRecipe } = useRecipe(recipeIdForSteps ?? '')
  const { data: cookingIngredients } = useRecipeIngredients(recipeIdForSteps ?? '')
  const { runCookCompletion } = useCookCompletion()
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
  const [showLeftoverModal, setShowLeftoverModal] = useState(false)
  const [leftoverContext, setLeftoverContext] = useState<{ recipeName: string; recipeId: string } | null>(null)
  const { data: recipeStepsData } = useRecipeSteps(recipeIdForSteps)
  const liveSteps: RecipeStep[] = recipeStepsData?.instructions ?? []

  // Flow mode state machine
  const [flowMode, setFlowMode] = useState<FlowMode>('loading')

  useEffect(() => {
    const isLoading = routeSessionLoading || existingSessionLoading
    if (isLoading) return

    // Resuming a specific session directly
    if (routeSessionId && routeSession) {
      setActiveSessionId(routeSessionId)
      setFlowMode('cook')
      return
    }

    // Existing active session for this meal — offer resume (D-22)
    if (!routeSessionId && existingSession) {
      setFlowMode('resume-prompt')
      return
    }

    // D-21: consume slot → reheat flow
    if (scheduleStatus === 'consume') {
      setFlowMode('reheat')
      return
    }

    // D-21: prep slot with multiple recipes → multi-meal prompt
    if (scheduleStatus === 'prep' && currentSlot !== null) {
      // Multiple recipes inferred from the session context — show prompt
      setFlowMode('multi-meal-prompt')
      return
    }

    // Default: full cook mode
    setFlowMode('cook')
  }, [routeSessionId, routeSession, routeSessionLoading, existingSession, existingSessionLoading, scheduleStatus, currentSlot])

  // D-02: auto-fire reheat-sequence mutation when entering the reheat branch
  useEffect(() => {
    if (flowMode !== 'reheat') return
    if (!recipeIdForSteps) return
    if (generateReheatSequence.isPending || generateReheatSequence.isSuccess || generateReheatSequence.isError) return
    const storage = recipeStepsData?.freezer_friendly ? 'freezer' : 'fridge'
    generateReheatSequence.mutate({
      recipeId: recipeIdForSteps,
      storageHint: storage,
    })
  }, [flowMode, recipeIdForSteps, recipeStepsData, generateReheatSequence])

  // Computed step state from active session (R-02: keyed by stable step id)
  const stepOrder = activeSession?.step_state.order ?? []
  const stepStates = activeSession?.step_state.steps ?? {}

  // Use live recipe steps for the step text/metadata; match by step id
  const stepsById = new Map(liveSteps.map(s => [s.id, s]))

  const completedSteps = stepOrder.filter(id => stepStates[id]?.completed_at != null).length
  const totalSteps = stepOrder.length

  // Active step = first in order that is not completed
  const activeStepId = stepOrder.find(id => stepStates[id]?.completed_at == null) ?? null
  const activeStep = activeStepId ? stepsById.get(activeStepId) ?? null : null

  const isLastStep = activeStepId != null && stepOrder[stepOrder.length - 1] === activeStepId
  const allDone = totalSteps > 0 && completedSteps === totalSteps

  // LIMITATION (documented per R-03): When the user closes the app tab while a timer
  // is running, the service worker cannot fire a setTimeout to trigger showNotification
  // at the correct time. The timer_started_at is persisted server-side, so when the user
  // returns, the timer state is recomputed and if expired, the in-app fallback fires
  // immediately. OS-level timer scheduling would require a background sync API or push
  // notifications, which are out of scope for this phase.

  // Fire OS notification + mandatory in-app fallback when a passive step timer completes (D-25, R-03)
  const handleTimerComplete = useCallback(async (stepId: string) => {
    const step = stepsById.get(stepId)
    if (!step) return
    const recipeName = recipeStepsData?.name ?? 'Cook Mode'
    await fireStepDoneNotification(recipeName, step.text)
    // ALWAYS fire in-app fallback regardless of notification permission (R-03 MANDATORY)
    playTimerChime()
    setTimerAlert({ stepText: step.text, mealName: recipeName })
  }, [stepsById, recipeStepsData])

  // Timer effect: track the active step's timer_started_at from persisted session state.
  // Using useEffect instead of an inline setInterval avoids stale closures over
  // stepsById/activeSession and auto-clears when activeStepId changes (e.g. collaborator
  // marks step done remotely).
  useEffect(() => {
    const state = activeStepId ? stepStates[activeStepId] : null
    const timerStartedAt = state?.timer_started_at
    if (!timerStartedAt || !activeStepId) return
    const step = stepsById.get(activeStepId)
    if (!step || step.duration_minutes === 0) return
    const totalMs = step.duration_minutes * 60 * 1000
    const startEpoch = new Date(timerStartedAt).getTime()
    const remaining = totalMs - (Date.now() - startEpoch)
    if (remaining <= 0) {
      handleTimerComplete(activeStepId)
      return
    }
    const id = window.setTimeout(() => handleTimerComplete(activeStepId), remaining)
    return () => window.clearTimeout(id)
  }, [activeStepId, stepStates, stepsById, handleTimerComplete])

  function derivePrimaryLabel(): 'Mark complete' | 'Start timer' | 'Mark complete now' | 'Finish cook session' | 'Exit cook mode' {
    if (allDone) return 'Exit cook mode'
    if (!activeStep) return 'Exit cook mode'
    if (isLastStep) return 'Finish cook session'
    if (activeStep.duration_minutes > 0) return 'Start timer'
    return 'Mark complete'
  }

  async function handlePrimaryAction() {
    if (allDone || !activeStepId || !activeSessionId) {
      // Exit cook mode button path. If session is still in-progress, complete it + run hook.
      // If already completed (re-entry), short-circuit to navigate(-1) — D-16 idempotency.
      if (activeSessionId && activeSession?.status === 'in_progress') {
        // Capture the status snapshot BEFORE any await — Landmine 3 (D-16)
        await completeSession.mutateAsync(activeSessionId)
        await runCookCompletionIfSingleRecipe()
        return  // Deferred nav — receipt dismissal drives navigate(-1) (D-14)
      }
      navigate(-1)
      return
    }

    const label = derivePrimaryLabel()

    // "Start timer" — passive step with duration: record timer_started_at and start interval
    if (label === 'Start timer' && activeStep && activeStep.duration_minutes > 0) {
      const startedAt = new Date().toISOString()
      await updateStep.mutateAsync({
        sessionId: activeSessionId,
        stepId: activeStepId,
        patch: { timer_started_at: startedAt },
      })

      // Notification prompt: show on first passive step timer start (D-25, UI-SPEC line 317)
      if (!notificationPromptShownRef.current) {
        setShowNotificationPrompt(true)
        notificationPromptShownRef.current = true
      }

      // Timer completion is now handled by the useEffect that tracks
      // stepStates[activeStepId].timer_started_at — no inline interval needed.
      return
    }

    // Mark active step as complete
    await updateStep.mutateAsync({
      sessionId: activeSessionId,
      stepId: activeStepId,
      patch: {
        completed_at: new Date().toISOString(),
        completed_by: authSession?.user.id ?? null,
      },
    })

    if (isLastStep) {
      // Capture status snapshot BEFORE completeSession await — Landmine 3 (D-16)
      if (activeSession?.status === 'in_progress') {
        await completeSession.mutateAsync(activeSessionId)
        await runCookCompletionIfSingleRecipe()
        return  // Deferred nav — receipt dismissal drives navigate(-1) (D-14)
      }
      navigate(-1)
    }
  }

  async function runCookCompletionIfSingleRecipe() {
    // D-08/D-09: only single-recipe sessions. Combined sessions are Phase 28's scope.
    if (!activeSession || activeSession.recipe_ids.length !== 1) {
      if (activeSession && activeSession.recipe_ids.length > 1 && import.meta.env.DEV) {
        console.warn(
          `[CookMode] Combined cook session (recipe_ids.length=${activeSession.recipe_ids.length}) detected — spend/deduct/leftover skipped. Combined cooking is Phase 28's scope (PREP-02).`
        )
      }
      navigate(-1)
      return
    }
    if (!cookingIngredients || !cookingRecipe) {
      // Data not loaded yet — degrade gracefully to navigate(-1) (Landmine 1 / 8)
      navigate(-1)
      return
    }
    const recipeId = activeSession.recipe_ids[0]
    const outcome = await runCookCompletion({
      recipeId,
      recipeName: cookingRecipe.name,
      servings: cookingRecipe.servings,
      ingredients: cookingIngredients,
    })
    if (outcome.deductionResult) {
      setLeftoverContext({ recipeName: cookingRecipe.name, recipeId })
      setDeductionResult(outcome.deductionResult)
      // Receipt renders — its onClose handler drives navigate(-1) when dismissed
    } else {
      // Deduct skipped or spend failed — no receipt to show. Navigate directly.
      navigate(-1)
    }
  }

  async function handleStartCook(mode: 'combined' | 'per-recipe' | null) {
    if (!mealId) return
    const recipeIds = isFromRecipe
      ? [mealId]
      : (mealRecipeIds.length > 0 ? mealRecipeIds : (recipeIdForSteps ? [recipeIdForSteps] : []))
    const primaryRecipeId = recipeIds[0] ?? null
    const stepsByRecipeId: Record<string, RecipeStep[]> = {}
    if (primaryRecipeId && liveSteps.length > 0) {
      stepsByRecipeId[primaryRecipeId] = liveSteps
    }
    const newSession = await createSession.mutateAsync({
      meal_id: isFromRecipe ? null : mealId,
      recipe_id: recipeIds[0] ?? null,
      recipe_ids: recipeIds,
      stepsByRecipeId,
      mode,
    })

    // D-03 + D-04: fire generate-cook-sequence for multi-recipe combined/per-recipe sessions.
    // D-05: on failure, silently fall through to naive per-recipe concatenation already in newSession.step_state.order.
    if (mode !== null && recipeIds.length >= 1) {
      try {
        await generateCookSequence.mutateAsync({
          cookSessionId: newSession.id,
          recipeIds,
          mode,
          memberIds: [],
        })
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Phase 28] generate-cook-sequence failed; using per-recipe concatenation fallback', err)
        }
      }
    }

    setActiveSessionId(newSession.id)
    setFlowMode('cook')
  }

  async function handleResumeExisting() {
    if (!existingSession) return
    setActiveSessionId(existingSession.id)
    setFlowMode('cook')
  }

  async function handleStartFresh() {
    await handleStartCook(null)
  }

  // Loading state
  if (flowMode === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text/60 font-sans">Loading cook mode…</p>
      </div>
    )
  }

  // Error state
  if (flowMode === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text/60 font-sans mb-4">Something went wrong.</p>
          <button type="button" onClick={() => navigate(-1)} className="text-primary underline text-sm">Go back</button>
        </div>
      </div>
    )
  }

  // Resume prompt (D-22)
  if (flowMode === 'resume-prompt') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-text">Resume cook session?</h2>
          <p className="text-sm text-text/70 font-sans">You have an in-progress cook session for this meal.</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleResumeExisting}
              className="bg-primary text-white rounded-[--radius-btn] px-4 py-3 text-sm font-semibold w-full"
            >
              Resume session
            </button>
            <button
              type="button"
              onClick={handleStartFresh}
              className="bg-secondary border border-primary/30 text-primary rounded-[--radius-btn] px-4 py-3 text-sm font-semibold w-full"
            >
              Start fresh
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-text/50 underline self-start"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Reheat flow (D-21 consume slot)
  if (flowMode === 'reheat') {
    const storage = recipeStepsData?.freezer_friendly ? 'freezer' : 'fridge'

    // 3-state render per UI-SPEC lines 172-192
    // D-02: on error, silently fall back to HARDCODED_REHEAT_FALLBACK (no failure UX surface)
    const aiSteps = generateReheatSequence.isSuccess && generateReheatSequence.data?.steps
      ? generateReheatSequence.data.steps.map((s, idx) => ({ id: `reheat-ai-${idx}`, text: s.text }))
      : null
    const reheatSteps = aiSteps ?? (generateReheatSequence.isError ? HARDCODED_REHEAT_FALLBACK : HARDCODED_REHEAT_FALLBACK)

    if (generateReheatSequence.isError && import.meta.env.DEV) {
      console.error('[Phase 28] generate-reheat-sequence failed; using hardcoded fallback')
    }

    return (
      <div className="min-h-screen flex flex-col bg-background font-sans">
        <div className="sticky top-0 z-40 bg-surface border-b border-accent/20 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Exit cook mode" className="p-1 -ml-1 text-text/60 hover:text-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-text">Reheat</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
          {generateReheatSequence.isPending ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="Loading reheat instructions"
              className="bg-surface rounded-[--radius-card] px-4 py-4 flex flex-col gap-4"
            >
              <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border border-accent/40 bg-background" />
                  <div className="h-4 flex-1 bg-secondary rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <ReheatSequenceCard
              storage={storage}
              steps={reheatSteps}
              onDone={() => navigate(-1)}
            />
          )}
        </div>
      </div>
    )
  }

  // Multi-meal prompt (D-21 prep with multiple recipes)
  if (flowMode === 'multi-meal-prompt') {
    return (
      <>
        <div className="min-h-screen bg-background" />
        <MultiMealPromptOverlay
          recipeCount={2}
          onCombined={() => handleStartCook('combined')}
          onPerRecipe={() => handleStartCook('per-recipe')}
        />
        {generateCookSequence.isPending && <CookSequenceLoadingOverlay />}
      </>
    )
  }

  // Full cook mode (flowMode === 'cook')
  const subtitle = slotId
    ? (source === 'recipe' ? 'Standalone' : `Slot ${slotId.slice(0, 8)}`)
    : 'Standalone'

  const hasProgress = completedSteps > 0

  return (
    <>
      {timerAlert && (
        <InAppTimerAlert
          stepText={timerAlert.stepText}
          mealName={timerAlert.mealName}
          onDismiss={() => setTimerAlert(null)}
        />
      )}
      <CookModeShell
      mealName={recipeStepsData?.name ?? 'Cook Mode'}
      subtitle={subtitle}
      completedSteps={completedSteps}
      totalSteps={totalSteps}
      hasProgress={hasProgress}
      concurrentSessions={activeSessions}
      currentSessionId={activeSessionId}
      footer={
        <CookStepPrimaryAction
          label={derivePrimaryLabel()}
          onTap={handlePrimaryAction}
          pulse={allDone}
        />
      }
    >
      {showNotificationPrompt && (
        <NotificationPermissionBanner
          onPermissionChange={() => setShowNotificationPrompt(false)}
        />
      )}

      {/* Inline step card rendering — Plan 06b replaces with CookStepCard component */}
      {totalSteps === 0 && !activeSession && (
        <div className="text-center py-12">
          <p className="text-text/60 font-sans mb-4">No steps loaded yet.</p>
          <button
            type="button"
            onClick={() => handleStartCook(null)}
            className="bg-primary text-white rounded-[--radius-btn] px-6 py-2.5 text-sm font-semibold"
          >
            Start cook session
          </button>
        </div>
      )}

      {stepOrder.map((stepId, idx) => {
        const step = stepsById.get(stepId)
        const state = stepStates[stepId]
        const isCompleted = state?.completed_at != null
        const isActive = stepId === activeStepId

        if (!step) return null

        return (
          <div
            key={stepId}
            className={
              isCompleted
                ? 'bg-secondary/60 rounded-[--radius-card] px-4 py-2 flex items-center gap-3'
                : isActive
                  ? 'bg-surface border-2 border-primary rounded-[--radius-card] px-4 py-4 flex flex-col gap-3 shadow-sm'
                  : 'bg-secondary rounded-[--radius-card] px-4 py-3 opacity-60 flex items-start gap-3'
            }
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                isCompleted
                  ? 'bg-primary/40 text-white'
                  : isActive
                    ? 'bg-primary text-white'
                    : 'border border-text/20 text-text/60'
              }`}
            >
              {isCompleted ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M1.5 5l2.5 2.5 4.5-4" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-sans ${
                  isCompleted
                    ? 'text-sm text-text/40 line-through'
                    : isActive
                      ? 'text-base font-medium text-text'
                      : 'text-sm text-text/60'
                }`}
              >
                {step.text}
              </p>
              {step.duration_minutes > 0 && (
                <span className={`text-xs font-sans ml-auto ${isCompleted ? 'text-text/40' : 'text-text/40'}`}>
                  {step.duration_minutes} min
                </span>
              )}
              {isCompleted && state?.completed_at && (
                <span className="text-xs text-text/40 font-sans ml-auto">
                  {new Date(state.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </CookModeShell>

    {deductionResult && leftoverContext && (
      <CookDeductionReceipt
        mealName={leftoverContext.recipeName}
        result={deductionResult}
        onClose={() => {
          setDeductionResult(null)
          // Landmine 4: defer navigation when the leftover modal is open
          if (!showLeftoverModal) navigate(-1)
        }}
        onSaveLeftover={() => setShowLeftoverModal(true)}
      />
    )}
    {showLeftoverModal && leftoverContext && (
      <AddInventoryItemModal
        isOpen={showLeftoverModal}
        onClose={() => {
          setShowLeftoverModal(false)
          setDeductionResult(null)
          navigate(-1)
        }}
        leftoverDefaults={leftoverContext}
      />
    )}
    </>
  )
}
