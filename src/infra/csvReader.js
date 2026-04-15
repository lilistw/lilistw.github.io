import Papa from 'papaparse'

/**
 * Parses CSV text into a 2D array of rows.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCSV(text) {
  const result = Papa.parse(text, { skipEmptyLines: true })
  return result.data
}
