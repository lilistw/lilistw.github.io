import { parseToDecimal } from '../core/domain/numStr.js'

/**
 * Parses the Dividends section into a raw array.
 * The `amount` field is returned as a Decimal instance.
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseDividends(rows) {
  const header = rows.find(r => r[0] === 'Dividends' && r[1] === 'Header')
  if (!header) return []

  const idx = {}
  for (let i = 2; i < header.length; i++) idx[header[i].trim()] = i

  const SKIP = new Set(['Total', 'Total in EUR', 'Total Dividends in EUR'])

  return rows
    .filter(r =>
      r[0] === 'Dividends' &&
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

/**
 * Parses the Withholding Tax section into a raw array.
 * The `amount` field is returned as a Decimal instance.
 *
 * @param {string[][]} rows
 * @returns {object[]}
 */
export function parseWithholdingTax(rows) {
  const header = rows.find(r => r[0] === 'Withholding Tax' && r[1] === 'Header')
  if (!header) return []

  const idx = {}
  for (let i = 2; i < header.length; i++) idx[header[i].trim()] = i

  return rows
    .filter(r =>
      r[0] === 'Withholding Tax' &&
      r[1] === 'Data' &&
      !(r[idx['Currency']] || '').startsWith('Total')
    )
    .map(r => ({
      currency:    (r[idx['Currency']]    || '').trim(),
      date:        (r[idx['Date']]         || '').trim(),
      description: (r[idx['Description']] || '').trim(),
      amount:      parseToDecimal((r[idx['Amount']] || '').trim()),
      code:        (r[idx['Code']]         || '').trim(),
    }))
}