import { readPdfPages } from './readPdf.js'
import { parseHtmlDocument } from './htmlParser.js'
import { parseInput } from '../../core/services/parseInput.js'

/**
 * Read uploaded File objects and return InputData.
 *
 * This is the browser-side entry point. It handles all File and DOM API calls,
 * then delegates to the pure parseInput use-case.
 *
 * Activity Statement: { csvFile } or { pdfFile } (mutually exclusive).
 * Trade Confirmation: { htmlFile } or { tradePdfFile } (mutually exclusive).
 *
 * @param {{ csvFile?: File, pdfFile?: File, htmlFile?: File, tradePdfFile?: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInputFromFiles({ csvFile, htmlFile, pdfFile, tradePdfFile }) {
  const csvPdfPages   = pdfFile      ? await readPdfPages(pdfFile)                           : null
  const tradePdfPages = tradePdfFile ? await readPdfPages(tradePdfFile)                      : null
  const csvText       = csvFile      ? await csvFile.text()                                  : null
  const htmlDoc       = htmlFile     ? parseHtmlDocument(await htmlFile.text())              : null

  return parseInput({ csvText, htmlDoc, csvPdfPages, tradePdfPages })
}
