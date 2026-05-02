/**
 * Parsing module — pure functions, no file I/O.
 *
 * Accepts already-read content (text or Document) and returns normalized
 * domain objects. The InputData schema is identical regardless of whether
 * the source was CSV or HTML.
 *
 * Entry points:
 *   parseActivityStatementCsv(csvText)   → string[][]
 *   parseTradeConfirmationHtml(htmlText) → Trade[]
 *   buildInputData(csvRows, trades)      → InputData
 */

import { parseStatementInfo }                              from './parsers/parseStatementInfo.js'
import { parseInstruments }                                from './parsers/parseInstruments.js'
import { parseDividends, parseWithholdingTax }             from './parsers/parseDividends.js'
import { parseOpenPositions }                              from './parsers/parseOpenPositions.js'
import { parseCsvTrades }                                  from './parsers/parseCsvTrades.js'
import { parseInterest }                                   from './parsers/parseInterest.js'
import { parseTaxYear }                                    from './parsers/parseTaxYear.js'
import { inferPriorPositions }                             from './inferPriorPositions.js'

import {
  getLocalCurrencyCode,
  getLocalCurrencyLabel,
  getPrevYearEndDate,
  findUsdRate
} from '../domain/fx/fxRates.js'

// -------------------------
// CONTEXT
// -------------------------
function buildTaxContext(taxYear) {
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  return Object.freeze({
    taxYear,
    localCurrencyCode: getLocalCurrencyCode(taxYear),
    localCurrencyLabel: getLocalCurrencyLabel(taxYear),
    prevYearEndDate,
    prevYearUsdRate: findUsdRate(prevYearEndDate, taxYear)
  })
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Assemble normalized InputData from parsed activity rows and trades.
 * This is the canonical InputData schema — identical regardless of file source.
 *
 * @param {string[][]} csvRows
 * @param {object[]} trades
 * @returns {InputData}
 */
export function buildInputData({activityStatement, tradeConfirmation}) {
  const { statement, account } = parseStatementInfo(activityStatement)
  const period = statement.period  
  const taxYear = parseTaxYear(period)

  const taxContext = buildTaxContext(taxYear)

  const instruments = parseInstruments(activityStatement)
  const openPositions = parseOpenPositions(activityStatement)
  const csvTrades = parseCsvTrades(activityStatement)
  const inferredPriorPositions = inferPriorPositions({ trades: tradeConfirmation, openPositions, csvTrades, instruments, period})
  const dividends = parseDividends(activityStatement)
  const withholdingTax = parseWithholdingTax(activityStatement)
  const interest = parseInterest(activityStatement)
  const trades = tradeConfirmation


  return {
    statement,
    account,
    period,
    instruments,
    dividends,
    withholdingTax,
    trades,
    openPositions,
    csvTrades,
    inferredPriorPositions,
    interest,
    taxContext
  }
}
