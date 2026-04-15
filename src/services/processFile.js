import { parseCSV } from '../infra/csvReader.js'
import { parseTrades } from '../domain/parser/ibkrParser.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'

/**
 * Main entry point: reads a File object and returns parsed trades and holdings.
 * @param {File} file
 * @returns {Promise<{ trades: object[], holdings: object[] }>}
 */
export async function processFile(file) {
  const text = await file.text()
  const rows = parseCSV(text)
  const trades = parseTrades(rows)
  const holdings = parseOpenPositions(rows)
  return { trades, holdings }
}
