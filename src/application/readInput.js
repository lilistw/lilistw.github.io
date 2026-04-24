import { parseCSV } from './readCsv.js'
import { validateCsvContent, validateHtmlContent, validatePdfContent, validateTradeCurrencies } from './validateInput.js'
import { readPdfText } from '../io/readPdf.js'
import { PdfToCsvAdapter } from '../domain/parser/pdf/PdfToCsvAdapter.js'
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
 * Accepts either { csvFile, htmlFile } or { pdfFile, htmlFile } —
 * pdfFile is an Activity Statement PDF and substitutes for csvFile.
 * No tax calculations are performed here — only parsing close to the source.
 * All financial values are raw strings matching the input files.
 *
 * @param {{ csvFile?: File, htmlFile: File, pdfFile?: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInput({ csvFile, htmlFile, pdfFile }) {
  let csvRows
  let htmlText

  if (pdfFile) {
    const [pdfText, html] = await Promise.all([readPdfText(pdfFile), htmlFile.text()])
    csvRows = new PdfToCsvAdapter().adapt(pdfText)
    validatePdfContent(csvRows)
    htmlText = html
  } else {
    const [html, csvText] = await Promise.all([htmlFile.text(), csvFile.text()])
    csvRows = parseCSV(csvText)
    validateCsvContent(csvRows)
    htmlText = html
  }

  const htmlDoc = new DOMParser().parseFromString(htmlText, 'text/html')
  validateHtmlContent(htmlDoc)

  const { statement, account } = parseStatementInfo(csvRows)

  // Validate year early for user feedback — throws if unsupported
  const taxYear = parseTaxYear(statement.period)

  const trades = parseTradesFromHtml(htmlText)
  validateTradeCurrencies(trades)

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
