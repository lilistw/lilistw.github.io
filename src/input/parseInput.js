import {
  parseActivityStatementCsv,
  parseTradeConfirmationHtml,
  buildInputData,
} from './buildInputData.js'

/**
 * Parse pre-read content into InputData. All inputs are plain data — no File or browser APIs.
 *
 * @param {{ csvText: string, htmlDoc: Document }} input
 * @returns {InputData}
 */
export function parseInput({ csvText, htmlDoc }) {
  const csvRows = parseActivityStatementCsv(csvText)
  const trades  = parseTradeConfirmationHtml(htmlDoc)
  return buildInputData(csvRows, trades)
}
