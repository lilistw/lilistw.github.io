/**
 * Parses the "Trades" section of an IBKR Activity Statement CSV to extract
 * the cost basis (Basis column) for SELL trades.
 *
 * Used as a fallback for positions opened in prior years where no BUY trade
 * exists in the current dataset. IBKR records the weighted-average cost basis
 * of the sold shares in the "Basis" column (negative value for sells).
 *
 * Returns a Map keyed by "SYMBOL|YYYY-MM-DD|QTY" → cost basis (positive number).
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

  const parseNum = s => {
    const n = parseFloat((s || '').replace(/,/g, ''))
    return isNaN(n) ? null : n
  }

  const result = new Map()

  rows
    .filter(r => r[0] === 'Trades' && r[1] === 'Data' && r[2] === 'Order')
    .forEach(r => {
      const qty = parseNum(r[colIndex['Quantity']])
      if (qty == null || qty >= 0) return  // only SELL trades have negative quantity

      const symbol   = (r[colIndex['Symbol']] || '').trim()
      const dateTime = (r[colIndex['Date/Time']] || '').replace(/"/g, '')
      const date     = dateTime.split(',')[0].trim()   // 'YYYY-MM-DD'
      const basis    = parseNum(r[colIndex['Basis']])  // negative in CSV for sells

      if (!symbol || !date || basis == null) return

      // Basis is negative (a cost); store as positive cost basis
      const key = `${symbol}|${date}|${Math.round(Math.abs(qty))}`
      result.set(key, -basis)
    })

  return result
}
