import Decimal from 'decimal.js'
import rates2024 from './rates/2024.json'
import rates2025 from './rates/2025.json'
import rates2026 from './rates/2026.json'
import { t } from '../../localization/i18n.js'

export const EUR_BGN = new Decimal('1.95583')  // fixed peg

// Unified rate map: 'YYYY-MM-DD' → Decimal USD/BGN.
// 2024/2025 files hold USD/BGN directly.
// 2026 file holds USD/EUR; normalised by × EUR_BGN so the map is always USD/BGN.
const rateMap = new Map()
for (const { date, rate } of [...rates2024, ...rates2025]) {
  const [d, m, y] = date.split('.')
  rateMap.set(`${y}-${m}-${d}`, new Decimal(String(rate)))
}
for (const { date, rate } of rates2026) {
  const [d, m, y] = date.split('.')
  rateMap.set(`${y}-${m}-${d}`, new Decimal(String(rate)).times(EUR_BGN))
}
const sortedDates = [...rateMap.keys()].sort()

/** Returns the USD/BGN Decimal rate for the nearest previous trading day. */
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
 * Convert amount to BGN.
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

/**
 * Convert amount to the local reporting currency for taxYear.
 *   2025 → BGN  (same as toBGN)
 *   2026+ → EUR (EUR passes through; USD uses USD/BGN ÷ EUR_BGN)
 *
 * findUsdRate always returns USD/BGN, so USD→EUR = rate ÷ EUR_BGN.
 */
export function toLocalCurrency(amount, currency, dateStr, taxYear) {
  if (amount == null || !currency) return null
  const d = amount instanceof Decimal ? amount : new Decimal(String(amount))
  if (taxYear >= 2026) {
    if (currency === 'EUR') return d
    if (currency === 'USD') {
      const usdBgn = findUsdRate(dateStr)
      return usdBgn != null ? d.times(usdBgn).div(EUR_BGN) : null
    }
    return null
  }
  return toBGN(amount, currency, dateStr)
}

// ── Tax-year helpers ──────────────────────────────────────────────────────────

export function getLocalCurrencyCode(taxYear)      { return taxYear >= 2026 ? 'EUR' : 'BGN' }
export function getLocalCurrencyLabel(taxYear)     { return taxYear >= 2026 ? t('currencyLabels.eur') : t('currencyLabels.bgnShort') }
export function getYearEndDate(taxYear)            { return `${taxYear}-12-30` }
export function getPrevYearEndDate(taxYear)        { return `${taxYear - 1}-12-30` }
export function getPrevYearDefaultAcqDate(taxYear) { return `${taxYear - 1}-12-31` }

// ── Legacy 2025 constants ─────────────────────────────────────────────────────
export const YEAR_END_DATE              = getYearEndDate(2025)
export const PREV_YEAR_END_DATE         = getPrevYearEndDate(2025)
export const PREV_YEAR_DEFAULT_ACQ_DATE = getPrevYearDefaultAcqDate(2025)
