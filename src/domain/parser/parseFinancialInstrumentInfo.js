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
      const securityId = (r[colIndex['Security ID']] || '').trim()
      const country = securityId.slice(0, 2).toUpperCase()
      // Symbol field may contain comma-separated aliases e.g. "EXS1, EXS1d" — register all
      const symbols = (r[colIndex['Symbol']] || '').split(',').map(s => s.trim()).filter(Boolean)
      const info = {
        securityId,
        country,
        countryName:  COUNTRY_NAMES_BG[country] || country,
        type:         (r[colIndex['Type']]         || '').trim(),  // 'ETF', 'COMMON', etc.
        listingExch:  (r[colIndex['Listing Exch']] || '').trim(),
        description:  (r[colIndex['Description']]  || '').trim(),
        aliases:      symbols,
      }
      symbols.forEach(sym => { result[sym] = info })
    })

  return result
}

/**
 * Expands a symbol-keyed dictionary to also be accessible by all known aliases.
 * Useful when one section of the IBKR report uses an alternate ticker (e.g. "EXS1d")
 * while another uses the primary ticker ("EXS1") — both should resolve to the same entry.
 *
 * Does not overwrite existing keys; only fills in missing aliases.
 *
 * @param {{ [symbol: string]: any }} dict
 * @param {{ [symbol: string]: { aliases: string[] } }} instrumentInfo
 * @returns {{ [symbol: string]: any }} new dict with aliases added
 */
export function expandByAliases(dict, instrumentInfo) {
  const result = { ...dict }
  for (const [sym, value] of Object.entries(dict)) {
    for (const alias of (instrumentInfo[sym]?.aliases ?? [])) {
      if (!(alias in result)) result[alias] = value
    }
  }
  return result
}
