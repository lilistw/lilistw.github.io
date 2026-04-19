import { getInstrumentTypeLabel } from '../instrument/classifier.js'

/**
 * Parses IBKR "Open Positions" section into a raw array.
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseOpenPositions(rows) {
  const headerRow = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
  if (!headerRow) return []

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) colIndex[headerRow[i].trim()] = i

  return rows
    .filter(r => r[0] === 'Open Positions' && r[1] === 'Data' && r[2] === 'Summary')
    .map(r => ({
      assetCategory: (r[colIndex['Asset Category']] || '').trim(),
      currency:      (r[colIndex['Currency']]       || '').trim(),
      symbol:        (r[colIndex['Symbol']]         || '').trim(),
      quantity:      (r[colIndex['Quantity']]        || '').trim(),
      multiplier:    (r[colIndex['Mult']]            || '').trim(),
      costPrice:     (r[colIndex['Cost Price']]      || '').trim(),
      costBasis:     (r[colIndex['Cost Basis']]      || '').trim(),
      closePrice:    (r[colIndex['Close Price']]     || '').trim(),
      value:         (r[colIndex['Value']]           || '').trim(),
      unrealizedPL:  (r[colIndex['Unrealized P/L']] || '').trim(),
      code:          (r[colIndex['Code']]            || '').trim(),
    }))
}

/**
 * Builds an enriched holdings list from raw open positions, applying calculated
 * cost basis overrides from the trade processing step.
 *
 * @param {object[]} rawPositions
 * @param {{ [symbol: string]: object }} instrumentInfo
 * @param {{ [symbol: string]: { cost: number, qty: number } }} positionsCostBasis
 * @returns {{ columns: object[], rows: object[] }}
 */
export function buildOpenPositions(rawPositions, instrumentInfo = {}, positionsCostBasis = {}) {
  const parseNum = v => {
    const n = parseFloat((v || '').replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }

  const dataRows = rawPositions.map(r => {
    const symbol   = r.symbol
    const info     = instrumentInfo[symbol] || {}
    const quantity = parseNum(r.quantity)
    const calcPos  = positionsCostBasis[symbol]
    const costBasis = calcPos?.cost != null ? calcPos.cost : parseNum(r.costBasis)
    const costPrice = quantity ? costBasis / quantity : parseNum(r.costPrice)
    const instrType = getInstrumentTypeLabel({ name: info.description ?? '', type: info.type ?? '' })
    return {
      assetCategory: r.assetCategory,
      currency:      r.currency,
      symbol,
      instrType,
      country:      info.countryName || info.country || '',
      quantity,
      multiplier:   parseNum(r.multiplier),
      costPrice,
      costBasis,
      closePrice:   parseNum(r.closePrice),
      value:        parseNum(r.value),
      unrealizedPL: parseNum(r.unrealizedPL),
      code:         r.code,
    }
  })

  return {
    columns: [
      { key: 'assetCategory', label: 'Категория' },
      { key: 'currency',      label: 'Валута' },
      { key: 'symbol',        label: 'Символ',            bold: true },
      { key: 'instrType',     label: 'Тип',               chip: true, chipColors: { ETF: 'primary', Stock: 'default', Other: 'default' } },
      { key: 'quantity',      label: 'Количество',        align: 'right', mono: true, decimals: 4 },
      { key: 'multiplier',    label: 'Множител',          align: 'right', mono: true, decimals: 2 },
      { key: 'costPrice',     label: 'Цена',              align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'costBasis',     label: 'База',              align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'closePrice',    label: 'Крайна цена',       align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'value',         label: 'Стойност',          align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'unrealizedPL',  label: 'Нереализирана P/L', align: 'right', mono: true, decimals: 2, pnl: true, nullAs: '—' },
    ],
    rows: dataRows,
  }
}
