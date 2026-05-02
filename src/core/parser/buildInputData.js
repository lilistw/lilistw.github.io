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

  const instruments = parseInstruments(activityStatement)
  const openPositions = parseOpenPositions(activityStatement)
  const csvTrades = parseCsvTrades(activityStatement)
  const inferredPriorPositions = inferPriorPositions({ trades: tradeConfirmation, openPositions, csvTrades, instruments, period})

  return {
    statement,
    account,
    taxYear,
    period,
    instruments,
    dividends:      parseDividends(activityStatement),
    withholdingTax: parseWithholdingTax(activityStatement),
    trades : tradeConfirmation,
    openPositions,
    csvTrades,
    inferredPriorPositions,
    interest:       parseInterest(activityStatement),
  }
}
