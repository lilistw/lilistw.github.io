import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { calculateTax } from '../calculateTax.js'

import input from './fixtures/demoInput.json'
import expected from './fixtures/demoOutput.json'

describe('calculateTax', () => {
  it('should calculate full tax result correctly (integration)', () => {
    const result = calculateTax(input)

    // --- BASIC STRUCTURE ---
    expect(result).toBeDefined()
    expect(result.taxYear).toBe(2025)
    expect(result.localCurrencyCode).toBe('BGN')
    expect(result.localCurrencyLabel).toBe('лв')

    // --- TRADES ---
    expect(result.trades.length).toBeGreaterThan(0)

    const sellTrade = result.trades.find(t => t.symbol === 'AMZN')
    expect(sellTrade).toBeDefined()
    expect(Number(sellTrade.realizedPLLcl)).toBeCloseTo(58.4087, 4)

    // --- TAX SUMMARY ---
    expect(result.taxSummary).toBeDefined()

    const { sumTaxable, sumExempt } = result.taxSummary

    expect(Number(sumTaxable.profits)).toBeCloseTo(370.7099975, 4)
    expect(Number(sumTaxable.losses)).toBeCloseTo(308.322675, 4)

    expect(Number(sumExempt.profits)).toBeCloseTo(24.7412495, 4)
    expect(Number(sumExempt.losses)).toBeCloseTo(7.08988375, 4)

    // --- HOLDINGS ---
    expect(result.holdings.length).toBeGreaterThan(0)

    const vwce = result.holdings.find(h => h.symbol === 'VWCE')
    expect(vwce.quantity).toBe(15)
    expect(vwce.currency).toBe('EUR')

    // --- DIVIDENDS ---
    expect(result.dividends.length).toBe(4)

    const aaplDividend = result.dividends.find(d => d.symbol === 'AAPL')
    expect(aaplDividend.dueTaxLcl).toBe(0)

    // --- INTEREST ---
    const totalInterest = result.interest.find(i => i._total && i.currency === 'BGN')
    expect(totalInterest).toBeDefined()
    expect(Number(totalInterest.amountLcl)).toBeCloseTo(47.71762, 4)
  })

  it('should not mutate input', () => {
    const frozen = structuredClone(input)
    calculateTax(input)

    expect(input).toEqual(frozen)
  })

  it('should handle empty input gracefully', () => {
    const empty = {
      taxYear: 2025,
      instruments: [],
      trades: [],
      dividends: [],
      withholdingTax: [],
      interest: [],
      openPositions: [],
      csvTrades: [],
    }

    const result = calculateTax(empty)

    expect(result.trades).toEqual([])
    expect(result.holdings).toEqual([])
    expect(result.dividends).toEqual([])
    expect(result.interest).toEqual([])
  })
})

// -------------------------
// MOCKS
// -------------------------

vi.mock('../../app/input/parser/parseInstruments.js', () => ({
  buildInstrumentInfo: vi.fn(() => ({
    AAPL: {
      description: 'Apple Inc.',
      type: 'Stock',
      securityId: 'US0378331005',
      country: 'US',
      countryName: 'USA',
    },
  })),
}))

vi.mock('../../app/input/parser/parseCsvTrades.js', () => ({
  buildCsvTradeBasis: vi.fn(() => new Map()),
}))

vi.mock('../domain/fx/fxRates.js', () => ({
  getLocalCurrencyCode: vi.fn(() => 'BGN'),
  getLocalCurrencyLabel: vi.fn(() => 'BGN'),
  getPrevYearEndDate: vi.fn(() => '2024-12-31'),
  toLocalCurrency: vi.fn((amount) => new Decimal(amount).times(2)),
}))

// -------------------------
// HELPERS
// -------------------------

const baseInput = {
  taxYear: 2025,
  instruments: [],
  csvTrades: [],
  openPositions: [],
  dividends: [],
  withholdingTax: [],
  interest: [],
  trades: [],
}

const buyTrade = (overrides = {}) => ({
  symbol: 'AAPL',
  datetime: '2025-01-01',
  currency: 'USD',
  side: 'BUY',
  quantity: 10,
  proceeds: -1000,
  commission: -10,
  fee: 0,
  exchange: 'NASDAQ',
  ...overrides,
})

const sellTrade = (overrides = {}) => ({
  symbol: 'AAPL',
  datetime: '2025-06-01',
  currency: 'USD',
  side: 'SELL',
  quantity: -10,
  proceeds: 2000,
  commission: -10,
  fee: 0,
  exchange: 'NASDAQ',
  ...overrides,
})

// -------------------------
// TESTS
// -------------------------

describe('calculateTax (domain service)', () => {

  it('returns expected structure', () => {
    const res = calculateTax(baseInput)

    expect(res).toMatchObject({
      trades: expect.anything(),
      taxSummary: expect.anything(),
      holdings: expect.anything(),
      dividends: expect.anything(),
      interest: expect.anything(),
      taxYear: 2025,
      localCurrencyCode: 'BGN',
      localCurrencyLabel: 'BGN',
    })
  })

  it('calculates profit correctly', () => {
    const input = {
      ...baseInput,
      trades: [buyTrade(), sellTrade()],
    }

    const res = calculateTax(input)

    expect(res.taxSummary.app5.profits).toBeGreaterThan(0)
    expect(res.taxSummary.app5.losses).toBe(0)
  })

  it('calculates loss correctly', () => {
    const input = {
      ...baseInput,
      trades: [
        buyTrade({ proceeds: -2000 }),
        sellTrade({ proceeds: 1000 }),
      ],
    }

    const res = calculateTax(input)

    expect(res.taxSummary.app5.losses).toBeGreaterThan(0)
  })

  it('returns trades array', () => {
    const input = {
      ...baseInput,
      trades: [buyTrade()],
    }

    const res = calculateTax(input)

    expect(Array.isArray(res.trades.rows)).toBe(true)
  })

  it('returns empty holdings safely', () => {
    const res = calculateTax(baseInput)

    expect(res.holdings).toBeDefined()
  })

  it('matches dividend + withholding', () => {
    const input = {
      ...baseInput,
      dividends: [{
        description: 'AAPL (US)',
        amount: '100',
        date: '2025-01-01',
        currency: 'USD',
      }],
      withholdingTax: [{
        description: 'AAPL (US)',
        amount: '-15',
        date: '2025-01-01',
      }],
    }

    const res = calculateTax(input)

    const row = res.dividends[0]

    expect(row.grossAmount).toBe(100)
    expect(row.withheldTax).toBe(15)
    expect(row.netAmount).toBe(85)
  })

  it('calculates dividend tax', () => {
    const input = {
      ...baseInput,
      dividends: [{
        description: 'AAPL (US)',
        amount: '100',
        date: '2025-01-01',
        currency: 'USD',
      }],
    }

    const res = calculateTax(input)

    expect(res.dividends[0].dueTaxLcl).toBeGreaterThan(0)
  })

  it('returns interest structure', () => {
    const input = {
      ...baseInput,
      interest: [{
        amount: '10',
        currency: 'USD',
        date: '2025-01-01',
      }],
    }

    const res = calculateTax(input)

    expect(Array.isArray(res.interest)).toBe(true)
  })
})