import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { parseDividends, parseWithholdingTax } from '../parseDividends.js'

// Helper: build rows with a Dividends header + optional data rows
function makeRows(dataRows = []) {
  const header = ['Dividends', 'Header', 'Currency', 'Date', 'Description', 'Amount']
  return [header, ...dataRows]
}

function makeWtRows(dataRows = []) {
  const header = ['Withholding Tax', 'Header', 'Currency', 'Date', 'Description', 'Amount', 'Code']
  return [header, ...dataRows]
}

describe('parseDividends', () => {
  it('returns empty array when no Dividends header exists', () => {
    expect(parseDividends([])).toEqual([])
    expect(parseDividends([['Other', 'Header', 'Currency', 'Date', 'Description', 'Amount']])).toEqual([])
  })

  it('parses a single dividend row correctly', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL(US0378331005) Cash Dividend', '10.00'],
    ])
    const result = parseDividends(rows)
    expect(result).toHaveLength(1)
    expect(result[0].currency).toBe('USD')
    expect(result[0].date).toBe('2025-03-15')
    expect(result[0].description).toBe('AAPL(US0378331005) Cash Dividend')
    expect(result[0].amount).toEqual(new Decimal('10.00'))
  })

  it('parses multiple dividend rows', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '10.00'],
      ['Dividends', 'Data', 'EUR', '2025-04-01', 'EXS1 Dividend', '5.50'],
    ])
    const result = parseDividends(rows)
    expect(result).toHaveLength(2)
  })

  it('skips rows where Currency is "Total"', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '10.00'],
      ['Dividends', 'Data', 'Total', '', '', '10.00'],
    ])
    expect(parseDividends(rows)).toHaveLength(1)
  })

  it('skips rows where Currency is "Total in EUR"', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '10.00'],
      ['Dividends', 'Data', 'Total in EUR', '', '', '10.00'],
    ])
    expect(parseDividends(rows)).toHaveLength(1)
  })

  it('skips rows where Currency is "Total Dividends in EUR"', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '10.00'],
      ['Dividends', 'Data', 'Total Dividends in EUR', '', '', '10.00'],
    ])
    expect(parseDividends(rows)).toHaveLength(1)
  })

  it('skips rows with zero amount', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '0'],
    ])
    expect(parseDividends(rows)).toHaveLength(0)
  })

  it('skips rows with negative amount', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '-5.00'],
    ])
    expect(parseDividends(rows)).toHaveLength(0)
  })

  it('handles whitespace in column names and values', () => {
    const header = ['Dividends', 'Header', ' Currency ', ' Date ', ' Description ', ' Amount ']
    const rows = [
      header,
      ['Dividends', 'Data', ' USD ', '2025-03-15', 'AAPL Dividend', '10.00'],
    ]
    const result = parseDividends(rows)
    expect(result).toHaveLength(1)
    expect(result[0].currency).toBe('USD')
  })

  it('ignores non-Dividends rows mixed in', () => {
    const rows = makeRows([
      ['Dividends', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '10.00'],
      ['Trades', 'Data', 'USD', '2025-03-15', 'AAPL', '100'],
    ])
    expect(parseDividends(rows)).toHaveLength(1)
  })
})

describe('parseWithholdingTax', () => {
  it('returns empty array when no Withholding Tax header exists', () => {
    expect(parseWithholdingTax([])).toEqual([])
  })

  it('parses a withholding tax row correctly', () => {
    const rows = makeWtRows([
      ['Withholding Tax', 'Data', 'USD', '2025-03-15', 'AAPL(US0378331005) Cash Dividend', '-1.50', 'Po'],
    ])
    const result = parseWithholdingTax(rows)
    expect(result).toHaveLength(1)
    expect(result[0].currency).toBe('USD')
    expect(result[0].date).toBe('2025-03-15')
    expect(result[0].description).toBe('AAPL(US0378331005) Cash Dividend')
    expect(result[0].amount).toEqual(new Decimal('-1.50'))
    expect(result[0].code).toBe('Po')
  })

  it('skips rows where Currency starts with "Total"', () => {
    const rows = makeWtRows([
      ['Withholding Tax', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '-1.50', 'Po'],
      ['Withholding Tax', 'Data', 'Total in EUR', '', '', '-1.50', ''],
    ])
    expect(parseWithholdingTax(rows)).toHaveLength(1)
  })

  it('includes negative amounts (unlike parseDividends)', () => {
    const rows = makeWtRows([
      ['Withholding Tax', 'Data', 'USD', '2025-03-15', 'AAPL Dividend', '-1.50', 'Po'],
    ])
    const result = parseWithholdingTax(rows)
    expect(result).toHaveLength(1)
    expect(result[0].amount).toEqual(new Decimal('-1.50'))
  })

  it('handles empty input gracefully', () => {
    expect(parseWithholdingTax([])).toEqual([])
  })
})
