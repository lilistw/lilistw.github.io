/**
 * Parses IBKR "Open Positions" rows into a normalized holdings list.
 *
 * @param {string[][]} rows - 2D array from PapaParse
 * @returns {object[]} normalized holdings
 */
export function parseOpenPositions(rows, instrumentInfo = {}, positionsCostBasis = {}) {
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
      const symbol   = r[colIndex['Symbol']]
      const info     = instrumentInfo[symbol] || {}
      const quantity = parseNumber(r[colIndex['Quantity']])
      // Use the calculated cost basis from trade processing when available;
      // fall back to IBKR's reported value.
      const calcPos  = positionsCostBasis[symbol]
      const costBasis = calcPos?.cost != null ? calcPos.cost : parseNumber(r[colIndex['Cost Basis']])
      const costPrice = quantity ? costBasis / quantity : parseNumber(r[colIndex['Cost Price']])
      return {
        assetCategory: r[colIndex['Asset Category']],
        currency: r[colIndex['Currency']],
        symbol,
        country:     info.countryName || info.country || '',
        quantity,
        multiplier:  parseNumber(r[colIndex['Mult']]),
        costPrice,
        costBasis,
        closePrice:  parseNumber(r[colIndex['Close Price']]),
        value:       parseNumber(r[colIndex['Value']]),
        unrealizedPL: parseNumber(r[colIndex['Unrealized P/L']]),
        code: (r[colIndex['Code']] || '').trim(),
      }
    })

  return {
    columns: [
      { key: 'assetCategory',label: 'Категория' },
      { key: 'currency',     label: 'Валута' },
      { key: 'symbol',       label: 'Символ',             bold: true },
      { key: 'quantity',     label: 'Количество',         align: 'right', mono: true, decimals: 4 },
      { key: 'multiplier',   label: 'Множител',           align: 'right', mono: true, decimals: 2 },
      { key: 'costPrice',    label: 'Цена',               align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'costBasis',    label: 'База',               align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'closePrice',   label: 'Крайна цена',        align: 'right', mono: true, decimals: 4, nullAs: '—' },
      { key: 'value',        label: 'Стойност',           align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'unrealizedPL', label: 'Нереализирана P/L',  align: 'right', mono: true, decimals: 2, pnl: true, nullAs: '—' },
    ],
    rows: dataRows,
  }
}
