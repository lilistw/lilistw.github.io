import { parseToDecimal } from '../../utils/numStr.js'

/**
 * Parses the "Trades" section of an IBKR Activity Statement CSV to extract
 * the cost basis (Basis column) for SELL trades.
 *
 * Used as a fallback for positions opened in prior years where no BUY trade
 * exists in the current dataset. IBKR records the weighted-average cost basis
 * of the sold shares in the "Basis" column (negative value for sells).
 *
 * Returns a Map keyed by "SYMBOL|YYYY-MM-DD|QTY" → Decimal cost basis (positive).
 */
export function parseCsvTradeBasis(rows) {
  const headerRow = rows.find(
    r => r[0] === 'Trades' && r[1] === 'Header' && r[2] === 'DataDiscriminator'
  )
  if (!headerRow) return new Map()

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) {
    const name = (headerRow[i] || '').trim()
    if (name) colIndex[name] = i
  }

  const result = new Map()

  rows
    .filter(r => r[0] === 'Trades' && r[1] === 'Data' && r[2] === 'Order')
    .forEach(r => {
      const qtyD = parseToDecimal(r[colIndex['Quantity']])
      if (!qtyD || qtyD.gte(0)) return  // only SELL trades have negative quantity

      const symbol   = (r[colIndex['Symbol']] || '').trim()
      const dateTime = (r[colIndex['Date/Time']] || '').replace(/"/g, '')
      const date     = dateTime.split(',')[0].trim()   // 'YYYY-MM-DD'
      const basisD   = parseToDecimal(r[colIndex['Basis']])  // negative in CSV for sells

      if (!symbol || !date || !basisD) return

      // Basis is negative (a cost); store as positive cost basis
      const key = `${symbol}|${date}|${qtyD.abs().toFixed(0)}`
      result.set(key, basisD.neg())
    })

  return result
}
