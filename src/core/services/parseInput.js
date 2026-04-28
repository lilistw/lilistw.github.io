import {
  parseActivityStatementCsv,
  parseActivityStatementPdf,
  parseTradeConfirmationHtml,
  parseTradeConfirmationPdf,
  buildInputData,
} from '../input/parseInput.js'

/**
 * Parse pre-read content into InputData. All inputs are plain data — no File or browser APIs.
 *
 * Activity Statement: provide csvText (CSV) or csvPdfPages (PDF), not both.
 * Trade Confirmation: provide htmlDoc (HTML, pre-parsed Document) or tradePdfPages (PDF), not both.
 *
 * @param {{ csvText?: string, htmlDoc?: Document, csvPdfPages?: object[], tradePdfPages?: object[] }} input
 * @returns {InputData}
 */
export function parseInput({ csvText, htmlDoc, csvPdfPages, tradePdfPages }) {
  const csvRows = csvPdfPages
    ? parseActivityStatementPdf(csvPdfPages)
    : parseActivityStatementCsv(csvText)

  const trades = tradePdfPages
    ? parseTradeConfirmationPdf(tradePdfPages)
    : parseTradeConfirmationHtml(htmlDoc)

  return buildInputData(csvRows, trades)
}
