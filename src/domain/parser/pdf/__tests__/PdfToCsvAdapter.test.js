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
    // row layout: [section, "Data", discriminator, assetCat, currency, symbol]
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
// PdfToCsvAdapter.adapt()
// ---------------------------------------------------------------------------

describe('PdfToCsvAdapter', () => {
  const adapter = new PdfToCsvAdapter()

  const SAMPLE_PDF_TEXT = [
    'Statement',
    'BrokerName   Interactive Brokers LLC',
    'Period       January 1, 2025 - December 31, 2025',
    '',
    'Trades',
    'DataDiscriminator  Asset Category  Currency  Symbol  Date/Time  Buy/Sell  Quantity  Price',
    'Order              Stocks          USD       AAPL    2025-03-01  BUY       10        150.00',
    '',
    'Dividends',
    'Currency  Date        Description  Amount',
    'USD       2025-06-15  AAPL(...)    25.00',
  ].join('\n')

  it('returns rows for all recognised sections', () => {
    const rows = adapter.adapt(SAMPLE_PDF_TEXT)
    const sections = new Set(rows.map(r => r[0]))
    expect(sections).toContain('Statement')
    expect(sections).toContain('Trades')
    expect(sections).toContain('Dividends')
  })

  it('produces a Statement Data row with the period', () => {
    const rows = adapter.adapt(SAMPLE_PDF_TEXT)
    const periodRow = rows.find(r => r[0] === 'Statement' && r[2] === 'Period')
    expect(periodRow).toBeDefined()
    expect(periodRow[3]).toBe('January 1, 2025 - December 31, 2025')
  })

  it('produces a Trades Header row with column names', () => {
    const rows = adapter.adapt(SAMPLE_PDF_TEXT)
    const header = rows.find(r => r[0] === 'Trades' && r[1] === 'Header')
    expect(header).toBeDefined()
    expect(header).toContain('Symbol')
  })

  it('produces a Trades Data row for the trade', () => {
    const rows = adapter.adapt(SAMPLE_PDF_TEXT)
    const dataRow = rows.find(r => r[0] === 'Trades' && r[1] === 'Data')
    expect(dataRow).toBeDefined()
    expect(dataRow).toContain('AAPL')
  })

  it('throws a Bulgarian error when no IBKR sections are found', () => {
    expect(() => adapter.adapt('Random text\nwith no sections')).toThrow(
      'Невалиден PDF файл'
    )
  })

  it('adapted output passes validatePdfContent', () => {
    const rows = adapter.adapt(SAMPLE_PDF_TEXT)
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
