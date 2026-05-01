// @vitest-environment jsdom
/**
 * Integration test: CSV/HTML and PDF parsing paths must produce equivalent InputData.
 *
 * This file tests two things:
 *  1. The CSV + HTML path (using the demo files already in the project) produces a
 *     valid, complete InputData — confirming the existing parsers are unaffected.
 *  2. The PdfTableExtractor produces rows that are structurally compatible with every
 *     domain parser (correct header/data shapes, column names, DataDiscriminator values).
 *
 * Full PDF ↔ CSV parity using the sample files from issue #99 requires real IBKR PDFs.
 * Those PDFs cannot be parsed in Node.js (pdfjs-dist needs a browser Worker), so that
 * comparison is documented here as a manual verification step:
 *
 *   1. Open the app in a browser.
 *   2. Upload the activity_sample.pdf + trade_sample.htm → note the InputData JSON.
 *   3. Upload the activity_sample_csv.csv + trade_sample.htm → note the InputData JSON.
 *   4. The two JSONs must be deeply equal (except for fields absent from PDFs such as
 *      'Settle Date/Time' and 'Exchange', which will be '' in the PDF path).
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parseActivityStatementCsv, parseTradeConfirmationHtml, buildInputData } from '../parseInput.js'
import { PdfTableExtractor } from '../PdfTableExtractor.js'
import { validatePdfContent } from '../validateInput.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_DIR = resolve(import.meta.dirname, '../../../public/demo')

function loadDemoCsv() {
  return readFileSync(resolve(DEMO_DIR, 'U0_2025_activity_demo.csv'), 'utf-8')
}

function loadDemoHtmlDoc() {
  const html = readFileSync(resolve(DEMO_DIR, 'U0_2025_trades_demo.htm'), 'utf-8')
  return new DOMParser().parseFromString(html, 'text/html')
}

// ---------------------------------------------------------------------------
// 1. CSV + HTML path — existing parsers must still work
// ---------------------------------------------------------------------------

describe('CSV + HTML path produces valid InputData', () => {
  it('parseActivityStatementCsv returns rows with Statement marker', () => {
    const rows = parseActivityStatementCsv(loadDemoCsv())
    expect(rows.some(r => r[0] === 'Statement' && r[1] === 'Data')).toBe(true)
  })

  it('parseTradeConfirmationHtml returns trade objects with required fields', () => {
    const trades = parseTradeConfirmationHtml(loadDemoHtmlDoc())
    expect(trades.length).toBeGreaterThan(0)
    const t = trades[0]
    expect(t).toHaveProperty('symbol')
    expect(t).toHaveProperty('currency')
    expect(t).toHaveProperty('side')
    expect(t).toHaveProperty('quantity')
    expect(t).toHaveProperty('price')
  })

  it('buildInputData from CSV produces all required InputData fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const trades = parseTradeConfirmationHtml(loadDemoHtmlDoc())
    const data = buildInputData(csvRows, trades)

    expect(data.statement).toBeDefined()
    expect(data.statement.brokerName).toMatch(/Interactive Brokers/)
    expect(data.account).toBeDefined()
    expect(data.account.accountId).toBeTruthy()
    expect(typeof data.taxYear).toBe('number')
    expect(Array.isArray(data.instruments)).toBe(true)
    expect(data.instruments.length).toBeGreaterThan(0)
    expect(Array.isArray(data.dividends)).toBe(true)
    expect(Array.isArray(data.withholdingTax)).toBe(true)
    expect(Array.isArray(data.trades)).toBe(true)
    expect(Array.isArray(data.openPositions)).toBe(true)
    expect(Array.isArray(data.csvTrades)).toBe(true)
    expect(data.csvTrades.length).toBeGreaterThan(0)
    expect(Array.isArray(data.interest)).toBe(true)
  })

  it('csvTrades have required fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const data = buildInputData(csvRows, [])
    const t = data.csvTrades[0]
    expect(t).toHaveProperty('symbol')
    expect(t).toHaveProperty('currency')
    expect(t).toHaveProperty('side')
    expect(t).toHaveProperty('quantity')
    expect(t).toHaveProperty('datetime')
  })

  it('openPositions have required fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const data = buildInputData(csvRows, [])
    expect(data.openPositions.length).toBeGreaterThan(0)
    const p = data.openPositions[0]
    expect(p).toHaveProperty('symbol')
    expect(p).toHaveProperty('currency')
    expect(p).toHaveProperty('assetCategory')
    expect(p).toHaveProperty('quantity')
  })
})

// ---------------------------------------------------------------------------
// 2. PdfTableExtractor structural compatibility
// ---------------------------------------------------------------------------

/**
 * Build a minimal but structurally complete PdfPage set that covers every section
 * the domain parsers consume.  The coordinate layout mirrors a real IBKR PDF
 * (landscape 792×612, rows increase downward, items sorted left-to-right).
 */
function makeFullActivityPages() {
  const colMid = 396  // page midpoint separating left vs right columns

  const page1 = {
    colWidth: 792,
    rowHeight: 612,
    rows: [
      // ---- Page header (Statement synthesis) ----
      { row: 50,  items: [{ col: 450, str: 'Activity Statement', width: 100 }] },
      { row: 62,  items: [{ col: 410, str: 'January 1, 2025 - December 31, 2025', width: 180 }] },
      { row: 120, items: [{ col: 250, str: 'Interactive Brokers LLC, Greenwich', width: 200 }] },

      // ---- Account Information ----
      { row: 170, items: [{ col: 38, str: 'Account Information', width: 100 }] },
      { row: 182, items: [{ col: 38, str: 'Name', width: 30 }, { col: 110, str: 'Demo Investor', width: 70 }] },
      { row: 194, items: [{ col: 38, str: 'Account', width: 30 }, { col: 110, str: 'U00000001', width: 50 }] },
      { row: 206, items: [{ col: 38, str: 'Account Type', width: 50 }, { col: 110, str: 'Individual', width: 50 }] },
      { row: 218, items: [{ col: 38, str: 'Base Currency', width: 60 }, { col: 110, str: 'EUR', width: 20 }] },

      // ---- Open Positions ----
      { row: 240, items: [{ col: 38, str: 'Open Positions', width: 80 }] },
      { row: 252, items: [{ col: 38, str: 'Stocks', width: 40 }] },
      { row: 264, items: [{ col: 38, str: 'EUR', width: 20 }] },
      // Column-header row (first item = "Symbol" → triggers column detection)
      {
        row: 276,
        items: [
          { col: 38,  str: 'Symbol',        width: 40 },
          { col: 220, str: 'Quantity',       width: 50 },
          { col: 280, str: 'Mult',           width: 30 },
          { col: 340, str: 'Cost Price',     width: 50 },
          { col: 430, str: 'Cost Basis',     width: 50 },
          { col: 500, str: 'Close Price',    width: 50 },
          { col: 570, str: 'Value',          width: 40 },
          { col: 650, str: 'Unrealized P/L', width: 60 },
          { col: 730, str: 'Code',           width: 30 },
        ],
      },
      {
        row: 288,
        items: [
          { col: 38,  str: 'VWCE',    width: 30 },
          { col: 220, str: '15',      width: 15 },
          { col: 280, str: '1',       width: 10 },
          { col: 340, str: '143.00',  width: 30 },
          { col: 430, str: '2145.00', width: 40 },
          { col: 500, str: '148.50',  width: 30 },
          { col: 570, str: '2227.50', width: 40 },
          { col: 650, str: '82.50',   width: 30 },
          { col: 730, str: '',        width: 5 },
        ],
      },

      // ---- Trades ----
      { row: 320, items: [{ col: 38, str: 'Trades', width: 40 }] },
      { row: 332, items: [{ col: 38, str: 'Stocks', width: 40 }] },
      { row: 344, items: [{ col: 38, str: 'EUR', width: 20 }] },
      // Column-header row for Trades
      {
        row: 356,
        items: [
          { col: 38,  str: 'Symbol',        width: 40 },
          { col: 146, str: 'Date/Time',     width: 50 },
          { col: 280, str: 'Quantity',      width: 40 },
          { col: 340, str: 'Price',         width: 30 },
          { col: 420, str: 'Proceeds',      width: 40 },
          { col: 490, str: 'Comm/Fee',      width: 40 },
          { col: 540, str: 'Basis',         width: 30 },
          { col: 600, str: 'Realized P/L',  width: 50 },
          { col: 740, str: 'Code',          width: 30 },
        ],
      },
      // Date row (appears above the symbol row)
      { row: 366, items: [{ col: 146, str: '2025-10-15,', width: 50 }] },
      // Trade data row (symbol row)
      {
        row: 374,
        items: [
          { col: 38,  str: 'VWCE',     width: 30 },
          { col: 146, str: '09:30:00', width: 40 },
          { col: 280, str: '12',       width: 15 },
          { col: 340, str: '142.50',   width: 30 },
          { col: 420, str: '-1710.00', width: 40 },
          { col: 490, str: '-1.50',    width: 25 },
          { col: 540, str: '1710.00',  width: 40 },
          { col: 600, str: '0.00',     width: 25 },
          { col: 740, str: 'O',        width: 10 },
        ],
      },

      // ---- Dividends (right column) ----
      { row: 240, items: [{ col: colMid + 10, str: 'Dividends', width: 50 }] },
      { row: 252, items: [{ col: colMid + 10, str: 'EUR', width: 20 }] },
      { row: 264, items: [{ col: colMid + 10, str: 'Date', width: 30 }, { col: colMid + 120, str: 'Description', width: 70 }, { col: colMid + 300, str: 'Amount', width: 40 }] },
      {
        row: 276,
        items: [
          { col: colMid + 10,  str: '2025-08-15',                                    width: 50 },
          { col: colMid + 120, str: 'VWCE(IE00BK5BQT80) Cash Dividend EUR 0.25',     width: 150 },
          { col: colMid + 300, str: '15.00',                                          width: 30 },
        ],
      },

      // ---- Withholding Tax (right column) ----
      { row: 300, items: [{ col: colMid + 10, str: 'Withholding Tax', width: 80 }] },
      { row: 312, items: [{ col: colMid + 10, str: 'USD', width: 20 }] },
      { row: 324, items: [{ col: colMid + 10, str: 'Date', width: 30 }, { col: colMid + 120, str: 'Description', width: 70 }, { col: colMid + 280, str: 'Amount', width: 40 }, { col: colMid + 330, str: 'Code', width: 20 }] },
      {
        row: 336,
        items: [
          { col: colMid + 10,  str: '2025-12-01',                                         width: 50 },
          { col: colMid + 120, str: 'AAPL(US0378331005) Cash Dividend USD 0.35 - US Tax', width: 150 },
          { col: colMid + 280, str: '-5.25',                                               width: 30 },
          { col: colMid + 330, str: '',                                                    width: 5 },
        ],
      },

      // ---- Financial Instrument Information ----
      { row: 420, items: [{ col: 38, str: 'Financial Instrument Information', width: 150 }] },
      { row: 432, items: [{ col: 38, str: 'Stocks', width: 40 }] },
      {
        row: 444,
        items: [
          { col: 38,  str: 'Symbol',       width: 40 },
          { col: 120, str: 'Description',  width: 80 },
          { col: 240, str: 'Conid',        width: 40 },
          { col: 300, str: 'Security ID',  width: 50 },
          { col: 370, str: 'Underlying',   width: 50 },
          { col: 450, str: 'Listing Exch', width: 50 },
          { col: 530, str: 'Multiplier',   width: 40 },
          { col: 580, str: 'Type',         width: 30 },
          { col: 630, str: 'Code',         width: 20 },
        ],
      },
      {
        row: 456,
        items: [
          { col: 38,  str: 'VWCE',            width: 30 },
          { col: 120, str: 'VANG FTSE AW',    width: 60 },
          { col: 240, str: '11111111',         width: 40 },
          { col: 300, str: 'IE00BK5BQT80',    width: 55 },
          { col: 370, str: 'VWCE',            width: 30 },
          { col: 450, str: 'IBIS2',           width: 30 },
          { col: 530, str: '1',               width: 10 },
          { col: 580, str: 'ETF',             width: 20 },
          { col: 630, str: '',                width: 5 },
        ],
      },
    ],
  }

  return [page1]
}

describe('PdfTableExtractor structural compatibility with domain parsers', () => {
  const extractor = new PdfTableExtractor()
  let rows

  it('adapt() returns rows that pass validatePdfContent', () => {
    rows = extractor.adapt(makeFullActivityPages())
    expect(() => validatePdfContent(rows)).not.toThrow()
  })

  it('produces Statement rows for parseStatementInfo', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const brokerRow = rows.find(r => r[0] === 'Statement' && r[2] === 'BrokerName')
    expect(brokerRow?.[3]).toMatch(/Interactive Brokers/)
    const periodRow = rows.find(r => r[0] === 'Statement' && r[2] === 'Period')
    expect(periodRow?.[3]).toMatch(/2025/)
  })

  it('produces Account Information rows for parseStatementInfo', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const accountRow = rows.find(r => r[0] === 'Account Information' && r[2] === 'Account')
    expect(accountRow?.[3]).toBeTruthy()
  })

  it('produces Open Positions rows compatible with parseOpenPositions', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const header = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
    expect(header?.[2]).toBe('DataDiscriminator')  // required by parseOpenPositions

    const dataRows = rows.filter(r => r[0] === 'Open Positions' && r[1] === 'Data')
    expect(dataRows.length).toBeGreaterThan(0)
    expect(dataRows[0][2]).toBe('Summary')

    // Verify column index alignment (same check parseOpenPositions does internally)
    const colIndex = {}
    for (let i = 2; i < header.length; i++) colIndex[header[i]] = i
    expect(dataRows[0][colIndex['Symbol']]).toBe('VWCE')
    expect(dataRows[0][colIndex['Quantity']]).toBe('15')
  })

  it('produces Trades rows compatible with parseCsvTrades', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const header = rows.find(r => r[0] === 'Trades' && r[1] === 'Header')
    expect(header?.[2]).toBe('DataDiscriminator')  // required by parseCsvTrades

    const dataRows = rows.filter(r => r[0] === 'Trades' && r[1] === 'Data')
    expect(dataRows.length).toBeGreaterThan(0)
    expect(dataRows[0][2]).toBe('Order')

    const colIndex = {}
    for (let i = 2; i < header.length; i++) colIndex[header[i]] = i
    expect(dataRows[0][colIndex['Symbol']]).toBe('VWCE')
    expect(dataRows[0][colIndex['Quantity']]).toBe('12')
    // Buy/Sell is derived and appended
    expect(header).toContain('Buy/Sell')
  })

  it('produces Dividends rows compatible with parseDividends', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const header = rows.find(r => r[0] === 'Dividends' && r[1] === 'Header')
    expect(header).toBeDefined()
    expect(header).toContain('Currency')
    expect(header).toContain('Date')
    expect(header).toContain('Amount')

    const dataRows = rows.filter(r => r[0] === 'Dividends' && r[1] === 'Data')
    expect(dataRows.length).toBeGreaterThan(0)
    expect(dataRows[0][2]).toMatch(/EUR|USD/)   // currency
    expect(dataRows[0][3]).toMatch(/^\d{4}-\d{2}-\d{2}$/)  // date
  })

  it('produces Withholding Tax rows compatible with parseWithholdingTax', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const header = rows.find(r => r[0] === 'Withholding Tax' && r[1] === 'Header')
    expect(header).toBeDefined()
    expect(header).toContain('Amount')

    const dataRows = rows.filter(r => r[0] === 'Withholding Tax' && r[1] === 'Data')
    expect(dataRows.length).toBeGreaterThan(0)
  })

  it('produces Financial Instrument Information rows compatible with parseInstruments', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const header = rows.find(r => r[0] === 'Financial Instrument Information' && r[1] === 'Header')
    expect(header?.[2]).toBe('Asset Category')

    const dataRows = rows.filter(r => r[0] === 'Financial Instrument Information' && r[1] === 'Data')
    expect(dataRows.length).toBeGreaterThan(0)

    const colIndex = {}
    for (let i = 2; i < header.length; i++) colIndex[header[i]] = i
    expect(dataRows[0][colIndex['Symbol']]).toBe('VWCE')
    expect(dataRows[0][colIndex['Conid']]).toBe('11111111')
  })

  it('buildInputData from PDF rows produces valid InputData', () => {
    rows = rows ?? extractor.adapt(makeFullActivityPages())
    const data = buildInputData(rows, [])
    expect(data.statement.brokerName).toMatch(/Interactive Brokers/)
    expect(typeof data.taxYear).toBe('number')
    expect(data.taxYear).toBe(2025)
    expect(data.instruments.length).toBeGreaterThan(0)
    expect(data.openPositions.length).toBeGreaterThan(0)
    expect(data.openPositions[0].symbol).toBe('VWCE')
    expect(data.csvTrades.length).toBeGreaterThan(0)
    expect(data.csvTrades[0].symbol).toBe('VWCE')
  })
})
