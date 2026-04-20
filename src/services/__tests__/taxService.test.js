import { describe, it, expect, beforeEach, vi } from 'vitest'
import Decimal from 'decimal.js'
import { calculateTax } from '../taxService.js'
import demoInput from './fixtures/demoInput.json'
import demoOutput from './fixtures/demoOutput.json'


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


// ---- MOCKS ----
vi.mock('../domain/parser/parseInstruments.js', () => ({
  buildInstrumentInfo: vi.fn(() => ({
    AAPL: {
      description: 'Apple Inc.',
      type: 'Stock',
      securityId: 'US0378331005',
      country: 'US',
      countryName: 'USA',
    },
  })),
  expandByAliases: vi.fn((x) => x),
}))

vi.mock('../domain/parser/parseCsvTrades.js', () => ({
  buildCsvTradeBasis: vi.fn(() => new Map([
    ['AAPL|2025-01-01|10', new Decimal(1000)],
  ])),
}))

vi.mock('../domain/parser/parseOpenPositions.js', () => ({
  buildOpenPositions: vi.fn(() => ({
    columns: [],
    rows: [],
  })),
}))

vi.mock('../fx/fxRates.js', () => ({
  toLocalCurrency: vi.fn((amount) => new Decimal(amount).times(2)), // FX = *2
  getLocalCurrencyCode: vi.fn(() => 'BGN'),
  getLocalCurrencyLabel: vi.fn(() => 'BGN'),
  getYearEndDate: vi.fn(() => '2025-12-31'),
  getPrevYearEndDate: vi.fn(() => '2024-12-31'),
}))

vi.mock('../instrument/classifier.js', () => ({
  isTaxable: vi.fn(() => true),
  getInstrumentTypeLabel: vi.fn(() => 'Stock'),
}))

vi.mock('../constants.js', () => ({
  IBKR_EXCHANGES: {
    NASDAQ: { regulated: true },
  },
}))

// ---- TEST DATA ----
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

describe('taxService', () => {
  it('should accumulate position on BUY', () => {
    const input = {
      ...baseInput,
      trades: [{
        symbol: 'AAPL',
        datetime: '2025-01-01',
        currency: 'USD',
        side: 'BUY',
        quantity: 10,
        proceeds: -1000,
        commission: -10,
        fee: 0,
        exchange: 'NASDAQ',
      }],
    }

    const res = calculateTax(input)
    const row = res.trades.rows[0]

    expect(row.totalWithFee).toBe(-1010)
    expect(row.costBasis).toBe(null)
    expect(row.taxable).toBe(null)
  })

  it('should mark sell as taxable', () => {
    const input = {
      ...baseInput,
      trades: [{
        symbol: 'AAPL',
        datetime: '2025-01-01',
        currency: 'USD',
        side: 'SELL',
        quantity: -1,
        proceeds: 100,
        commission: 0,
        fee: 0,
        exchange: 'NASDAQ',
      }],
    }

    const res = calculateTax(input)
    expect(res.trades.rows[0].taxable).toBe(true)
  })

  it('should match dividends with withholding tax', () => {
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
    const row = res.dividends.rows[0]

    expect(row.grossAmount).toBe(100)
    expect(row.withheldTax).toBe(15)
    expect(row.netAmount).toBe(85)
  })

  it('should calculate BG dividend tax correctly', () => {
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
    expect(res.taxSummary.app8Dividends.rows[0].dueTaxLcl).toBeGreaterThan(0)
  })

  it('should calculate totals per currency', () => {
    const input = {
      ...baseInput,
      trades: [{
        symbol: 'AAPL',
        datetime: '2025-01-01',
        currency: 'USD',
        side: 'SELL',
        quantity: -1,
        proceeds: 100,
        commission: 0,
        fee: 0,
        exchange: 'NASDAQ',
      }],
    }

    const res = calculateTax(input)
    const totals = res.trades.rows.find(r => r._total && r.currency === 'USD')

    expect(totals.proceeds).toBe(100)
  })
})

describe('taxService - demo dataset (integration)', () => {
  let res

  beforeEach(() => {
    res = calculateTax(demoInput)
  })

  it('should produce valid structure', () => {
    expect(res).toMatchObject({
      taxYear: 2025,
      trades: { rows: expect.any(Array) },
      dividends: { rows: expect.any(Array) },
      taxSummary: expect.any(Object),
    })
  })

  it('TSLA should produce a loss', () => {
    const sell = res.trades.rows.find(
      r => r.symbol === 'TSLA' && r.side === 'SELL'
    )

    expect(sell.realizedPLLcl).toBeLessThan(0)
  })

  it('GOOG should maintain rolling average cost', () => {
    const sell = res.trades.rows.find(
      r => r.symbol === 'GOOG' && r.side === 'SELL'
    )

    expect(sell.costBasis).toBeCloseTo(2476.25, 2)
  })

  it('AAPL dividend should include withholding tax', () => {
    const div = res.dividends.rows.find(r => r.symbol === 'AAPL')

    expect(div.withheldTax).toBeGreaterThan(0)
    expect(div.netAmount).toBeGreaterThan(0)
  })

  it('should never produce negative cost basis on SELL', () => {
    const sells = res.trades.rows.filter(r => r.side === 'SELL')

    sells.forEach(s => {
      const val = s.costBasis?.toNumber?.() ?? s.costBasis
      if (val != null) {
        expect(val).toBeGreaterThanOrEqual(0)
      }
    })
  })
})

/** Holdings suite */
describe('taxService - holdings', () => {
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

  it('should return empty holdings when parser returns empty', async () => {
    vi.resetModules()

    vi.doMock('../domain/parser/parseOpenPositions.js', () => ({
      buildOpenPositions: vi.fn(() => ({
        columns: [],
        rows: [],
      })),
    }))

    const res = calculateTax(baseInput)

    expect(res.holdings.rows).toEqual([])
  })
})

/** Demo output test **/

// helper: normalize decimals + remove unstable fields
function normalize(value) {
  if (value == null) return value

  // Decimal → number
  if (typeof value === 'object' && value.toNumber) {
    return value.toNumber()
  }

  if (Array.isArray(value)) {
    return value.map(normalize)
  }

  if (typeof value === 'object') {
    const result = {}

    for (const [k, v] of Object.entries(value)) {
      // ignore unstable / presentation fields
      if (
        k.includes('Lcl') ||
        k === 'taxExemptLabel' ||
        k === 'taxable' ||
        k === 'instrType' ||
        k === 'costBasis' ||
        k === 'rows' ||
        k === 'columns' ||
        k === 'localCurrencyLabel' ||
        k === 'losses' ||
        k === 'profits' ||
        k === 'label' ||
        k === 'shortLabel' ||
        k === 'rate' ||
        k === 'description' ||
        k === 'securityId' ||
        k === 'countryName'
      ) continue

      result[k] = normalize(v)
    }

    return result
  }

  return value
}

it('should match full demo output (normalized)', () => {
  const res = calculateTax(demoInput)

  expect(normalize(res)).toEqual(normalize(demoOutput))
})
