import { parseCSV } from '../infra/csvReader.js'
import { parseTrades } from '../domain/parser/ibkrParser.js'

/**
 * Main entry point: reads a File object and returns parsed trades.
 * @param {File} file
 * @returns {Promise<{ trades: object[] }>}
 */
export async function processFile(file) {
  const text = await file.text()
  const rows = parseCSV(text)
  const trades = parseTrades(rows)
  return { trades }
}
