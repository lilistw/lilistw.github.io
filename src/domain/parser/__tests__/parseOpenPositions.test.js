import { describe, it, expect } from 'vitest'
import { parseOpenPositions, buildOpenPositions } from '../parseOpenPositions.js'

// Real IBKR CSV: index 2 of the header row is 'DataDiscriminator';
// data rows have 'Summary' at index 2 as the discriminator value.
function makeHeader() {
  return [
    'Open Positions', 'Header',
    'DataDiscriminator',
    'Asset Category', 'Currency', 'Symbol', 'Quantity', 'Mult',
    'Cost Price', 'Cost Basis', 'Close Price', 'Value', 'Unrealized P/L', 'Code',
  ]
}

function makePositionRow(fields = {}) {
  return [
    'Open Positions', 'Data', 'Summary',
    fields.assetCategory ?? 'Stocks',
    fields.currency      ?? 'USD',
    fields.symbol        ?? 'AAPL',
    fields.quantity      ?? '100',
    fields.multiplier    ?? '1',
    fields.costPrice     ?? '150.00',
    fields.costBasis     ?? '15000.00',
    fields.closePrice    ?? '180.00',
    fields.value         ?? '18000.00',
    fields.unrealizedPL  ?? '3000.00',
    fields.code          ?? '',
  ]
}

describe('parseOpenPositions', () => {
  it('returns empty array when no Open Positions header exists', () => {
    expect(parseOpenPositions([])).toEqual([])
    expect(parseOpenPositions([['Trades', 'Header']])).toEqual([])
  })

  it('parses a single position correctly', () => {
    const rows = [makeHeader(), makePositionRow()]
    const result = parseOpenPositions(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      assetCategory: 'Stocks',
      currency:      'USD',
      symbol:        'AAPL',
      quantity:      '100',
      costPrice:     '150.00',
      costBasis:     '15000.00',
      closePrice:    '180.00',
      value:         '18000.00',
      unrealizedPL:  '3000.00',
    })
  })

  it('only includes Summary rows, not Total rows', () => {
    const rows = [
      makeHeader(),
      makePositionRow(),
      ['Open Positions', 'Data', 'Total', 'Stocks', 'USD', '', '100', '1', '', '15000.00', '', '18000.00', '3000.00', ''],
    ]
    expect(parseOpenPositions(rows)).toHaveLength(1)
  })

  it('parses multiple positions', () => {
    const rows = [
      makeHeader(),
      makePositionRow({ symbol: 'AAPL' }),
      makePositionRow({ symbol: 'MSFT', costBasis: '5000.00' }),
    ]
    expect(parseOpenPositions(rows)).toHaveLength(2)
  })
})

describe('buildOpenPositions', () => {
  it('returns columns and rows', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow()])
    const result = buildOpenPositions(rawPositions)
    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('rows')
    expect(Array.isArray(result.columns)).toBe(true)
    expect(Array.isArray(result.rows)).toBe(true)
  })

  it('converts quantity and costBasis to numbers', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow()])
    const { rows } = buildOpenPositions(rawPositions)
    expect(typeof rows[0].quantity).toBe('number')
    expect(typeof rows[0].costBasis).toBe('number')
  })

  it('uses calculated costBasis from positionsCostBasis when available', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'AAPL', costBasis: '15000.00' })])
    const positionsCostBasis = { AAPL: { cost: 12000, qty: 100 } }
    const { rows } = buildOpenPositions(rawPositions, {}, positionsCostBasis)
    expect(rows[0].costBasis).toBe(12000)
  })

  it('falls back to raw costBasis when positionsCostBasis has no entry', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ costBasis: '15000.00' })])
    const { rows } = buildOpenPositions(rawPositions, {}, {})
    expect(rows[0].costBasis).toBeCloseTo(15000)
  })

  it('enriches rows with country from instrumentInfo', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'AAPL' })])
    const instrumentInfo = { AAPL: { countryName: 'САЩ', country: 'US' } }
    const { rows } = buildOpenPositions(rawPositions, instrumentInfo, {})
    expect(rows[0].country).toBe('САЩ')
  })

  it('handles empty positions array', () => {
    const { rows, columns } = buildOpenPositions([])
    expect(rows).toHaveLength(0)
    expect(columns.length).toBeGreaterThan(0)
  })

  it('handles comma-formatted numbers', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ costBasis: '1,500,000.00', quantity: '1,000' })])
    const { rows } = buildOpenPositions(rawPositions)
    expect(rows[0].costBasis).toBeCloseTo(1500000)
    expect(rows[0].quantity).toBeCloseTo(1000)
  })
})

describe('buildOpenPositions — instrType column', () => {
  it('rows have instrType="ETF" for ETF instrument', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'EXS1' })])
    const instrumentInfo = { EXS1: { description: 'iShares Core MSCI World ETF', type: 'ETF' } }
    const { rows } = buildOpenPositions(rawPositions, instrumentInfo, {})
    expect(rows[0].instrType).toBe('ETF')
  })

  it('rows have instrType="ETF" for IWDA (type field, no "ETF" in description)', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'IWDA' })])
    const instrumentInfo = { IWDA: { description: 'ISHARES CORE MSCI WORLD', type: 'ETF' } }
    const { rows } = buildOpenPositions(rawPositions, instrumentInfo, {})
    expect(rows[0].instrType).toBe('ETF')
  })

  it('rows have instrType="Stock" for common stock', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'AAPL' })])
    const instrumentInfo = { AAPL: { description: 'Apple Inc', type: 'COMMON' } }
    const { rows } = buildOpenPositions(rawPositions, instrumentInfo, {})
    expect(rows[0].instrType).toBe('Stock')
  })

  it('rows have instrType="Stock" when instrument not in instrumentInfo', () => {
    const rawPositions = parseOpenPositions([makeHeader(), makePositionRow({ symbol: 'UNKNOWN' })])
    const { rows } = buildOpenPositions(rawPositions, {}, {})
    expect(rows[0].instrType).toBe('Stock')
  })

  it('instrType column exists in columns', () => {
    const { columns } = buildOpenPositions([])
    expect(columns.some(c => c.key === 'instrType')).toBe(true)
  })
})
