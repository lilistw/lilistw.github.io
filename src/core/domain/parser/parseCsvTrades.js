import { parseToDecimal, toDecimal } from '../numStr.js'

/**
 * Parses the "Trades" section of an IBKR Activity Statement CSV into a raw array.
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseCsvTrades(rows) {
  const headerRow = rows.find(
    r => r[0] === 'Trades' && r[1] === 'Header' && r[2] === 'DataDiscriminator'
  )
  if (!headerRow) return []

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) {
    const name = (headerRow[i] || '').trim()
    if (name) colIndex[name] = i
  }

  const assetCatIdx = colIndex['Asset Category']

  return rows
    .filter(r => r[0] === 'Trades' && r[1] === 'Data' && r[2] === 'Order')
    .filter(r => (r[assetCatIdx] || '').trim() !== 'Forex')
    .map(r => ({
      assetCategory: (r[colIndex['Asset Category']]    || '').trim(),
      currency:      (r[colIndex['Currency']]          || '').trim(),
      symbol:        (r[colIndex['Symbol']]            || '').trim(),
      datetime:      (r[colIndex['Date/Time']]         || '').replace(/"/g, '').trim(),
      settleDate:    (r[colIndex['Settle Date/Time']]  || '').trim(),
      exchange:      (r[colIndex['Exchange']]          || '').trim(),
      side:          (r[colIndex['Buy/Sell']]          || '').trim(),
      quantity:      parseToDecimal((r[colIndex['Quantity']]       || '').trim()),
      price:         parseToDecimal((r[colIndex['Price']]          || '').trim()),
      proceeds:      parseToDecimal((r[colIndex['Proceeds']]       || '').trim()),
      commission:    parseToDecimal((r[colIndex['Comm/Fee']]       || '').trim()),
      fee:           parseToDecimal((r[colIndex['Fee']]            || '').trim()),
      basis:         parseToDecimal((r[colIndex['Basis']]          || '').trim()),
      realizedPL:    parseToDecimal((r[colIndex['Realized P/L']]   || '').trim()),
      code:          (r[colIndex['Code']]              || '').trim(),
    }))
}

/**
 * Builds a Map<"SYMBOL|YYYY-MM-DD|QTY" → Decimal> from raw CSV trades.
 * Used as fallback cost basis for positions opened in prior years.
 * IBKR records a negative Basis for SELLs; stored here as positive.
 *
 * @param {object[]} csvTrades
 * @returns {Map<string, Decimal>}
 */
export function buildCsvTradeBasis(csvTrades) {
  const result = new Map()
  for (const t of csvTrades) {
    const qtyD = toDecimal(t.quantity)
    if (!qtyD || qtyD.gte(0)) continue  // only SELL trades have negative quantity

    const date   = t.datetime.split(',')[0].trim()
    const basisD = toDecimal(t.basis)
    if (!t.symbol || !date || !basisD) continue

    const key = `${t.symbol}|${date}|${qtyD.abs().toFixed(0)}`
    result.set(key, basisD.neg())
  }
  return result
}
