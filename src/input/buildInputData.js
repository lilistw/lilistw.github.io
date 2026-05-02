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

import { parseCSV }                                        from './readCsv.js'
import { parseTradesFromHtml }                             from '../core/domain/parser/parseTradesHtml.js'
import { parseStatementInfo }                              from '../core/domain/parser/parseStatementInfo.js'
import { parseInstruments }                                from '../core/domain/parser/parseInstruments.js'
import { parseDividends, parseWithholdingTax }             from '../core/domain/parser/parseDividends.js'
import { parseOpenPositions }                              from '../core/domain/parser/parseOpenPositions.js'
import { parseCsvTrades }                                  from '../core/domain/parser/parseCsvTrades.js'
import { parseInterest }                                   from '../core/domain/parser/parseInterest.js'
import { parseTaxYear }                                    from '../core/domain/parser/parseTaxYear.js'
import {
  validateCsvContent,
  validateHtmlContent,
  validateTradeCurrencies,
} from './validateInput.js'

// ---------------------------------------------------------------------------
// Activity Statement
// ---------------------------------------------------------------------------

/**
 * Parse an Activity Statement CSV into normalized rows.
 * @param {string} csvText
 * @returns {string[][]}
 */
export function parseActivityStatementCsv(csvText) {
  const rows = parseCSV(csvText)
  validateCsvContent(rows)
  return rows
}

// ---------------------------------------------------------------------------
// Trade Confirmation
// ---------------------------------------------------------------------------

/**
 * Parse a Trade Confirmation HTML document into normalized trade objects.
 * @param {Document} doc - pre-parsed HTML document
 * @returns {object[]}
 */
export function parseTradeConfirmationHtml(doc) {
  validateHtmlContent(doc)
  const trades = parseTradesFromHtml(doc)
  validateTradeCurrencies(trades)
  return trades
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
export function buildInputData(csvRows, trades) {
  const { statement, account } = parseStatementInfo(csvRows)
  const taxYear = parseTaxYear(statement.period)

  return {
    statement,
    account,
    taxYear,
    period:         statement.period,
    instruments:    parseInstruments(csvRows),
    dividends:      parseDividends(csvRows),
    withholdingTax: parseWithholdingTax(csvRows),
    trades,
    openPositions:  parseOpenPositions(csvRows),
    csvTrades:      parseCsvTrades(csvRows),
    interest:       parseInterest(csvRows),
  }
}
