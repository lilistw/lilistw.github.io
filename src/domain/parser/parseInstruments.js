import { t } from '../../localization/i18n.js'

/**
 * Parses "Financial Instrument Information" section into a raw array.
 * Each symbol field may contain comma-separated aliases (e.g. "EXS1, EXS1d").
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseInstruments(rows) {
  const headerRow = rows.find(
    r => r[0] === 'Financial Instrument Information' && r[1] === 'Header'
  )
  if (!headerRow) return []

  const colIndex = {}
  for (let i = 2; i < headerRow.length; i++) colIndex[headerRow[i].trim()] = i

  return rows
    .filter(r => r[0] === 'Financial Instrument Information' && r[1] === 'Data')
    .map(r => ({
      assetCategory:   (r[colIndex['Asset Category']] || '').trim(),
      symbol:          (r[colIndex['Symbol']]         || '').trim(),
      description:     (r[colIndex['Description']]    || '').trim(),
      conid:           (r[colIndex['Conid']]           || '').trim(),
      securityId:      (r[colIndex['Security ID']]    || '').trim(),
      underlying:      (r[colIndex['Underlying']]      || '').trim(),
      listingExchange: (r[colIndex['Listing Exch']]   || '').trim(),
      multiplier:      (r[colIndex['Multiplier']]      || '').trim(),
      type:            (r[colIndex['Type']]            || '').trim(),
      code:            (r[colIndex['Code']]            || '').trim(),
    }))
}

/**
 * Builds a symbol-keyed lookup map from the raw instruments array.
 * Handles comma-separated aliases in the symbol field.
 * Country is derived from the ISIN prefix (first 2 chars of securityId).
 *
 * @param {object[]} instruments
 * @returns {{ [symbol: string]: object }}
 */
export function buildInstrumentInfo(instruments) {
  const result = {}
  for (const inst of instruments) {
    const country = inst.securityId.slice(0, 2).toUpperCase()
    const symbols = inst.symbol.split(',').map(s => s.trim()).filter(Boolean)
    const info = {
      securityId:   inst.securityId,
      country,
      countryName:  t(`countryNames.${country}`) !== `countryNames.${country}` ? t(`countryNames.${country}`) : country,
      type:         inst.type,
      listingExch:  inst.listingExchange,
      description:  inst.description,
      aliases:      symbols,
    }
    symbols.forEach(sym => { result[sym] = info })
  }
  return result
}

/**
 * Expands a symbol-keyed dictionary to also be accessible by all known aliases.
 * Does not overwrite existing keys; only fills in missing aliases.
 *
 * @param {{ [symbol: string]: any }} dict
 * @param {{ [symbol: string]: { aliases: string[] } }} instrumentInfo
 * @returns {{ [symbol: string]: any }}
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
