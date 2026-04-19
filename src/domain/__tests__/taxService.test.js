import { describe, it, expect } from 'vitest'
import { calculateTax } from '../tax/taxService.js'

const emptyInput = (taxYear) => ({
  taxYear,
  trades: [],
  instruments: [],
  csvTrades: [],
  openPositions: [],
  dividends: [],
  withholdingTax: [],
  interest: [],
})

const buyTrade = (overrides = {}) => ({
  symbol: 'AAPL',
  datetime: '2025-03-10, 10:00:00',
  settleDate: '2025-03-12',
  exchange: 'NASDAQ',
  currency: 'USD',
  side: 'BUY',
  price: '150',
  quantity: '10',
  proceeds: '-1500',
  commission: '-1',
  fee: '0',
  orderType: '',
  code: '',
  ...overrides,
})

const sellTrade = (overrides = {}) => ({
  symbol: 'AAPL',
  datetime: '2025-06-10, 10:00:00',
  settleDate: '2025-06-12',
  exchange: 'NASDAQ',
  currency: 'USD',
  side: 'SELL',
  price: '200',
  quantity: '-10',
  proceeds: '2000',
  commission: '-1',
  fee: '0',
  orderType: '',
  code: '',
  ...overrides,
})

describe('calculateTax — taxSummary profit/loss', () => {
  it('2025: profitable sell appears in app5.profits', () => {
    const input = { ...emptyInput(2025), trades: [buyTrade(), sellTrade()] }
    const { taxSummary } = calculateTax(input)
    expect(taxSummary.app5.profits).toBeGreaterThan(0)
    expect(taxSummary.app5.losses).toBe(0)
  })

  it('2025: loss sell appears in app5.losses', () => {
    const input = {
      ...emptyInput(2025),
      trades: [
        buyTrade({ proceeds: '-2000', price: '200' }),
        sellTrade({ proceeds: '1500', price: '150' }),
      ],
    }
    const { taxSummary } = calculateTax(input)
    expect(taxSummary.app5.losses).toBeGreaterThan(0)
    expect(taxSummary.app5.profits).toBe(0)
  })

  it('2026: profitable sell appears in app5.profits', () => {
    const input = {
      ...emptyInput(2026),
      trades: [
        buyTrade({ datetime: '2026-03-10, 10:00:00', settleDate: '2026-03-12' }),
        sellTrade({ datetime: '2026-06-10, 10:00:00', settleDate: '2026-06-12' }),
      ],
    }
    const { taxSummary } = calculateTax(input)
    expect(taxSummary.app5.profits).toBeGreaterThan(0)
  })
})

describe('calculateTax — output structure', () => {
  it('returns expected top-level keys for 2025', () => {
    const result = calculateTax(emptyInput(2025))
    expect(result).toHaveProperty('trades')
    expect(result).toHaveProperty('holdings')
    expect(result).toHaveProperty('dividends')
    expect(result).toHaveProperty('interest')
    expect(result).toHaveProperty('taxSummary')
    expect(result).toHaveProperty('taxYear', 2025)
  })

  it('taxSummary has app5, app13, app8Holdings, app8Dividends', () => {
    const result = calculateTax(emptyInput(2025))
    expect(result.taxSummary).toHaveProperty('app5')
    expect(result.taxSummary).toHaveProperty('app13')
    expect(result.taxSummary).toHaveProperty('app8Holdings')
    expect(result.taxSummary).toHaveProperty('app8Dividends')
  })
})
