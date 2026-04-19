import { describe, it, expect } from 'vitest'
import { calculate } from '../calculate.js'

// EUR uses a fixed rate (1.95583) — ideal for deterministic tests with exact math
const EUR_BGN = 1.95583

function makeInput(overrides = {}) {
  return {
    taxYear:      2025,
    instruments:  [],
    csvTrades:    [],
    trades:       [],
    openPositions: [],
    dividends:    [],
    withholdingTax: [],
    interest:     [],
    ...overrides,
  }
}

function makeTrade(fields = {}) {
  return {
    symbol:     fields.symbol     ?? 'AAPL',
    datetime:   fields.datetime   ?? '2025-03-15, 10:00:00',
    settleDate: fields.settleDate ?? '2025-03-17',
    exchange:   fields.exchange   ?? 'NASDAQ',
    currency:   fields.currency   ?? 'EUR',
    side:       fields.side       ?? 'BUY',
    quantity:   fields.quantity   ?? '10',
    price:      fields.price      ?? '150.00',
    proceeds:   fields.proceeds   ?? '-1500.00',
    commission: fields.commission ?? '-5.00',
    fee:        fields.fee        ?? '0',
    orderType:  fields.orderType  ?? 'LMT',
    code:       fields.code       ?? 'O',
  }
}

describe('calculate — return structure', () => {
  it('returns all top-level result keys for empty input', () => {
    const result = calculate(makeInput())
    expect(result).toHaveProperty('trades')
    expect(result).toHaveProperty('holdings')
    expect(result).toHaveProperty('dividends')
    expect(result).toHaveProperty('interest')
    expect(result).toHaveProperty('taxSummary')
    expect(result).toHaveProperty('taxYear')
    expect(result).toHaveProperty('localCurrencyCode')
    expect(result).toHaveProperty('localCurrencyLabel')
  })

  it('reports taxYear and localCurrency correctly for 2025', () => {
    const result = calculate(makeInput({ taxYear: 2025 }))
    expect(result.taxYear).toBe(2025)
    expect(result.localCurrencyCode).toBe('BGN')
    expect(result.localCurrencyLabel).toBe('лв')
  })

  it('reports EUR local currency for 2026', () => {
    const result = calculate(makeInput({ taxYear: 2026 }))
    expect(result.localCurrencyCode).toBe('EUR')
    expect(result.localCurrencyLabel).toBe('евро')
  })

  it('taxSummary has app5, app13, app8Holdings, app8Dividends', () => {
    const result = calculate(makeInput())
    expect(result.taxSummary).toHaveProperty('app5')
    expect(result.taxSummary).toHaveProperty('app13')
    expect(result.taxSummary).toHaveProperty('app8Holdings')
    expect(result.taxSummary).toHaveProperty('app8Dividends')
  })

  it('trades result has columns and rows arrays', () => {
    const result = calculate(makeInput())
    expect(Array.isArray(result.trades.columns)).toBe(true)
    expect(Array.isArray(result.trades.rows)).toBe(true)
  })
})

describe('calculate — BUY accumulates cost basis', () => {
  it('BUY row has taxable=null and taxExemptLabel=""', () => {
    const input = makeInput({
      trades: [makeTrade({ side: 'BUY', quantity: '10', proceeds: '-1500', commission: '-5', fee: '0' })],
    })
    const { trades } = calculate(input)
    const buyRow = trades.rows.find(r => r.side === 'BUY')
    expect(buyRow.taxable).toBeNull()
    expect(buyRow.taxExemptLabel).toBe('')
  })

  it('BUY row has correct proceeds, commission and totalWithFee', () => {
    const input = makeInput({
      trades: [makeTrade({ side: 'BUY', quantity: '10', proceeds: '-1500', commission: '-5', fee: '0' })],
    })
    const { trades } = calculate(input)
    const buyRow = trades.rows.find(r => r.side === 'BUY')
    expect(buyRow.proceeds).toBeCloseTo(-1500)
    expect(buyRow.commission).toBeCloseTo(-5)
    expect(buyRow.totalWithFee).toBeCloseTo(-1505)
  })

  it('BUY totalWithFeeBGN = totalWithFee * EUR_BGN for EUR trades', () => {
    const input = makeInput({
      trades: [makeTrade({ side: 'BUY', quantity: '10', proceeds: '-1500', commission: '-5', fee: '0' })],
    })
    const { trades } = calculate(input)
    const buyRow = trades.rows.find(r => r.side === 'BUY')
    expect(buyRow.totalWithFeeBGN).toBeCloseTo(-1505 * EUR_BGN, 2)
  })
})

describe('calculate — SELL realizes gain/loss', () => {
  it('SELL after BUY produces correct costBasis', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10',  proceeds: '-1500', commission: '-5',  fee: '0', datetime: '2025-03-15, 10:00:00' }),
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800',  commission: '-5',  fee: '0', datetime: '2025-06-15, 10:00:00' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    expect(sellRow.costBasis).toBeCloseTo(1505, 2)
    expect(sellRow.costBasisBGN).toBeCloseTo(1505 * EUR_BGN, 2)
  })

  it('SELL proceedsBGN = totalWithFee * EUR_BGN for EUR trades', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10',  proceeds: '-1500', commission: '-5',  fee: '0', datetime: '2025-03-15, 10:00:00' }),
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800',  commission: '-5',  fee: '0', datetime: '2025-06-15, 10:00:00' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    // totalWithFee = 1800 + (-5) + 0 = 1795
    expect(sellRow.proceedsBGN).toBeCloseTo(1795 * EUR_BGN, 2)
  })

  it('profit trade appears in app5 when exchange is not EU-regulated', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10',  proceeds: '-1500', commission: '-5',  fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'NASDAQ' }),
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800',  commission: '-5',  fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'NASDAQ' }),
      ],
    })
    const { taxSummary } = calculate(input)
    expect(taxSummary.app5.profits).toBeGreaterThan(0)
    expect(taxSummary.app13.profits).toBe(0)
  })

  it('loss trade contributes to app5.losses', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10',  proceeds: '-1800', commission: '-5', fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'NASDAQ' }),
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1500',  commission: '-5', fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'NASDAQ' }),
      ],
    })
    const { taxSummary } = calculate(input)
    expect(taxSummary.app5.losses).toBeGreaterThan(0)
    expect(taxSummary.app5.profits).toBe(0)
  })

  it('SELL row is taxable=true for non-EU stock', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10',  proceeds: '-1500', commission: '-5', fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'NASDAQ' }),
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800',  commission: '-5', fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'NASDAQ' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    expect(sellRow.taxable).toBe(true)
    expect(sellRow.taxExemptLabel).toBe('Облагаем')
  })
})

describe('calculate — tax-exempt ETF on EU-regulated exchange', () => {
  // EXS1 (iShares Core MSCI World ETF) on IBIS (Deutsche Börse Xetra)
  const etfInstruments = [
    {
      assetCategory: 'ETF', symbol: 'EXS1', description: 'iShares Core MSCI World ETF',
      conid: '123', securityId: 'IE00B4L5Y983', underlying: '',
      listingExchange: 'IBIS', multiplier: '1', type: 'ETF', code: '',
    },
  ]

  it('ETF sell on EU-regulated exchange is taxable=false', () => {
    const input = makeInput({
      instruments: etfInstruments,
      trades: [
        makeTrade({ symbol: 'EXS1', side: 'BUY',  quantity: '5',  proceeds: '-750',  commission: '-2', fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'IBIS' }),
        makeTrade({ symbol: 'EXS1', side: 'SELL', quantity: '-5', proceeds: '900',   commission: '-2', fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'IBIS' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    expect(sellRow.taxable).toBe(false)
    expect(sellRow.taxExemptLabel).toBe('Освободен')
  })

  it('exempt ETF sell contributes to app13, not app5', () => {
    const input = makeInput({
      instruments: etfInstruments,
      trades: [
        makeTrade({ symbol: 'EXS1', side: 'BUY',  quantity: '5',  proceeds: '-750',  commission: '-2', fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'IBIS' }),
        makeTrade({ symbol: 'EXS1', side: 'SELL', quantity: '-5', proceeds: '900',   commission: '-2', fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'IBIS' }),
      ],
    })
    const { taxSummary } = calculate(input)
    expect(taxSummary.app13.profits).toBeGreaterThan(0)
    expect(taxSummary.app5.profits).toBe(0)
  })

  it('non-ETF stock on EU exchange is still taxable', () => {
    // Regular stock (not ETF) on Frankfurt — must be taxable regardless
    const input = makeInput({
      instruments: [
        { assetCategory: 'Stocks', symbol: 'SAP', description: 'SAP SE', conid: '456',
          securityId: 'DE0007164600', underlying: '', listingExchange: 'FWB',
          multiplier: '1', type: 'COMMON', code: '' },
      ],
      trades: [
        makeTrade({ symbol: 'SAP', side: 'BUY',  quantity: '5',  proceeds: '-500', commission: '-2', fee: '0', datetime: '2025-03-15, 10:00:00', exchange: 'FWB' }),
        makeTrade({ symbol: 'SAP', side: 'SELL', quantity: '-5', proceeds: '600',  commission: '-2', fee: '0', datetime: '2025-06-15, 10:00:00', exchange: 'FWB' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    expect(sellRow.taxable).toBe(true)
  })
})

describe('calculate — weighted-average cost basis', () => {
  it('averages cost across multiple BUY lots', () => {
    const input = makeInput({
      trades: [
        makeTrade({ side: 'BUY',  quantity: '10', proceeds: '-1000', commission: '0', fee: '0', datetime: '2025-01-15, 10:00:00' }),
        makeTrade({ side: 'BUY',  quantity: '10', proceeds: '-2000', commission: '0', fee: '0', datetime: '2025-02-15, 10:00:00' }),
        // SELL 10 units: avg cost = (1000+2000)/20 * 10 = 1500
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800', commission: '0', fee: '0', datetime: '2025-06-15, 10:00:00' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    expect(sellRow.costBasis).toBeCloseTo(1500, 2)
  })
})

describe('calculate — prior-year positions', () => {
  it('uses prior-year costBGN when seeded via priorPositions', () => {
    const priorPositions = [
      { symbol: 'AAPL', qty: 10, costUSD: 1500, costBGN: 2800 },
    ]
    const input = makeInput({
      trades: [
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800', commission: '-5', fee: '0', datetime: '2025-06-15, 10:00:00' }),
      ],
    })
    const { trades } = calculate(input, priorPositions)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    // Prior positions seeded cost = 1500, costBGN = 2800
    // SELL 10 of 10: costBasis = 1500, costBasisBGN = 2800
    expect(sellRow.costBasis).toBeCloseTo(1500, 2)
    expect(sellRow.costBasisBGN).toBeCloseTo(2800, 2)
  })
})

describe('calculate — dividends', () => {
  it('matches dividends with withholding tax by symbol and date', () => {
    const input = makeInput({
      instruments: [
        { assetCategory: 'Stocks', symbol: 'AAPL', description: 'Apple Inc', conid: '1',
          securityId: 'US0378331005', underlying: '', listingExchange: 'NASDAQ',
          multiplier: '1', type: 'COMMON', code: '' },
      ],
      dividends: [
        // gross 100 USD → BG tax = 100 * 0.05 = 5 USD; withholding 1.5 < 5 → dueTaxBGN > 0
        { currency: 'USD', date: '2025-03-15', description: 'AAPL(US0378331005) Cash Dividend', amount: '100.00' },
      ],
      withholdingTax: [
        { currency: 'USD', date: '2025-03-15', description: 'AAPL(US0378331005) Cash Dividend', amount: '-1.50', code: 'Po' },
      ],
    })
    const { dividends, taxSummary } = calculate(input)
    expect(dividends.rows).toHaveLength(1)
    expect(dividends.rows[0].symbol).toBe('AAPL')
    expect(dividends.rows[0].grossAmount).toBeCloseTo(100)
    expect(dividends.rows[0].withheldTax).toBeCloseTo(1.5)
    expect(dividends.rows[0].netAmount).toBeCloseTo(98.5)

    // App8 dividends should have exactly one row
    expect(taxSummary.app8Dividends.rows).toHaveLength(1)
    expect(taxSummary.app8Dividends.rows[0].dueTaxBGN).toBeGreaterThan(0)
  })

  it('taxCode=3 when no withholding tax (credit exemption method)', () => {
    const input = makeInput({
      dividends: [
        { currency: 'USD', date: '2025-03-15', description: 'AAPL Cash Dividend', amount: '10.00' },
      ],
      withholdingTax: [],
    })
    const { dividends } = calculate(input)
    expect(dividends.rows[0].taxCode).toBe(3)
  })

  it('taxCode=1 when withholding tax exists', () => {
    const input = makeInput({
      dividends: [
        { currency: 'USD', date: '2025-03-15', description: 'AAPL(X) Cash Dividend', amount: '10.00' },
      ],
      withholdingTax: [
        { currency: 'USD', date: '2025-03-15', description: 'AAPL(X) Cash Dividend', amount: '-1.50', code: 'Po' },
      ],
    })
    const { dividends } = calculate(input)
    expect(dividends.rows[0].taxCode).toBe(1)
  })
})

describe('calculate — interest', () => {
  it('converts interest amounts to local currency', () => {
    const input = makeInput({
      interest: [
        { currency: 'EUR', date: '2025-02-28', description: 'EUR Credit Interest', amount: '10.00' },
      ],
    })
    const { interest } = calculate(input)
    const dataRow = interest.rows.find(r => !r._total)
    expect(dataRow.amount).toBeCloseTo(10)
    expect(dataRow.amountBGN).toBeCloseTo(10 * EUR_BGN, 2)
  })

  it('adds total rows for each currency and a BGN grand total', () => {
    const input = makeInput({
      interest: [
        { currency: 'EUR', date: '2025-01-31', description: 'EUR Interest', amount: '5.00' },
        { currency: 'EUR', date: '2025-02-28', description: 'EUR Interest', amount: '3.00' },
      ],
    })
    const { interest } = calculate(input)
    const eurTotal = interest.rows.find(r => r._total && r.currency === 'EUR')
    const bgnTotal = interest.rows.find(r => r._total && r.currency === 'BGN')
    expect(eurTotal).toBeDefined()
    expect(eurTotal.amount).toBeCloseTo(8)
    expect(bgnTotal).toBeDefined()
  })
})

describe('calculate — edge cases', () => {
  it('handles completely empty input without throwing', () => {
    expect(() => calculate(makeInput())).not.toThrow()
  })

  it('handles SELL with no prior BUY in dataset (falls back to csvTradeBasis)', () => {
    // When there's no BUY in current year's trades, costBasis should be null
    // unless csvTradeBasis has an entry
    const input = makeInput({
      trades: [
        makeTrade({ side: 'SELL', quantity: '-10', proceeds: '1800', commission: '-5', fee: '0',
                    datetime: '2025-06-15, 10:00:00', symbol: 'ORPHAN' }),
      ],
    })
    const { trades } = calculate(input)
    const sellRow = trades.rows.find(r => r.side === 'SELL')
    // No prior BUY and no csvTradeBasis entry — costBasis should be null
    expect(sellRow.costBasis).toBeNull()
  })

  it('handles trades for multiple symbols independently', () => {
    const input = makeInput({
      trades: [
        makeTrade({ symbol: 'AAPL', side: 'BUY',  quantity: '10',  proceeds: '-1500', commission: '-5', fee: '0', datetime: '2025-03-15, 10:00:00' }),
        makeTrade({ symbol: 'MSFT', side: 'BUY',  quantity: '5',   proceeds: '-500',  commission: '-2', fee: '0', datetime: '2025-03-20, 10:00:00' }),
        makeTrade({ symbol: 'AAPL', side: 'SELL', quantity: '-10', proceeds: '1800',  commission: '-5', fee: '0', datetime: '2025-06-15, 10:00:00' }),
      ],
    })
    const { trades, taxSummary } = calculate(input)
    const aaplSell = trades.rows.find(r => r.side === 'SELL' && r.symbol === 'AAPL')
    expect(aaplSell.costBasis).toBeCloseTo(1505, 2)
    // MSFT BUY should not affect AAPL cost basis
    expect(taxSummary.app5.profits).toBeGreaterThan(0)
  })
})
