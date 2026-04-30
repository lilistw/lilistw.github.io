import { parseToDecimal } from '../core/domain/numStr.js'

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
      quantity:      parseToDecimal((r[colIndex['Quantity']]        || '').trim()),
      multiplier:    parseToDecimal((r[colIndex['Mult']]            || '').trim()),
      costPrice:     parseToDecimal((r[colIndex['Cost Price']]      || '').trim()),
      costBasis:     parseToDecimal((r[colIndex['Cost Basis']]      || '').trim()),
      closePrice:    parseToDecimal((r[colIndex['Close Price']]     || '').trim()),
      value:         parseToDecimal((r[colIndex['Value']]           || '').trim()),
      unrealizedPL:  parseToDecimal((r[colIndex['Unrealized P/L']] || '').trim()),
      code:          (r[colIndex['Code']]            || '').trim(),
    }))
}
