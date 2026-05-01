import { getInstrumentTypeLabel } from './classifier.js'
import { toDecimal } from './numStr.js'

/**
 * Builds an enriched holdings list from raw open positions, applying calculated
 * cost basis overrides from the trade processing step.
 *
 * @param {object[]} rawPositions
 * @param {{ [symbol: string]: object }} instrumentInfo
 * @param {{ [symbol: string]: { cost: Decimal, qty: Decimal } }} positionsCostBasis
 * @returns {{ columns: object[], rows: object[] }}
 */
export function buildOpenPositions(rawPositions, instrumentInfo = {}, positionsCostBasis = {}) {
  const dataRows = rawPositions.map(r => {
    const symbol    = r.symbol
    const info      = instrumentInfo[symbol] || {}
    const quantity  = r.quantity
    const calcPos   = positionsCostBasis[symbol]
    const costBasis = calcPos?.cost != null ? toDecimal(calcPos.cost) : r.costBasis
    const costPrice = quantity && !quantity.isZero()
      ? costBasis?.div(quantity)
      : r.costPrice
    const instrType = getInstrumentTypeLabel({ name: info.description ?? '', type: info.type ?? '' })
    return {
      assetCategory: r.assetCategory,
      currency:      r.currency,
      symbol,
      instrType,
      country:      info.country || '',
      quantity,
      multiplier:   r.multiplier,
      costPrice,
      costBasis,
      closePrice:   r.closePrice,
      value:        r.value,
      unrealizedPL: r.unrealizedPL,
      code:         r.code,
    }
  })

  return {
    columns: [
      { key: 'assetCategory', labelKey: 'openPositionsCols.assetCategory' },
      { key: 'currency',      labelKey: 'openPositionsCols.currency' },
      { key: 'symbol',        labelKey: 'openPositionsCols.symbol', bold: true },
      { key: 'instrType',     labelKey: 'openPositionsCols.instrType', chip: true, chipColors: { ETF: 'primary', Stock: 'default', Other: 'default' } },
      { key: 'quantity',      labelKey: 'openPositionsCols.quantity', align: 'right', mono: true, decimals: 4 },
      { key: 'multiplier',    labelKey: 'openPositionsCols.multiplier', align: 'right', mono: true, decimals: 2 },
      { key: 'costPrice',     labelKey: 'openPositionsCols.costPrice', align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'costBasis',     labelKey: 'openPositionsCols.costBasis', align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'closePrice',    labelKey: 'openPositionsCols.closePrice', align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'value',         labelKey: 'openPositionsCols.value', align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'unrealizedPL',  labelKey: 'openPositionsCols.unrealizedPL', align: 'right', mono: true, decimals: 2, pnl: true, nullAs: '—' },
    ],
    rows: dataRows,
  }
}
