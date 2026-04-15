/**
 * Parses raw IBKR CSV rows into a normalized list of trades.
 *
 * The IBKR Activity Statement CSV is a multi-section file where each section
 * has its own header row. Rows are prefixed with the section name and record
 * type, e.g.:
 *   Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,...
 *   Trades,Data,Order,Stocks,EUR,2B7D,"2025-12-11, 13:55:15",100,...
 *
 * @param {string[][]} rows - 2D array from PapaParse
 * @returns {object[]} normalized trades
 */
export function parseTrades(rows) {
  const isIBKR = rows.some(r => r[0] === 'Statement' && r[1] === 'Data')
  if (!isIBKR) {
    throw new Error('Файлът не е валиден IBKR Activity Statement.')
  }

  // Find the Trades section header to build a column index map
  const headerRow = rows.find(r => r[0] === 'Trades' && r[1] === 'Header')
  if (!headerRow) {
    throw new Error('В документа не са намерени данни за сделки (Trades секция липсва).')
  }

  // Columns start at index 2 (0 = section, 1 = record type)
  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) {
    colIndex[headerRow[i].trim()] = i
  }

  return rows
    .filter(r => r[0] === 'Trades' && r[1] === 'Data' && r[2] === 'Order')
    .map(r => {
      const qty = parseFloat(r[colIndex['Quantity']])
      const dateTime = r[colIndex['Date/Time']] || ''
      // Date/Time format: "2025-12-11, 13:55:15" — take date part only
      const date = dateTime.split(',')[0].trim()

      return {
        symbol: r[colIndex['Symbol']],
        date,
        dateTime,
        type: qty >= 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(qty),
        price: parseFloat(r[colIndex['T. Price']]),
        fee: Math.abs(parseFloat(r[colIndex['Comm/Fee']])),
        currency: r[colIndex['Currency']],
        assetCategory: r[colIndex['Asset Category']],
        proceeds: parseFloat(r[colIndex['Proceeds']]),
        realizedPL: parseFloat(r[colIndex['Realized P/L']]),
        code: (r[colIndex['Code']] || '').trim(),
      }
    })
}
