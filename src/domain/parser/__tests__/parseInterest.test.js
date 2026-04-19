import { describe, it, expect } from 'vitest'
import { parseInterest } from '../parseInterest.js'

function makeRows(dataRows = []) {
  const header = ['Interest', 'Header', 'Currency', 'Date', 'Description', 'Amount']
  return [header, ...dataRows]
}

describe('parseInterest', () => {
  it('returns empty array when no Interest header exists', () => {
    expect(parseInterest([])).toEqual([])
    expect(parseInterest([['Dividends', 'Header', 'Currency', 'Date', 'Description', 'Amount']])).toEqual([])
  })

  it('parses a single interest row correctly', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-02-28', 'USD Credit Interest for Feb-2025', '12.34'],
    ])
    const result = parseInterest(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      currency: 'USD',
      date: '2025-02-28',
      description: 'USD Credit Interest for Feb-2025',
      amount: '12.34',
    })
  })

  it('parses multiple interest rows', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Credit Interest', '5.00'],
      ['Interest', 'Data', 'EUR', '2025-02-28', 'EUR Credit Interest', '3.20'],
    ])
    expect(parseInterest(rows)).toHaveLength(2)
  })

  it('skips rows where Currency is "Total"', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Interest', '5.00'],
      ['Interest', 'Data', 'Total', '', 'Total', '5.00'],
    ])
    expect(parseInterest(rows)).toHaveLength(1)
  })

  it('skips rows where Currency is "Total in EUR"', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Interest', '5.00'],
      ['Interest', 'Data', 'Total in EUR', '', '', '5.00'],
    ])
    expect(parseInterest(rows)).toHaveLength(1)
  })

  it('skips rows where Currency is "Total Interest in EUR"', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Interest', '5.00'],
      ['Interest', 'Data', 'Total Interest in EUR', '', '', '5.00'],
    ])
    expect(parseInterest(rows)).toHaveLength(1)
  })

  it('skips rows with zero amount', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Interest', '0'],
    ])
    expect(parseInterest(rows)).toHaveLength(0)
  })

  it('skips rows with negative amount', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Debit Interest', '-2.50'],
    ])
    expect(parseInterest(rows)).toHaveLength(0)
  })

  it('ignores rows from other sections', () => {
    const rows = makeRows([
      ['Interest', 'Data', 'USD', '2025-01-31', 'USD Interest', '5.00'],
      ['Dividends', 'Data', 'USD', '2025-01-31', 'AAPL Dividend', '10.00'],
    ])
    expect(parseInterest(rows)).toHaveLength(1)
  })
})
