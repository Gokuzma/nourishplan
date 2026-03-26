import { useState } from 'react'
import type { RecipeIngredient, MacroSummary } from '../../types/database'

interface IngredientRowProps {
  ingredient: RecipeIngredient
  foodData: { name: string; macros: MacroSummary } | null
  onEdit: () => void
  onRemove: () => void
  onToggleWeightState: () => void
  price?: number | null
  onSavePrice?: (amount: number, quantityValue: number, unit: 'g' | 'kg' | 'ml' | 'l', store: string) => void
}

/**
 * Single ingredient row showing food name, quantity, per-ingredient nutrition,
 * raw/cooked toggle, and edit/remove actions.
 * Optionally shows inline price entry when onSavePrice is provided.
 */
export function IngredientRow({
  ingredient,
  foodData,
  onEdit,
  onRemove,
  onToggleWeightState,
  price,
  onSavePrice,
}: IngredientRowProps) {
  const name = foodData?.name ?? 'Loading...'
  const macros = foodData?.macros
  const isRecipe = ingredient.ingredient_type === 'recipe'
  const isCooked = ingredient.weight_state === 'cooked'

  const [showPriceForm, setShowPriceForm] = useState(false)
  const [priceAmount, setPriceAmount] = useState('')
  const [priceQuantity, setPriceQuantity] = useState('100')
  const [priceUnit, setPriceUnit] = useState<'g' | 'kg' | 'ml' | 'l'>('g')
  const [priceStore, setPriceStore] = useState('')

  function handleSavePrice() {
    const amount = parseFloat(priceAmount)
    const quantity = parseFloat(priceQuantity)
    if (isNaN(amount) || amount <= 0 || isNaN(quantity) || quantity <= 0) return
    onSavePrice?.(amount, quantity, priceUnit, priceStore)
    setShowPriceForm(false)
    setPriceAmount('')
    setPriceQuantity('100')
    setPriceUnit('g')
    setPriceStore('')
  }

  return (
    <div className="rounded-[--radius-btn] border border-secondary/50 bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isRecipe && (
              <span
                className="shrink-0 text-xs bg-accent/20 text-accent font-medium px-1.5 py-0.5 rounded"
                title="Recipe ingredient"
              >
                R
              </span>
            )}
            <span className="text-sm text-text truncate">{name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text/50">{ingredient.quantity_grams}g</span>
            {macros && (
              <span className="text-xs text-text/40">
                {macros.calories.toFixed(0)} kcal · P {macros.protein.toFixed(1)}g · C {macros.carbs.toFixed(1)}g · F {macros.fat.toFixed(1)}g
              </span>
            )}
          </div>
          {/* Price display or Set price link */}
          {onSavePrice && (
            <div className="mt-0.5">
              {price != null ? (
                <span className="text-xs text-text/40">${price.toFixed(2)}/100g</span>
              ) : (
                !showPriceForm && (
                  <button
                    onClick={() => setShowPriceForm(true)}
                    className="text-xs text-primary underline"
                  >
                    Set price
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Raw/cooked toggle */}
        <button
          onClick={onToggleWeightState}
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border transition-colors ${
            isCooked
              ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
              : 'bg-surface text-text/50 border-secondary/60 hover:text-text hover:border-secondary'
          }`}
          title={isCooked ? 'Switch to raw weight' : 'Switch to cooked weight'}
          aria-label={isCooked ? 'Cooked — click to switch to raw' : 'Raw — click to switch to cooked'}
        >
          {isCooked ? 'Cooked' : 'Raw'}
        </button>

        <button
          onClick={onEdit}
          className="shrink-0 text-text/40 hover:text-primary transition-colors p-1.5"
          title="Edit quantity"
          aria-label="Edit ingredient"
        >
          ✎
        </button>
        <button
          onClick={onRemove}
          className="shrink-0 text-text/40 hover:text-red-500 transition-colors p-1.5"
          title="Remove ingredient"
          aria-label="Remove ingredient"
        >
          ×
        </button>
      </div>

      {/* Inline price entry form */}
      {showPriceForm && onSavePrice && (
        <div className="py-2 px-3 border-t border-accent/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text/60">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={priceAmount}
              onChange={e => setPriceAmount(e.target.value)}
              className="w-20 rounded border border-accent/30 bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Price amount"
            />
            <span className="text-xs text-text/60">for</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="100"
              value={priceQuantity}
              onChange={e => setPriceQuantity(e.target.value)}
              className="w-16 rounded border border-accent/30 bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Quantity"
            />
            <select
              value={priceUnit}
              onChange={e => setPriceUnit(e.target.value as 'g' | 'kg' | 'ml' | 'l')}
              className="rounded border border-accent/30 bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Unit"
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
            </select>
            <input
              type="text"
              placeholder="Store (optional)"
              value={priceStore}
              onChange={e => setPriceStore(e.target.value)}
              list="stores-datalist"
              className="flex-1 min-w-24 rounded border border-accent/30 bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Store"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSavePrice}
              className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
            >
              Save Price
            </button>
            <button
              onClick={() => setShowPriceForm(false)}
              className="text-xs text-text/40 hover:text-text ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
