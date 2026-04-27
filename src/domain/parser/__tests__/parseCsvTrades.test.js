import { describe, it, expect } from 'vitest'
import { parseCsvTrades, buildCsvTradeBasis } from '../parseCsvTrades.js'
import Decimal from 'decimal.js'

function makeHeader() {
  return [
    'Trades', 'Header', 'DataDiscriminator',
    'Asset Category', 'Currency', 'Symbol', 'Date/Time', 'Settle Date/Time',
    'Exchange', 'Buy/Sell', 'Quantity', 'Price', 'Proceeds', 'Comm/Fee', 'Basis',
    'Realized P/L', 'Code',
  ]
}

function makeTrade(fields = {}) {
  return [
    'Trades', 'Data', 'Order',
    fields.assetCategory ?? 'Stocks',
    fields.currency      ?? 'USD',
    fields.symbol        ?? 'AAPL',
    fields.datetime      ?? '"2025-03-15, 10:30:00"',
    fields.settleDate    ?? '2025-03-17',
    fields.exchange      ?? 'NASDAQ',
    fields.side          ?? 'BUY',
    fields.quantity      ?? '10',
    fields.price         ?? '150.00',
    fields.proceeds      ?? '-1500.00',
    fields.commission    ?? '-5.00',
    fields.basis         ?? '-1505.00',
    fields.realizedPL    ?? '0',
    fields.code          ?? 'O',
  ]
}

describe('parseCsvTrades', () => {
  it('returns empty array when no Trades header exists', () => {
    expect(parseCsvTrades([])).toEqual([])
    expect(parseCsvTrades([['Dividends', 'Header', 'DataDiscriminator']])).toEqual([])
  })

  it('parses a single BUY trade correctly', () => {
    const rows = [makeHeader(), makeTrade()]
    const result = parseCsvTrades(rows)
    expect(result).toHaveLength(1)
    expect(result[0].assetCategory).toBe('Stocks')
    expect(result[0].currency).toBe('USD')
    expect(result[0].symbol).toBe('AAPL')
    expect(result[0].exchange).toBe('NASDAQ')
    expect(result[0].side).toBe('BUY')
    expect(result[0].quantity).toEqual(new Decimal('10'))
    expect(result[0].price).toEqual(new Decimal('150.00'))
    expect(result[0].proceeds).toEqual(new Decimal('-1500.00'))
    expect(result[0].commission).toEqual(new Decimal('-5.00'))
    expect(result[0].basis).toEqual(new Decimal('-1505.00'))
    expect(result[0].code).toBe('O')
  })

  it('strips quotes from datetime field', () => {
    const rows = [makeHeader(), makeTrade({ datetime: '"2025-03-15, 10:30:00"' })]
    const result = parseCsvTrades(rows)
    expect(result[0].datetime).toBe('2025-03-15, 10:30:00')
  })

  it('parses multiple trades', () => {
    const rows = [
      makeHeader(),
      makeTrade({ symbol: 'AAPL', side: 'BUY' }),
      makeTrade({ symbol: 'MSFT', side: 'SELL', quantity: '-5' }),
    ]
    expect(parseCsvTrades(rows)).toHaveLength(2)
  })

  it('only parses rows where DataDiscriminator is "Order"', () => {
    const rows = [
      makeHeader(),
      makeTrade(),
      ['Trades', 'Data', 'SubTotal', 'Stocks', 'USD', '', '', '', '', '', '', '', '-1500', '-5', '', '', ''],
    ]
    expect(parseCsvTrades(rows)).toHaveLength(1)
  })

  it('parses a SELL trade correctly', () => {
    const rows = [
      makeHeader(),
      makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800.00', basis: '-1505.00', realizedPL: '295.00' }),
    ]
    const result = parseCsvTrades(rows)
    expect(result[0].side).toBe('SELL')
    expect(result[0].quantity).toEqual(new Decimal('-10'))
    expect(result[0].proceeds).toEqual(new Decimal('1800.00'))
  })
})

describe('buildCsvTradeBasis', () => {
  it('returns an empty Map for empty input', () => {
    const map = buildCsvTradeBasis([])
    expect(map.size).toBe(0)
  })

  it('ignores BUY trades (non-negative quantity)', () => {
    const trades = parseCsvTrades([
      makeHeader(),
      makeTrade({ side: 'BUY', quantity: '10', proceeds: '-1500.00', basis: '-1505.00' }),
    ])
    expect(buildCsvTradeBasis(trades).size).toBe(0)
  })

  it('builds a key from SELL trade: SYMBOL|DATE|QTY', () => {
    const trades = parseCsvTrades([
      makeHeader(),
      makeTrade({
        side:     'SELL',
        quantity: '-10',
        datetime: '"2025-06-15, 09:30:00"',
        symbol:   'AAPL',
        basis:    '-1505.00',
      }),
    ])
    const map = buildCsvTradeBasis(trades)
    expect(map.has('AAPL|2025-06-15|10')).toBe(true)
  })

  it('stores basis as positive Decimal for SELL trades', () => {
    const trades = parseCsvTrades([
      makeHeader(),
      makeTrade({
        side:     'SELL',
        quantity: '-10',
        datetime: '"2025-06-15, 09:30:00"',
        symbol:   'AAPL',
        basis:    '-1505.00',
      }),
    ])
    const map = buildCsvTradeBasis(trades)
    const basis = map.get('AAPL|2025-06-15|10')
    expect(basis).toBeInstanceOf(Decimal)
    expect(basis.toNumber()).toBeCloseTo(1505)
  })

  it('handles multiple SELL trades for different symbols', () => {
    const trades = parseCsvTrades([
      makeHeader(),
      makeTrade({ symbol: 'AAPL', side: 'SELL', quantity: '-5', datetime: '"2025-06-15, 09:30:00"', basis: '-750.00' }),
      makeTrade({ symbol: 'MSFT', side: 'SELL', quantity: '-3', datetime: '"2025-07-01, 10:00:00"', basis: '-450.00' }),
    ])
    const map = buildCsvTradeBasis(trades)
    expect(map.size).toBe(2)
    expect(map.has('AAPL|2025-06-15|5')).toBe(true)
    expect(map.has('MSFT|2025-07-01|3')).toBe(true)
  })
})
