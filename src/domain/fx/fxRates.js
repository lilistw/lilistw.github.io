import rates2024 from './rates/2024.json'
import rates2025 from './rates/2025.json'

const EUR_BGN = 1.95583  // fixed peg

// Build lookup: 'YYYY-MM-DD' → rate (merges all available years)
const rateMap = new Map()
for (const { date, rate } of [...rates2024, ...rates2025]) {
  const [d, m, y] = date.split('.')
  rateMap.set(`${y}-${m}-${d}`, rate)
}
const sortedDates = [...rateMap.keys()].sort()

export function findUsdRate(dateStr) {
  // dateStr: 'YYYY-MM-DD', returns BNB rate for nearest previous trading day
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

export function toBGN(amount, currency, dateStr) {
  if (amount == null || !currency) return null
  if (currency === 'EUR') return amount * EUR_BGN
  if (currency === 'USD') {
    const rate = findUsdRate(dateStr)
    return rate != null ? amount * rate : null
  }
  return null  // unsupported currency
}

export const YEAR_END_DATE      = '2025-12-30'
export const PREV_YEAR_END_DATE = '2024-12-30'
