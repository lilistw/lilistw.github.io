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
