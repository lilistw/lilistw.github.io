import Decimal from 'decimal.js'
import rates2024 from './rates/2024.fx.json'
import rates2025 from './rates/2025.fx.json'
import rates2026 from './rates/2026.fx.json'
import { t } from '../../localization/i18n.js'

export const EUR_BGN = new Decimal('1.95583')  // fixed peg


const getRateMap = (taxYear, rates) => {
  const rateMap = new Map();
  for (const [ date, rate ] of Object.entries(rates)) {
    rateMap.set(date, new Decimal(rate));
  }
  return rateMap;
}

// Unified rate map: 'YYYY-MM-DD' → Decimal USD/BGN.
// 2024/2025 files hold USD/BGN directly.
// 2026 file holds USD/EUR; normalised by × EUR_BGN so the map is always USD/BGN.
const ratesByYear = {
  2026: getRateMap(2026, rates2026),
  2025: getRateMap(2025, rates2025)
}


/** Returns the USD/BGN Decimal rate for the nearest previous trading day. */
export function findUsdRate(dateStr, taxYear) {
  return ratesByYear[taxYear].get(dateStr);
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
  if (currency === 'EUR') {
    if (taxYear < 2026) {
      return amount.times(EUR_BGN);
    }
    return amount;
  }
  if (currency === 'USD') {
    const usdBgn = findUsdRate(dateStr, taxYear);
    return amount.times(usdBgn);
  }
  console.warn(`Unsupported currency ${currency} for local conversion`)
  return null
}

// ── Tax-year helpers ──────────────────────────────────────────────────────────

export function getLocalCurrencyCode(taxYear)      { return taxYear >= 2026 ? 'EUR' : 'BGN' }
export function getLocalCurrencyLabel(taxYear)     { return taxYear >= 2026 ? t('currencyLabels.eur') : t('currencyLabels.bgnShort') }
export function getYearEndDate(taxYear)            { return `${taxYear}-12-31` }
export function getPrevYearEndDate(taxYear) { return `${taxYear - 1}-12-31` }
