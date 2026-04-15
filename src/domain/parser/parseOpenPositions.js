/**
 * Parses IBKR "Open Positions" rows into a normalized holdings list.
 *
 * @param {string[][]} rows - 2D array from PapaParse
 * @returns {object[]} normalized holdings
 */
export function parseOpenPositions(rows, instrumentInfo = {}) {
  const isIBKR = rows.some(r => r[0] === 'Statement' && r[1] === 'Data')
  if (!isIBKR) {
    throw new Error('Файлът не е валиден IBKR Activity Statement.')
  }

  const headerRow = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
  if (!headerRow) {
    throw new Error('В документа не са намерени данни за позиции (Open Positions секция липсва).')
  }

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) {
    colIndex[headerRow[i].trim()] = i
  }

  const parseNumber = value => {
    const normalized = (value || '').replace(/,/g, '').trim()
    const parsed = parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  const dataRows = rows
    .filter(r => r[0] === 'Open Positions' && r[1] === 'Data' && r[2] === 'Summary')
    .map(r => {
      const symbol = r[colIndex['Symbol']]
      const info = instrumentInfo[symbol] || {}
      return {
        assetCategory: r[colIndex['Asset Category']],
        currency: r[colIndex['Currency']],
        symbol,
        country:     info.countryName || info.country || '',
        quantity:    parseNumber(r[colIndex['Quantity']]),
        multiplier:  parseNumber(r[colIndex['Mult']]),
        costPrice:   parseNumber(r[colIndex['Cost Price']]),
        costBasis:   parseNumber(r[colIndex['Cost Basis']]),
        closePrice:  parseNumber(r[colIndex['Close Price']]),
        value:       parseNumber(r[colIndex['Value']]),
        unrealizedPL: parseNumber(r[colIndex['Unrealized P/L']]),
        code: (r[colIndex['Code']] || '').trim(),
      }
    })

  return {
    columns: [
      { key: 'symbol',       label: 'Символ',             bold: true },
      { key: 'country',      label: 'Държава' },
      { key: 'assetCategory',label: 'Категория' },
      { key: 'currency',     label: 'Валута' },
      { key: 'quantity',     label: 'Количество',         align: 'right', mono: true, decimals: 4 },
      { key: 'multiplier',   label: 'Множител',           align: 'right', mono: true, decimals: 2 },
      { key: 'costPrice',    label: 'Цена',               align: 'right', mono: true, decimals: 4 },
      { key: 'costBasis',    label: 'База',               align: 'right', mono: true, decimals: 2 },
      { key: 'closePrice',   label: 'Крайна',             align: 'right', mono: true, decimals: 4 },
      { key: 'value',        label: 'Стойност',           align: 'right', mono: true, decimals: 2 },
      { key: 'unrealizedPL', label: 'Нереализирана P/L',  align: 'right', mono: true, decimals: 2, pnl: true, nullAs: '—' },
    ],
    rows: dataRows,
  }
}
