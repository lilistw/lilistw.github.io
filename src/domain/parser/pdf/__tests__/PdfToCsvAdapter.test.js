import { describe, it, expect } from 'vitest'
import { PdfToCsvAdapter } from '../PdfToCsvAdapter.js'
import { TableSectionExtractor, KeyValueSectionExtractor } from '../SectionExtractorStrategy.js'
import { validatePdfContent } from '../../../../application/validateInput.js'

// ---------------------------------------------------------------------------
// TableSectionExtractor
// ---------------------------------------------------------------------------

describe('TableSectionExtractor', () => {
  const extractor = new TableSectionExtractor()

  it('emits a Header row from the first line', () => {
    const lines = [
      'DataDiscriminator  Asset Category  Currency  Symbol',
      'Order              Stocks          USD       AAPL',
    ]
    const rows = extractor.extract('Trades', lines)
    expect(rows[0]).toEqual(['Trades', 'Header', 'DataDiscriminator', 'Asset Category', 'Currency', 'Symbol'])
  })

  it('emits Data rows for subsequent lines', () => {
    const lines = [
      'DataDiscriminator  Asset Category  Currency  Symbol',
      'Order              Stocks          USD       AAPL',
      'Order              Stocks          USD       MSFT',
    ]
    const rows = extractor.extract('Trades', lines)
    expect(rows).toHaveLength(3)
    expect(rows[1][1]).toBe('Data')
    expect(rows[1][5]).toBe('AAPL')
    expect(rows[2][5]).toBe('MSFT')
  })

  it('skips blank lines in data', () => {
    const lines = [
      'Col1  Col2',
      '',
      'A     B',
    ]
    const rows = extractor.extract('Dividends', lines)
    expect(rows).toHaveLength(2) // header + one data row
  })

  it('returns empty array for empty lines', () => {
    expect(extractor.extract('Interest', [])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// KeyValueSectionExtractor
// ---------------------------------------------------------------------------

describe('KeyValueSectionExtractor', () => {
  const extractor = new KeyValueSectionExtractor()

  it('splits lines with 2+ spaces into key-value Data rows', () => {
    const lines = [
      'BrokerName   Interactive Brokers',
      'Period       January 1, 2025 - December 31, 2025',
    ]
    const rows = extractor.extract('Statement', lines)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(['Statement', 'Data', 'BrokerName', 'Interactive Brokers'])
    expect(rows[1]).toEqual(['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'])
  })

  it('skips lines with blank keys', () => {
    const lines = ['   ', 'Name   IBKR']
    const rows = extractor.extract('Statement', lines)
    expect(rows).toHaveLength(1)
    expect(rows[0][2]).toBe('Name')
  })
})

// ---------------------------------------------------------------------------
// PdfToCsvAdapter helpers
// ---------------------------------------------------------------------------

/** Minimal page that produces Statement,Data rows */
function makeStatementPage(period = 'January 1, 2025 - December 31, 2025') {
  return {
    colWidth: 792,
    rowHeight: 612,
    rows: [
      // Top-right area (row<100, col>396): title + period
      { row: 50, items: [{ col: 450, row: 50, str: 'Activity Statement', width: 100 }] },
      { row: 62, items: [{ col: 410, row: 62, str: period, width: 180 }] },
      // Broker name area (row 100–160)
      { row: 120, items: [{ col: 250, row: 120, str: 'Interactive Brokers LLC, Greenwich', width: 200 }] },
    ],
  }
}

/** Page with an Open Positions section */
function makeOpenPositionsPage() {
  return {
    colWidth: 792,
    rowHeight: 612,
    rows: [
      { row: 200, items: [{ col: 38, row: 200, str: 'Open Positions', width: 80 }] },
      { row: 220, items: [{ col: 38, row: 220, str: 'Stocks', width: 40 }] },
      { row: 240, items: [{ col: 38, row: 240, str: 'USD', width: 30 }] },
      {
        row: 260,
        items: [
          { col: 38,  row: 260, str: 'AAPL',    width: 30 },
          { col: 251, row: 260, str: '10',       width: 15 },
          { col: 303, row: 260, str: '1',        width: 10 },
          { col: 362, row: 260, str: '150.00',   width: 30 },
          { col: 438, row: 260, str: '1500.00',  width: 40 },
          { col: 514, row: 260, str: '155.00',   width: 30 },
          { col: 602, row: 260, str: '1550.00',  width: 40 },
          { col: 694, row: 260, str: '50.00',    width: 30 },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// PdfToCsvAdapter.adapt()
// ---------------------------------------------------------------------------

describe('PdfToCsvAdapter', () => {
  const adapter = new PdfToCsvAdapter()

  it('throws for empty pages array', () => {
    expect(() => adapter.adapt([])).toThrow('Невалиден PDF файл')
  })

  it('throws for null pages', () => {
    expect(() => adapter.adapt(null)).toThrow('Невалиден PDF файл')
  })

  it('produces Statement Data rows with period', () => {
    const rows = adapter.adapt([makeStatementPage()])
    const periodRow = rows.find(r => r[0] === 'Statement' && r[2] === 'Period')
    expect(periodRow).toBeDefined()
    expect(periodRow[3]).toBe('January 1, 2025 - December 31, 2025')
  })

  it('produces Statement Data rows with broker name', () => {
    const rows = adapter.adapt([makeStatementPage()])
    const nameRow = rows.find(r => r[0] === 'Statement' && r[2] === 'BrokerName')
    expect(nameRow).toBeDefined()
    expect(nameRow[3]).toContain('Interactive Brokers')
  })

  it('produces Open Positions Header + Data rows', () => {
    const rows = adapter.adapt([makeStatementPage(), makeOpenPositionsPage()])
    const header = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Header')
    expect(header).toBeDefined()
    const dataRow = rows.find(r => r[0] === 'Open Positions' && r[1] === 'Data')
    expect(dataRow).toBeDefined()
    // parseOpenPositions requires r[2] === 'Summary'
    expect(dataRow[2]).toBe('Summary')
    expect(dataRow).toContain('AAPL')
  })

  it('adapted output passes validatePdfContent', () => {
    const rows = adapter.adapt([makeStatementPage()])
    expect(() => validatePdfContent(rows)).not.toThrow()
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
