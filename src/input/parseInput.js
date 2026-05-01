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

import { parseCSV }                                        from './readCsv.js'
import { PdfTableExtractor }                                from './PdfTableExtractor.js'
import { parseTradePdf }                                   from './PdfTradeConfirmationParser.js'
import { parseTradesFromHtml }                             from './parseTradesHtml.js'
import { parseStatementInfo }                              from './parseStatementInfo.js'
import { parseInstruments, buildInstrumentInfo }          from './parseInstruments.js'
import { parseDividends, parseWithholdingTax }             from './parseDividends.js'
import { parseOpenPositions }                              from './parseOpenPositions.js'
import { parseCsvTrades, buildCsvTradeBasis }              from './parseCsvTrades.js'
import { parseInterest }                                   from './parseInterest.js'
import { parseTaxYear }                                    from './parseTaxYear.js'
import {
  validateCsvContent,
  validateHtmlContent,
  validatePdfContent,
  validateTradeCurrencies,
} from './validateInput.js'

// ---------------------------------------------------------------------------
// Activity Statement
// ---------------------------------------------------------------------------

export function parseActivityStatementCsv(csvText) {
  const rows = parseCSV(csvText)
  validateCsvContent(rows)
  return rows
}

export function parseActivityStatementPdf(pages) {
  const rows = new PdfTableExtractor().adapt(pages)
  validatePdfContent(rows)
  return rows
}

// ---------------------------------------------------------------------------
// Trade Confirmation
// ---------------------------------------------------------------------------

export function parseTradeConfirmationHtml(doc) {
  validateHtmlContent(doc)
  const trades = parseTradesFromHtml(doc)
  validateTradeCurrencies(trades)
  return trades
}

export function parseTradeConfirmationPdf(pages) {
  const trades = parseTradePdf(pages)
  validateTradeCurrencies(trades)
  return trades
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function buildInputData(csvRows, trades) {
  const { statement, account } = parseStatementInfo(csvRows)
  const taxYear      = parseTaxYear(statement.period)
  const instruments  = parseInstruments(csvRows)
  const csvTrades    = parseCsvTrades(csvRows)

  return {
    statement,
    account,
    taxYear,
    instruments,
    dividends:      parseDividends(csvRows),
    withholdingTax: parseWithholdingTax(csvRows),
    trades,
    openPositions:  parseOpenPositions(csvRows),
    csvTrades,
    interest:       parseInterest(csvRows),
    instrumentInfo: buildInstrumentInfo(instruments),
    csvTradeBasis:  buildCsvTradeBasis(csvTrades),
  }
}
