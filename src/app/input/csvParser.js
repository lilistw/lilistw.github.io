import Papa from 'papaparse'
import { validateCsvContent } from './validateInput.js'

/** Parse CSV text into a 2D array of rows. */
export function parseActivityStatementCsv(text) {
  const rows = Papa.parse(text, { skipEmptyLines: true }).data
  validateCsvContent(rows)
  return rows
}
