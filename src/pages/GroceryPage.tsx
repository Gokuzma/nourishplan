import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { useGroceryList } from '../hooks/useGroceryList'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { useGenerateGroceryList } from '../hooks/useGenerateGroceryList'
import { useToggleGroceryItem } from '../hooks/useToggleGroceryItem'
import { useAddManualGroceryItem } from '../hooks/useAddManualGroceryItem'
import { useMealPlan } from '../hooks/useMealPlan'
import { getWeekStart } from '../utils/mealPlan'
import { formatCost } from '../utils/cost'
import { ManualAddItemInput } from '../components/grocery/ManualAddItemInput'
import { Nameplate, StoryHead, SectionHead, Folio, Rule, Chip } from '../components/editorial'
import { Icon } from '../components/Icon'
import type { GroceryItem } from '../types/database'

interface UndoToast {
  itemId: string
  message: string
}

export function GroceryPage() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  const weeklyBudget = membership?.households?.weekly_budget ?? null
  const weekStartDay = membership?.households?.week_start_day ?? 0
  const weekStart = getWeekStart(new Date(), weekStartDay)

  const { data: list, isPending: listLoading } = useGroceryList(weekStart)
  const { data: items = [] } = useGroceryItems(list?.id)
  const { data: mealPlan, isPending: planLoading } = useMealPlan(weekStart)

  const generateMutation = useGenerateGroceryList()
  const toggleItem = useToggleGroceryItem()
  const addManualItem = useAddManualGroceryItem()

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [collapseHave, setCollapseHave] = useState(true)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const needToBuy = items.filter((i: GroceryItem) => i.notes !== 'inventory-covered')
  const alreadyHave = items.filter((i: GroceryItem) => i.notes === 'inventory-covered')

  const categoriesMap = new Map<string, GroceryItem[]>()
  for (const item of needToBuy) {
    const cat = item.category
    const existing = categoriesMap.get(cat) ?? []
    existing.push(item)
    categoriesMap.set(cat, existing)
  }
  const categories = Array.from(categoriesMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const estimatedTotal = needToBuy.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0)
  const checkedCount = needToBuy.filter(i => i.is_checked).length
  const checkedTotal = needToBuy.filter(i => i.is_checked).reduce((s, i) => s + (i.estimated_cost ?? 0), 0)
  const haveTotal = alreadyHave.reduce((s, i) => s + (i.estimated_cost ?? 0), 0)
  const isOverBudget = weeklyBudget != null && estimatedTotal > weeklyBudget
  const overAmount = weeklyBudget != null ? estimatedTotal - weeklyBudget : 0

  function handleToggle(itemId: string) {
    const item = items.find((i: GroceryItem) => i.id === itemId)
    if (!item) return
    if (undoTimerId) clearTimeout(undoTimerId)
    toggleItem.mutate({ item })
    if (!item.is_checked) {
      setUndoToast({ itemId, message: 'Item checked' })
      const timer = setTimeout(() => setUndoToast(null), 4000)
      setUndoTimerId(timer)
    } else {
      setUndoToast(null)
    }
  }

  function handleUndo() {
    if (!undoToast) return
    const item = items.find((i: GroceryItem) => i.id === undoToast.itemId)
    if (item) toggleItem.mutate({ item })
    if (undoTimerId) clearTimeout(undoTimerId)
    setUndoToast(null)
    setUndoTimerId(null)
  }

  function handleGenerate() {
    generateMutation.mutate()
  }

  function handleRegenerate() {
    setShowRegenerateConfirm(false)
    generateMutation.mutate()
  }

  function handleManualAdd(name: string) {
    if (!list?.id) return
    addManualItem.mutate({ listId: list.id, name })
  }

  useEffect(() => {
    return () => { if (undoTimerId) clearTimeout(undoTimerId) }
  }, [undoTimerId])

  const isLoading = listLoading || planLoading

  if (isLoading && !householdId) {
    return (
      <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 font-sans">
        <p className="serif-italic" style={{ fontSize: 16, color: 'var(--ink-soft)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate */}
      <div className="hidden md:block">
        <Nameplate
          left={list ? `For week of ${new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : 'No list yet'}
          title={<>The <span className="amp">List</span></>}
          right={items.length > 0 ? `${needToBuy.length} items · ${categories.length} aisles` : '—'}
        />
      </div>
      <div className="md:hidden">
        <Nameplate
          left="SHOP"
          title="The List"
          right={String(needToBuy.length)}
          size="sm"
        />
      </div>

      <StoryHead
        kicker="GROCERY"
        headline="The List"
        byline={list && estimatedTotal > 0 ? `${formatCost(estimatedTotal)} estimated\n${checkedCount} of ${needToBuy.length} checked` : null}
        size="sm"
      />

      {/* Regenerate confirmation banner */}
      {showRegenerateConfirm && (
        <div
          className="mt-4"
          style={{ background: 'var(--paper-2)', border: '1.5px dashed var(--rule-c)', padding: 14 }}
        >
          <p className="serif" style={{ fontSize: 15, marginBottom: 10 }}>Regenerate List — checked items will be reset. Continue?</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleRegenerate} disabled={generateMutation.isPending} className="btn btn-primary btn-sm">
              {generateMutation.isPending ? 'Regenerating…' : 'Confirm'}
            </button>
            <button type="button" onClick={() => setShowRegenerateConfirm(false)} className="btn btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty states */}
      {!mealPlan && !planLoading && (
        <div className="py-16 text-center">
          <p className="serif-italic" style={{ fontSize: 20, color: 'var(--ink-soft)', marginBottom: 12 }}>— no active meal plan —</p>
          <p className="serif" style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 16 }}>Create a meal plan for this week to generate your grocery list.</p>
          <Link to="/plan" className="btn btn-primary btn-sm">Go to Plan</Link>
        </div>
      )}

      {mealPlan && !list && !listLoading && (
        <div className="py-16 text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="btn btn-primary"
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate Grocery List'}
          </button>
          {generateMutation.isError && (
            <p className="serif-italic mt-3" style={{ color: 'var(--tomato)', fontSize: 14 }}>
              Couldn&apos;t generate your list. Check your connection and try again.
            </p>
          )}
        </div>
      )}

      {list && (
        <div className="grid gap-0 md:gap-8 mt-2" style={{ gridTemplateColumns: '1fr' }}>
          <div className="md:grid md:gap-8" style={{ gridTemplateColumns: '2.2fr 1fr' }}>
            {/* LEFT — aisles */}
            <div>
              {/* Aisle jump bar */}
              {categories.length > 0 && (
                <div
                  className="flex gap-2 items-center flex-wrap py-2"
                  style={{ borderBottom: '1px solid var(--rule-c)' }}
                >
                  <span className="eyebrow" style={{ marginRight: 8 }}>Jump to —</span>
                  {categories.map(([cat, items]) => (
                    <a key={cat} href={`#aisle-${cat}`} style={{ textDecoration: 'none' }}>
                      <Chip kind="butter">
                        {cat} <span className="tnum" style={{ marginLeft: 4, opacity: 0.7 }}>·{items.length}</span>
                      </Chip>
                    </a>
                  ))}
                </div>
              )}

              {/* Regenerate button (top right) */}
              {!showRegenerateConfirm && (
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={() => setShowRegenerateConfirm(true)}
                    disabled={generateMutation.isPending}
                    className="btn btn-sm"
                  >
                    Regenerate list
                  </button>
                </div>
              )}

              {/* Aisle sections */}
              {categories.length > 0 ? (
                categories.map(([category, categoryItems], ai) => {
                  const sorted = [...categoryItems].sort((a, b) => {
                    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
                    return a.food_name.localeCompare(b.food_name)
                  })
                  const aisleSubtotal = categoryItems.reduce((s, i) => s + (i.estimated_cost ?? 0), 0)
                  return (
                    <div key={category} id={`aisle-${category}`} className="pt-2">
                      <SectionHead
                        no={String.fromCharCode(97 + ai)}
                        label={category}
                        aux={`${categoryItems.length} item${categoryItems.length === 1 ? '' : 's'} · ${formatCost(aisleSubtotal)}`}
                      />
                      <Rule />
                      {sorted.map(item => {
                        const isDone = item.is_checked
                        return (
                          <div
                            key={item.id}
                            className="grid items-baseline"
                            style={{
                              gridTemplateColumns: '28px 1fr auto auto',
                              gap: 14,
                              padding: '12px 0',
                              borderBottom: '1px dashed var(--rule-softer)',
                              opacity: isDone ? 0.45 : 1,
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            <button
                              type="button"
                              className={`check ${isDone ? 'on' : ''}`}
                              onClick={() => handleToggle(item.id)}
                              aria-label={isDone ? `Uncheck ${item.food_name}` : `Check ${item.food_name}`}
                              aria-pressed={isDone}
                            >
                              {isDone && <Icon name="check" size={14} />}
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <div className="serif" style={{ fontSize: 16 }}>{item.food_name}</div>
                              {item.notes && item.notes !== 'inventory-covered' && (
                                <div className="serif-italic" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>— {item.notes}</div>
                              )}
                            </div>
                            <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.06em' }}>
                              {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                            </span>
                            <span className="mono tnum" style={{ fontSize: 14, color: 'var(--tomato)', minWidth: 54, textAlign: 'right' }}>
                              {item.estimated_cost != null ? formatCost(item.estimated_cost) : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center">
                  <p className="serif-italic" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>
                    — no ingredients to shop for —
                  </p>
                  <p className="serif" style={{ fontSize: 14, color: 'var(--ink-dim)', marginTop: 8 }}>
                    Add recipes to your meal plan to generate a list.
                  </p>
                </div>
              )}

              {/* Manual add */}
              <div className="mt-4">
                <ManualAddItemInput onAdd={handleManualAdd} />
              </div>

              {/* Already have — collapsible */}
              {alreadyHave.length > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setCollapseHave(v => !v)}
                    className="w-full flex items-center justify-between"
                    style={{
                      cursor: 'pointer',
                      padding: '14px 16px',
                      border: '1.5px dashed var(--rule-c)',
                      background: 'rgba(217, 232, 90, 0.06)',
                    }}
                    aria-expanded={!collapseHave}
                  >
                    <span className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--chartreuse)' }}>
                      ◇ Already have — {alreadyHave.length} items saved {formatCost(haveTotal)}
                    </span>
                    <Icon name={collapseHave ? 'arrow-down' : 'minus'} size={14} />
                  </button>
                  {!collapseHave && (
                    <div className="pt-2">
                      {alreadyHave.map(item => (
                        <div
                          key={item.id}
                          className="grid"
                          style={{
                            gridTemplateColumns: '1fr auto',
                            padding: '10px 0',
                            borderBottom: '1px dashed var(--rule-softer)',
                          }}
                        >
                          <span className="serif" style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
                            {item.food_name}
                            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 8 }}>
                              in {item.category.toLowerCase()}
                            </span>
                          </span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--chartreuse)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            saved {formatCost(item.estimated_cost ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — Receipt sidebar (desktop only) */}
            <div
              className="hidden md:block"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-c)',
                padding: 22,
                alignSelf: 'start',
                position: 'sticky',
                top: 16,
              }}
            >
              <div style={{ textAlign: 'center', paddingBottom: 14, borderBottom: '1px dashed var(--rule-soft)' }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: '0.26em', color: 'var(--butter)' }}>— RECEIPT —</div>
                <div className="serif" style={{ fontSize: 26, marginTop: 6, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                  The total,<br />so far.
                </div>
              </div>

              <div style={{ padding: '16px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
                <ReceiptRow label="Items" value={String(needToBuy.length)} />
                <ReceiptRow label="Checked off" value={String(checkedCount)} />
                {alreadyHave.length > 0 && (
                  <ReceiptRow label="Saved by 'have'" value={`−${formatCost(haveTotal)}`} accent="chart" />
                )}
              </div>

              <div style={{ padding: '20px 0 10px', textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--ink-soft)' }}>ESTIMATED TOTAL</div>
                <div
                  className="serif tnum"
                  style={{ fontSize: 48, lineHeight: 1, color: 'var(--tomato)', letterSpacing: '-0.03em', marginTop: 4 }}
                >
                  {formatCost(estimatedTotal)}
                </div>
                {weeklyBudget != null && (
                  <div className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>
                    of {formatCost(weeklyBudget)} weekly cap
                  </div>
                )}
              </div>

              {isOverBudget && weeklyBudget != null && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--tomato)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 0', textAlign: 'center' }}>
                  ⚠ OVER BY {formatCost(overAmount)}
                </div>
              )}

              <div style={{ padding: '16px 0 4px', borderTop: '1px dashed var(--rule-soft)' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                  In-store progress
                </div>
                <div style={{ height: 10, background: 'rgba(255, 245, 225, 0.08)', border: '1px solid var(--rule-soft)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${needToBuy.length > 0 ? (checkedCount / needToBuy.length) * 100 : 0}%`,
                      background: 'var(--tomato)',
                    }}
                  />
                </div>
                <div className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {checkedCount} of {needToBuy.length} · {formatCost(checkedTotal)} in cart
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE — sticky-ish total bar (renders after the list, before tabbar) */}
          <div
            className="md:hidden mt-6"
            style={{
              padding: '16px 4px',
              borderTop: '2px solid var(--rule-c)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--ink-soft)' }}>TOTAL</div>
              <div className="serif tnum" style={{ fontSize: 28, color: 'var(--tomato)', lineHeight: 1 }}>
                {formatCost(estimatedTotal)}
              </div>
            </div>
            <div className="mono tnum" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>
              {checkedCount} / {needToBuy.length}
            </div>
          </div>
        </div>
      )}

      {/* Folio — desktop only */}
      <div className="hidden md:block">
        <Folio
          num="06"
          title="The List"
          tagline="Shop aisle by aisle, with a plan."
          pageOf="PAGE 6 OF 10"
        />
      </div>

      {/* Undo toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3"
          style={{
            background: 'var(--paper-2)',
            border: '1.5px solid var(--rule-c)',
            boxShadow: '4px 4px 0 var(--tomato)',
            padding: '10px 16px',
          }}
        >
          <span className="serif" style={{ fontSize: 13 }}>Item checked</span>
          <button type="button" onClick={handleUndo} className="mono" style={{ background: 'none', border: 0, color: 'var(--tomato)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

function ReceiptRow({ label, value, accent }: { label: string; value: string; accent?: 'chart' }) {
  return (
    <div className="flex justify-between" style={{ padding: '4px 0' }}>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>{label}</span>
      <span className="mono tnum" style={{ color: accent === 'chart' ? 'var(--chartreuse)' : 'var(--ink)' }}>{value}</span>
    </div>
  )
}
