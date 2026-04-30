import {
  getLocalCurrencyCode,
  getLocalCurrencyLabel,
  getPrevYearEndDate,
} from '../domain/fx/fxRates.js'

import { DividendCalculator } from '../domain/tax/DividendCalculator.js'
import { InterestCalculator } from '../domain/tax/InterestCalculator.js'
import { TradeCalculator } from '../domain/tax/TradeCalculator.js'
import { HoldingsCalculator } from '../domain/tax/HoldingsCalculator.js'

// -------------------------
// CONTEXT
// -------------------------
function buildTaxContext(taxYear) {
  return Object.freeze({
    taxYear,
    localCurrencyCode: getLocalCurrencyCode(taxYear),
    localCurrencyLabel: getLocalCurrencyLabel(taxYear),
    prevYearEndDate: getPrevYearEndDate(taxYear),
  })
}

// -------------------------
// SERVICE
// -------------------------
export function calculateTax(input, priorPositions = [], { strategy = 'ibkr' } = {}) {
  const { taxYear } = input

  const context = buildTaxContext(taxYear)

  const { instrumentInfo, csvTradeBasis } = input

  // --- TRADES ---
  const tradeCalc = new TradeCalculator({ instrumentInfo, csvTradeBasis, context, strategy })
  const { trades, calculatedPositions, taxSummary } = tradeCalc.calculate(input.trades, priorPositions)

  // --- HOLDINGS ---
  const holdingsCalc = new HoldingsCalculator({ instrumentInfo })

  const holdings = holdingsCalc.calculate({
    openPositions: input.openPositions,
    positions: calculatedPositions,
    priorPositions,
    trades: input.trades,
  })

  // --- DIVIDENDS (domain) ---
  const dividends = new DividendCalculator({
    instrumentInfo,
    context,
  }).calculate(input)

  // --- INTEREST ---
  const interest = new InterestCalculator({
    context,
  }).calculate(input)

  // --- RESULT ---
  return {
    trades,
    taxSummary,
    holdings,
    dividends,
    interest,
    taxYear: context.taxYear,
    localCurrencyCode: context.localCurrencyCode,
    localCurrencyLabel: context.localCurrencyLabel,
  }
}