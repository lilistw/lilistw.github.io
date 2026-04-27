import { parseToDecimal } from '../numStr.js'

/**
 * Parses the "Interest" section (actual monthly cash payments) into a raw array.
 * The `amount` field is returned as a Decimal instance.
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseInterest(rows) {
  const header = rows.find(r => r[0] === 'Interest' && r[1] === 'Header')
  if (!header) return []

  const idx = {}
  for (let i = 2; i < header.length; i++) idx[header[i].trim()] = i

  const SKIP = new Set(['Total', 'Total in EUR', 'Total Interest in EUR'])

  return rows
    .filter(r =>
      r[0] === 'Interest' &&
      r[1] === 'Data' &&
      !SKIP.has((r[idx['Currency']] || '').trim())
    )
    .map(r => ({
      currency:    (r[idx['Currency']]    || '').trim(),
      date:        (r[idx['Date']]         || '').trim(),
      description: (r[idx['Description']] || '').trim(),
      amount:      parseToDecimal((r[idx['Amount']] || '').trim()),
    }))
    .filter(r => r.amount?.gt(0))
}
