import { useReferencePrices } from '../../hooks/useFoodPrices'
import { formatCost } from '../../utils/cost'

function formatPeriod(period: string | null): string {
  if (!period) return ''
  return new Date(period + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export function MarketPricesSection() {
  const { data: prices } = useReferencePrices()

  if (!prices || prices.length === 0) {
    return (
      <p className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-dim)', padding: '14px 0' }}>
        Market prices aren&apos;t loaded yet.
      </p>
    )
  }

  // One row per StatCan product (aliases share a product id + price).
  const byProduct = new Map<number, typeof prices[number]>()
  for (const p of prices) {
    const key = p.statcan_product_id ?? -1
    if (!byProduct.has(key)) byProduct.set(key, p)
  }
  const rows = [...byProduct.values()].sort((a, b) =>
    (a.quantity_label ?? a.ingredient_name).localeCompare(b.quantity_label ?? b.ingredient_name)
  )
  const period = formatPeriod(rows[0]?.ref_period ?? null)

  return (
    <div style={{ padding: '14px 0' }}>
      <p className="serif-italic mb-3" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
        Current Ontario retail averages from Statistics Canada{period ? ` (${period})` : ''}. Used to
        estimate recipe and grocery costs when you haven&apos;t entered your own price. Your own prices always win.
      </p>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {rows.map(r => (
          <div
            key={r.statcan_product_id ?? r.ingredient_name}
            className="flex items-baseline justify-between"
            style={{ padding: '8px 0', borderBottom: '1px dashed var(--rule-soft)' }}
          >
            <span className="serif min-w-0" style={{ fontSize: 14 }}>
              {r.quantity_label ?? r.ingredient_name}
            </span>
            <span className="mono tnum ml-4" style={{ fontSize: 12, color: 'var(--tomato)', whiteSpace: 'nowrap' }}>
              {formatCost(r.cost_per_100g)}/100g
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
