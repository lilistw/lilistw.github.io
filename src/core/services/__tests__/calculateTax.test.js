import { describe, it, expect } from 'vitest'
import { calculateTax } from '../calculateTax.js'
import {
  findUsdRate,
  getLocalCurrencyCode,
  getLocalCurrencyLabel,
  getPrevYearEndDate,
} from '../../domain/fx/fxRates.js'
import { toDecimal } from '@util/numStr.js'

import input from './fixtures/demoInput.json'

const buildTaxContext = (taxYear) => {
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  return {
    taxYear,
    localCurrencyCode: getLocalCurrencyCode(taxYear),
    localCurrencyLabel: getLocalCurrencyLabel(taxYear),
    prevYearEndDate,
    prevYearUsdRate: findUsdRate(prevYearEndDate, taxYear),
  }
}

const decimalOpenPositionFields = [
  'quantity',
  'multiplier',
  'costPrice',
  'costBasis',
  'closePrice',
  'value',
  'unrealizedPL',
]

const normalizeOpenPosition = (position) => ({
  ...position,
  ...Object.fromEntries(
    decimalOpenPositionFields.map(field => [field, toDecimal(position[field])])
  ),
})

const withTaxContext = (source) => ({
  ...source,
  openPositions: source.openPositions?.map(normalizeOpenPosition) ?? [],
  taxContext: buildTaxContext(source.taxYear),
})

const demoInput = withTaxContext(input)

describe('calculateTax', () => {
  it('should calculate full tax result correctly (integration)', () => {
    const result = calculateTax(demoInput)

    // --- BASIC STRUCTURE ---
    expect(result).toBeDefined()
    expect(result.taxContext.taxYear).toBe(2025)
    expect(result.taxContext.localCurrencyCode).toBe('BGN')
    expect(result.taxContext.localCurrencyLabel).toBe('BGN')

    // --- TRADES ---
    expect(result.trades.length).toBeGreaterThan(0)

    const sellTrade = result.trades.find(t => t.symbol === 'AMZN')
    expect(sellTrade).toBeDefined()
    expect(Number(sellTrade.realizedPLLcl)).toBeCloseTo(58.40945, 4)

    // --- TAX SUMMARY ---
    expect(result.taxSummary).toBeDefined()

    const { sumTaxable, sumExempt } = result.taxSummary

    expect(Number(sumTaxable.profits)).toBeCloseTo(347.74431, 4)
    expect(Number(sumTaxable.losses)).toBeCloseTo(308.322675, 4)

    expect(Number(sumExempt.profits)).toBe(0)
    expect(Number(sumExempt.losses)).toBeCloseTo(9.77915, 4)

    // --- HOLDINGS ---
    expect(result.holdings.length).toBeGreaterThan(0)

    const vwce = result.holdings.find(h => h.symbol === 'VWCE')
    expect(Number(vwce.quantity)).toBe(15)
    expect(vwce.currency).toBe('EUR')

    // --- DIVIDENDS ---
    expect(result.dividends.length).toBe(4)

    const aaplDividend = result.dividends.find(d => d.symbol === 'AAPL')
    expect(Number(aaplDividend.dueTaxLcl)).toBe(0)

    // --- INTEREST ---
    const totalInterest = result.interest.find(i => i._total && i.currency === 'BGN')
    expect(totalInterest).toBeDefined()
    expect(Number(totalInterest.amountLcl)).toBeCloseTo(47.71762, 4)
  })

  it('should not mutate input', () => {
    const frozen = JSON.stringify(demoInput)
    calculateTax(demoInput)

    expect(JSON.stringify(demoInput)).toBe(frozen)
  })

  it('should handle empty input gracefully', () => {
    const empty = withTaxContext({
      taxYear: 2025,
      instruments: [],
      trades: [],
      dividends: [],
      withholdingTax: [],
      interest: [],
      openPositions: [],
      csvTrades: [],
    })

    const result = calculateTax(empty)

    expect(result.trades).toEqual([])
    expect(result.holdings).toEqual({
      holdingsRows: [],
      app8Rows: [],
    })
    expect(result.dividends).toEqual([])
    expect(result.interest).toHaveLength(1)
    expect(result.interest[0]).toMatchObject({
      _total: true,
      currency: 'BGN',
    })
    expect(Number(result.interest[0].amountLcl)).toBe(0)
  })
})

// -------------------------
// HELPERS
// -------------------------

const baseInput = {
  taxYear: 2025,
  taxContext: buildTaxContext(2025),
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
  currency: 'EUR',
  side: 'BUY',
  quantity: 10,
  price: 100,
  proceeds: -1000,
  commission: -10,
  fee: 0,
  exchange: 'NASDAQ',
  ...overrides,
})

const sellTrade = (overrides = {}) => ({
  symbol: 'AAPL',
  datetime: '2025-06-01',
  currency: 'EUR',
  side: 'SELL',
  quantity: -10,
  price: 200,
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
      taxContext: {
        taxYear: 2025,
        localCurrencyCode: 'BGN',
        localCurrencyLabel: 'BGN',
      },
    })
  })

  it('calculates profit correctly', () => {
    const input = {
      ...baseInput,
      trades: [buyTrade(), sellTrade()],
    }

    const res = calculateTax(input)

    expect(Number(res.taxSummary.sumTaxable.profits)).toBeGreaterThan(0)
    expect(Number(res.taxSummary.sumTaxable.losses)).toBe(0)
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

    expect(Number(res.taxSummary.sumTaxable.losses)).toBeGreaterThan(0)
  })

  it('returns trades array', () => {
    const input = {
      ...baseInput,
      trades: [buyTrade()],
    }

    const res = calculateTax(input)

    expect(Array.isArray(res.trades)).toBe(true)
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

    expect(Number(row.grossAmountLcl)).toBeCloseTo(188.26)
    expect(Number(row.foreignTaxPaidLcl)).toBeCloseTo(28.239)
    expect(Number(row.dueTaxLcl)).toBe(0)
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

    expect(Number(res.dividends[0].dueTaxLcl)).toBeGreaterThan(0)
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
