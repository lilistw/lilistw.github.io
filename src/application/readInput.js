import { readPdfPages } from '../io/readPdf.js'
import {
  parseActivityStatementCsv,
  parseActivityStatementPdf,
  parseTradeConfirmationHtml,
  parseTradeConfirmationPdf,
  buildInputData,
} from '../parsing/parseInput.js'

/**
 * Read uploaded files and parse them into a raw InputData object.
 *
 * Activity Statement: { csvFile } or { pdfFile } (mutually exclusive).
 * Trade Confirmation: { htmlFile } or { tradePdfFile } (mutually exclusive).
 *
 * @param {{ csvFile?: File, pdfFile?: File, htmlFile?: File, tradePdfFile?: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInput({ csvFile, htmlFile, pdfFile, tradePdfFile }) {
  const csvRows = pdfFile
    ? parseActivityStatementPdf(await readPdfPages(pdfFile))
    : parseActivityStatementCsv(await csvFile.text())

  const trades = tradePdfFile
    ? parseTradeConfirmationPdf(await readPdfPages(tradePdfFile))
    : parseTradeConfirmationHtml(await htmlFile.text())

  return buildInputData(csvRows, trades)
}
