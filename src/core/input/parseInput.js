/**
 * Parsing module — pure functions, no file I/O.
 *
 * Accepts already-read content (text or PdfPage[]) and returns normalized
 * domain objects. The InputData schema is identical regardless of whether
 * the source was CSV, HTML, or PDF.
 *
 * Entry points:
 *   parseActivityStatementCsv(csvText)  → string[][]
 *   parseActivityStatementPdf(pages)    → string[][]
 *   parseTradeConfirmationHtml(htmlText) → Trade[]
 *   parseTradeConfirmationPdf(pages)    → Trade[]
 *   buildInputData(csvRows, trades)     → InputData
 */

import { parseCSV }                                        from '../../readers/readCsv.js'
import { PdfTableExtractor }                                from '../domain/parser/PdfTableExtractor.js'
import { parseTradePdf }                                   from '../domain/parser/PdfTradeConfirmationParser.js'
import { parseTradesFromHtml }                             from '../domain/parser/parseTradesHtml.js'
import { parseStatementInfo }                              from '../domain/parser/parseStatementInfo.js'
import { parseInstruments }                                from '../domain/parser/parseInstruments.js'
import { parseDividends, parseWithholdingTax }             from '../domain/parser/parseDividends.js'
import { parseOpenPositions }                              from '../domain/parser/parseOpenPositions.js'
import { parseCsvTrades }                                  from '../domain/parser/parseCsvTrades.js'
import { parseInterest }                                   from '../domain/parser/parseInterest.js'
import { parseTaxYear }                                    from '../domain/parser/parseTaxYear.js'
import {
  validateCsvContent,
  validateHtmlContent,
  validatePdfContent,
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

/**
 * Parse an Activity Statement PDF into normalized rows.
 * @param {import('../io/readPdf.js').PdfPage[]} pages
 * @returns {string[][]}
 */
export function parseActivityStatementPdf(pages) {
  const rows = new PdfTableExtractor().adapt(pages)
  validatePdfContent(rows)
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

/**
 * Parse a Trade Confirmation PDF into normalized trade objects.
 * @param {import('../io/readPdf.js').PdfPage[]} pages
 * @returns {object[]}
 */
export function parseTradeConfirmationPdf(pages) {
  const trades = parseTradePdf(pages)
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
    instruments:    parseInstruments(csvRows),
    dividends:      parseDividends(csvRows),
    withholdingTax: parseWithholdingTax(csvRows),
    trades,
    openPositions:  parseOpenPositions(csvRows),
    csvTrades:      parseCsvTrades(csvRows),
    interest:       parseInterest(csvRows),
  }
}
