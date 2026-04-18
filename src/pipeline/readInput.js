import { parseCSV } from '../io/readCsv.js'
import { parseTradesFromHtml } from '../domain/parser/parseTradesHtml.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'
import { parseCsvTradeBasis } from '../domain/parser/parseCsvTrades.js'
import { parseDividends } from '../domain/parser/parseDividends.js'
import { parseInterest } from '../domain/parser/parseInterest.js'
import { parseFinancialInstrumentInfo } from '../domain/parser/parseFinancialInstrumentInfo.js'
import { parseTaxYear } from '../domain/parser/parseTaxYear.js'

/**
 * Read both uploaded files and parse them into a structured InputData object.
 * No tax calculations are performed here — only parsing and normalisation.
 *
 * @param {{ csvFile: File, htmlFile: File }} files
 * @returns {Promise<InputData>}
 */
export async function readInput({ csvFile, htmlFile }) {
  const [htmlText, csvText] = await Promise.all([
    htmlFile.text(),
    csvFile.text(),
  ])

  const csvRows        = parseCSV(csvText)
  const taxYear        = parseTaxYear(csvRows)
  const instrumentInfo = parseFinancialInstrumentInfo(csvRows)
  const trades         = parseTradesFromHtml(htmlText)
  const openPositions  = parseOpenPositions(csvRows, instrumentInfo, {})
  const csvTradeBasis  = parseCsvTradeBasis(csvRows)
  const dividends      = parseDividends(csvRows, instrumentInfo)
  const interest       = parseInterest(csvRows)

  return {
    taxYear,
    instrumentInfo,
    trades,
    openPositions,
    csvTradeBasis,
    dividends,
    interest,
    csvRows,
  }
}
