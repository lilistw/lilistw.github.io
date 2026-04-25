import { parseCSV } from './readCsv.js'
import { validateCsvContent, validateHtmlContent, validatePdfContent, validateTradeCurrencies } from './validateInput.js'
import { readPdfPages } from '../io/readPdf.js'
import { PdfToCsvAdapter } from '../domain/parser/pdf/PdfToCsvAdapter.js'
import { parseTradePdf } from '../domain/parser/pdf/PdfTradeConfirmationParser.js'
import { parseStatementInfo } from '../domain/parser/parseStatementInfo.js'
import { parseInstruments } from '../domain/parser/parseInstruments.js'
import { parseDividends, parseWithholdingTax } from '../domain/parser/parseDividends.js'
import { parseTradesFromHtml } from '../domain/parser/parseTradesHtml.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'
import { parseCsvTrades } from '../domain/parser/parseCsvTrades.js'
import { parseInterest } from '../domain/parser/parseInterest.js'
import { parseTaxYear } from '../domain/parser/parseTaxYear.js'

/**
 * Read uploaded files and parse them into a raw InputData object.
 *
 * Activity Statement: { csvFile } or { pdfFile } (mutually exclusive).
 * Trade Confirmation: { htmlFile } or { tradePdfFile } (mutually exclusive).
 *
 * No tax calculations are performed here — only parsing close to the source.
 * All financial values are raw strings matching the input files.
 *
 * @param {{ csvFile?: File, pdfFile?: File, htmlFile?: File, tradePdfFile?: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInput({ csvFile, htmlFile, pdfFile, tradePdfFile }) {
  // --- Activity Statement ---
  let csvRows
  if (pdfFile) {
    const pages = await readPdfPages(pdfFile)
    csvRows = new PdfToCsvAdapter().adapt(pages)
    validatePdfContent(csvRows)
  } else {
    const csvText = await csvFile.text()
    csvRows = parseCSV(csvText)
    validateCsvContent(csvRows)
  }

  // --- Trade Confirmation ---
  let trades
  if (tradePdfFile) {
    const pages = await readPdfPages(tradePdfFile)
    trades = parseTradePdf(pages)
  } else {
    const htmlText = await htmlFile.text()
    const htmlDoc = new DOMParser().parseFromString(htmlText, 'text/html')
    validateHtmlContent(htmlDoc)
    trades = parseTradesFromHtml(htmlText)
  }

  validateTradeCurrencies(trades)

  const { statement, account } = parseStatementInfo(csvRows)

  // Validate year early for user feedback — throws if unsupported
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
