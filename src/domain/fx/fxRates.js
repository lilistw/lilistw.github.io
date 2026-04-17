import Decimal from 'decimal.js'
import rates2024 from './rates/2024.json'
import rates2025 from './rates/2025.json'

const EUR_BGN = new Decimal('1.95583')  // fixed peg

// Build lookup: 'YYYY-MM-DD' → Decimal rate (merges all available years)
const rateMap = new Map()
for (const { date, rate } of [...rates2024, ...rates2025]) {
  const [d, m, y] = date.split('.')
  rateMap.set(`${y}-${m}-${d}`, new Decimal(String(rate)))
}
const sortedDates = [...rateMap.keys()].sort()

/** Returns the BNB USD/BGN Decimal rate for the nearest previous trading day. */
export function findUsdRate(dateStr) {
  if (rateMap.has(dateStr)) return rateMap.get(dateStr)
  if (dateStr < sortedDates[0]) return null
  let lo = 0, hi = sortedDates.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (sortedDates[mid] <= dateStr) lo = mid
    else hi = mid - 1
  }
  return rateMap.get(sortedDates[lo]) ?? null
}

/**
 * Convert amount to BGN using the BNB rate for dateStr.
 * Accepts number, string, or Decimal; returns Decimal or null.
 */
export function toBGN(amount, currency, dateStr) {
  if (amount == null || !currency) return null
  const d = amount instanceof Decimal ? amount : new Decimal(String(amount))
  if (currency === 'EUR') return d.times(EUR_BGN)
  if (currency === 'USD') {
    const rate = findUsdRate(dateStr)
    return rate != null ? d.times(rate) : null
  }
  return null
}

/** Last trading day of the current tax year (for year-end BGN conversions). */
export const YEAR_END_DATE = '2025-12-30'

/** Last trading day of the previous year (for rate lookups). */
export const PREV_YEAR_END_DATE = '2024-12-30'

/**
 * Default acquisition date for prior-year positions where the exact
 * purchase date is unknown — 31 December of the previous year.
 */
export const PREV_YEAR_DEFAULT_ACQ_DATE = '2024-12-31'
