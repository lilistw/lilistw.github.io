import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { TradeCalculator } from './TradeCalculator.js'

// Minimal fxRates mock: 1 USD = 2 BGN, any date
vi.mock('../fx/fxRates.js', () => ({
  toLocalCurrency: (_amount, _currency, _date, _year) =>
    new Decimal(_amount).times(2),
}))

const ctx = {
  taxYear: 2025,
  localCurrencyCode: 'BGN',
  prevYearEndDate: '2024-12-31',
}

function makeTrade(overrides) {
  return {
    symbol: 'NOK',
    currency: 'USD',
    exchange: 'NYSE',
    commission: 0,
    fee: 0,
    price: 1,
    ...overrides,
  }
}

describe('TradeCalculator – open position cost after IBKR FIFO sells', () => {
  // Mirrors the real NOK case from issue #94:
  // 6 × 100-share buys, then a 100-share sell where IBKR reports a basis
  // that differs from the weighted average.
  it('deducts IBKR CSV basis from position, not weighted average', () => {
    // Buy costs (proceeds are negative in IBKR CSV for buys)
    const buys = [
      makeTrade({ datetime: '2025-11-04', side: 'BUY', quantity:  100, proceeds: -699.67245725 }),
      makeTrade({ datetime: '2025-11-10', side: 'BUY', quantity:  100, proceeds: -680.17245725 }),
      makeTrade({ datetime: '2025-11-14', side: 'BUY', quantity:  100, proceeds: -660.21245725 }),
      makeTrade({ datetime: '2025-11-18', side: 'BUY', quantity:  100, proceeds: -655.67245725 }),
      makeTrade({ datetime: '2025-11-20', side: 'BUY', quantity:  100, proceeds: -610.19245725 }),
      makeTrade({ datetime: '2025-11-26', side: 'BUY', quantity:  100, proceeds: -600.05245725 }),
    ]
    const sell = makeTrade({ datetime: '2025-11-26', side: 'SELL', quantity: -100, proceeds: 611 })

    // IBKR's declared basis for this sell (first lot: 100 @ ~6.99 from 2025-11-04)
    const ibkrSellBasis = new Decimal('610.192457')

    const csvTradeBasis = new Map([
      ['NOK|2025-11-26|100', ibkrSellBasis],
    ])

    const totalBuyCost = buys.reduce((s, b) => s + Math.abs(b.proceeds), 0)

    const calc = new TradeCalculator({
      instrumentInfo: {},
      csvTradeBasis,
      context: ctx,
      strategy: 'ibkr',
    })

    const { calculatedPositions } = calc.calculate([...buys, sell])

    const pos = calculatedPositions['NOK']
    expect(pos).toBeDefined()
    expect(pos.qty.toNumber()).toBe(500)

    // With IBKR FIFO: remaining cost = total buy cost - IBKR sell basis
    const expectedCost = totalBuyCost - ibkrSellBasis.toNumber()
    expect(pos.cost.toNumber()).toBeCloseTo(expectedCost, 4)

    // With weighted average the result would differ (higher basis deducted)
    const waCost = totalBuyCost - (totalBuyCost / 600) * 100
    expect(pos.cost.toNumber()).not.toBeCloseTo(waCost, 1)
  })

  it('weighted-average strategy still deducts proportionally', () => {
    const buys = [
      makeTrade({ datetime: '2025-11-04', side: 'BUY', quantity: 100, proceeds: -700 }),
      makeTrade({ datetime: '2025-11-10', side: 'BUY', quantity: 100, proceeds: -600 }),
    ]
    const sell = makeTrade({ datetime: '2025-11-20', side: 'SELL', quantity: -100, proceeds: 650 })

    const csvTradeBasis = new Map([
      // IBKR says 650, but WA strategy should ignore this for position update
      ['NOK|2025-11-20|100', new Decimal('650')],
    ])

    const calc = new TradeCalculator({
      instrumentInfo: {},
      csvTradeBasis,
      context: ctx,
      strategy: 'weighted-average',
    })

    const { calculatedPositions } = calc.calculate([...buys, sell])

    const pos = calculatedPositions['NOK']
    // WA cost per share = (700 + 600) / 200 = 6.5; deduct 100 × 6.5 = 650
    expect(pos.cost.toNumber()).toBeCloseTo(650, 4)   // 1300 - 650
    expect(pos.qty.toNumber()).toBe(100)
  })
})
