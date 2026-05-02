import { parseHtmlDocument } from './htmlParser.js'
import { parseInput } from './parseInput.js'

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
  const csvText = await csvFile.text()
  const htmlDoc = parseHtmlDocument(await htmlFile.text())
  return parseInput({ csvText, htmlDoc })
}
