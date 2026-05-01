import { readPdfPages } from './readPdf.js'
import { parseHtmlDocument } from './readHtml.js'
import {
  parseActivityStatementCsv,
  parseActivityStatementPdf,
  parseTradeConfirmationHtml,
  parseTradeConfirmationPdf,
  buildInputData,
} from './parseInput.js'

/**
 * Read uploaded File objects and return InputData.
 *
 * Activity Statement: { csvFile } or { pdfFile } (mutually exclusive).
 * Trade Confirmation: { htmlFile } or { tradePdfFile } (mutually exclusive).
 *
 * @param {{ csvFile?: File, pdfFile?: File, htmlFile?: File, tradePdfFile?: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInputFromFiles({ csvFile, htmlFile, pdfFile, tradePdfFile }) {
  const csvPdfPages   = pdfFile      ? await readPdfPages(pdfFile)      : null
  const tradePdfPages = tradePdfFile ? await readPdfPages(tradePdfFile) : null
  const csvText       = csvFile      ? await csvFile.text()             : null
  const htmlDoc       = htmlFile     ? parseHtmlDocument(await htmlFile.text()) : null

  const csvRows = csvText       ? parseActivityStatementCsv(csvText)    : parseActivityStatementPdf(csvPdfPages)
  const trades  = htmlDoc       ? parseTradeConfirmationHtml(htmlDoc)   : parseTradeConfirmationPdf(tradePdfPages)

  return buildInputData(csvRows, trades)
}
