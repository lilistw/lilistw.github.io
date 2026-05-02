import { parseTradesFromHtml } from './htmlParser.js'
import { parseActivityStatementCsv } from './csvParser.js'


/**
 * Read uploaded File objects and return InputData.
 *
 * This is the browser-side entry point. It handles all File and DOM API calls,
 * then delegates to the pure parseInput use-case.
 *
 * @param {{ csvFile: File, htmlFile: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInputFromFiles({ csvFile, htmlFile }) {
  const activityStatement = parseActivityStatementCsv(await csvFile.text())
  const tradeConfirmation = parseTradesFromHtml(await htmlFile.text())
  return { activityStatement, tradeConfirmation }
}
