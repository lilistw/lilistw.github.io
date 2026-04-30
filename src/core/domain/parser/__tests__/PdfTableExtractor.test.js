import { describe, it, expect } from 'vitest'
import { PdfTableExtractor } from '../PdfTableExtractor.js'
import { validatePdfContent } from '../../../input/validateInput.js'

// ---------------------------------------------------------------------------
// Helpers — minimal synthetic PdfPage objects
// ---------------------------------------------------------------------------

/** Page that produces Statement,Data rows (title + period in top-right, broker centred). */
function makeStatementPage(period = 'January 1, 2025 - December 31, 2025') {
  return {
    colWidth: 792,
    rowHeight: 612,
    rows: [
      { row: 50,  items: [{ col: 450, row: 50,  str: 'Activity Statement', width: 100 }] },
      { row: 62,  items: [{ col: 410, row: 62,  str: period, width: 180 }] },
      { row: 120, items: [{ col: 250, row: 120, str: 'Interactive Brokers LLC, Greenwich', width: 200 }] },
    ],
  }
}

/** Page with an Open Positions section. */
function makeOpenPositionsPage() {
  return {
    colWidth: 792,
    rowHeight: 612,
    rows: [
      { row: 200, items: [{ col: 38, str: 'Open Positions', width: 80 }] },
      { row: 210, items: [{ col: 38, str: 'Stocks', width: 40 }] },
      { row: 220, items: [{ col: 38, str: 'EUR', width: 30 }] },
      // Column-header row (detected by first item = "Symbol")
      {
        row: 235,
        items: [
          { col: 38,  str: 'Symbol',       width: 40 },
          { col: 220, str: 'Quantity',      width: 50 },
          { col: 280, str: 'Mult',          width: 30 },
          { col: 340, str: 'Cost Price',    width: 50 },
          { col: 430, str: 'Cost Basis',    width: 50 },
          { col: 500, str: 'Close Price',   width: 50 },
          { col: 570, str: 'Value',         width: 40 },
          { col: 650, str: 'Unrealized P/L',width: 60 },
          { col: 730, str: 'Code',          width: 30 },
        ],
      },
      // Data row
      {
        row: 250,
        items: [
          { col: 38,  str: 'AAPL',    width: 30 },
          { col: 220, str: '10',      width: 15 },
          { col: 280, str: '1',       width: 10 },
          { col: 340, str: '150.00',  width: 30 },
          { col: 430, str: '1500.00', width: 40 },
          { col: 500, str: '155.00',  width: 30 },
          { col: 570, str: '1550.00', width: 40 },
          { col: 650, str: '50.00',   width: 30 },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// PdfTableExtractor.adapt()
// ---------------------------------------------------------------------------

describe('PdfTableExtractor', () => {
  const extractor = new PdfTableExtractor()

  it('throws for empty pages array', () => {
    expect(() => extractor.adapt([])).toThrow('INVALID_PDF_FORMAT')
  })

  it('throws for null pages', () => {
    expect(() => extractor.adapt(null)).toThrow('INVALID_PDF_FORMAT')
  })

  it('produces Statement Data rows with title', () => {
    const rows = extractor.adapt([makeStatementPage()])
    const titleRow = rows.find(r => r[0] === 'Statement' && r[2] === 'Title')
    expect(titleRow).toBeDefined()
    expect(titleRow[3]).toBe('Activity Statement')
  })

  it('produces Statement Data rows with period', () => {
    const rows = extractor.adapt([makeStatementPage()])
    const periodRow = rows.find(r => r[0] === 'Statement' && r[2] === 'Period')
    expect(periodRow).toBeDefined()
    expect(periodRow[3]).toBe('January 1, 2025 - December 31, 2025')
  })

  it('produces Statement Data rows with broker name', () => {
    const rows = extractor.adapt([makeStatementPage()])
    const nameRow = rows.find(r => r[0] === 'Statement' && r[2] === 'BrokerName')
    expect(nameRow).toBeDefined()
    expect(nameRow[3]).toContain('Interactive Brokers')
  })

  it('adapted output passes validatePdfContent', () => {
    const rows = extractor.adapt([makeStatementPage()])
    expect(() => validatePdfContent(rows)).not.toThrow()
  })

  it('produces Open Positions Header with DataDiscriminator', () => {
    const rows = extractor.adapt([makeStatementPage(), makeOpenPositionsPage()])
    const header = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
    expect(header).toBeDefined()
    // DataDiscriminator must be at r[2] so column indices align with data rows
    expect(header[2]).toBe('DataDiscriminator')
    expect(header).toContain('Symbol')
    expect(header).toContain('Quantity')
  })

  it('produces Open Positions Data rows with correct structure', () => {
    const rows = extractor.adapt([makeStatementPage(), makeOpenPositionsPage()])
    const dataRow = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Data')
    expect(dataRow).toBeDefined()
    // parseOpenPositions requires r[2] === 'Summary'
    expect(dataRow[2]).toBe('Summary')
    // Asset category and currency come from sub-headers
    expect(dataRow[3]).toBe('Stocks')
    expect(dataRow[4]).toBe('EUR')
    expect(dataRow).toContain('AAPL')
  })

  it('column indices are consistent between header and data (parseOpenPositions compatibility)', () => {
    const rows = extractor.adapt([makeStatementPage(), makeOpenPositionsPage()])
    const header = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
    const data = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Data')
    expect(header).toBeDefined()
    expect(data).toBeDefined()

    // Build colIndex the same way parseOpenPositions does
    const colIndex = {}
    for (let i = 2; i < header.length; i++) colIndex[header[i]] = i

    expect(data[colIndex['Symbol']]).toBe('AAPL')
    expect(data[colIndex['Quantity']]).toBe('10')
    expect(data[colIndex['Cost Price']]).toBe('150.00')
    expect(data[colIndex['Value']]).toBe('1550.00')
  })
})

// ---------------------------------------------------------------------------
// validatePdfContent
// ---------------------------------------------------------------------------

describe('validatePdfContent', () => {
  it('throws when Statement Data marker is absent', () => {
    expect(() => validatePdfContent([['Trades', 'Data', 'x']])).toThrow()
  })

  it('passes when Statement Data marker is present', () => {
    const rows = [['Statement', 'Data', 'Period', '2025']]
    expect(() => validatePdfContent(rows)).not.toThrow()
  })
})
