import Papa from 'papaparse'

/** Parse CSV text into a 2D array of rows. */
export function parseCSV(text) {
  return Papa.parse(text, { skipEmptyLines: true }).data
}
