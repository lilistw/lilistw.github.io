import { COUNTRY_NAMES_BG } from '../constants.js'

/**
 * Parses the "Financial Instrument Information" section.
 * Country is derived from the first two characters of the Security ID (ISIN prefix).
 *
 * @param {string[][]} rows
 * @returns {{ [symbol: string]: { securityId, country, countryName, type, description } }}
 */
export function parseFinancialInstrumentInfo(rows) {
  const headerRow = rows.find(
    r => r[0] === 'Financial Instrument Information' && r[1] === 'Header'
  )
  if (!headerRow) return {}

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) {
    colIndex[headerRow[i].trim()] = i
  }

  const result = {}
  rows
    .filter(r => r[0] === 'Financial Instrument Information' && r[1] === 'Data')
    .forEach(r => {
      const symbol = r[colIndex['Symbol']]
      const securityId = (r[colIndex['Security ID']] || '').trim()
      const country = securityId.slice(0, 2).toUpperCase()
      result[symbol] = {
        securityId,
        country,
        countryName: COUNTRY_NAMES_BG[country] || country,
        type: (r[colIndex['Type']] || '').trim(),   // 'ETF', 'COMMON', etc.
        description: (r[colIndex['Description']] || '').trim(),
      }
    })

  return result
}
