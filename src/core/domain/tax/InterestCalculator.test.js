import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { InterestCalculator } from './InterestCalculator.js'

vi.mock('../fx/fxRates.js', () => ({
  toLocalCurrency: (amount, currency) => {
    const v = new Decimal(amount)
    return currency === 'USD' ? v.times(2) : v
  },
}))

describe('InterestCalculator', () => {
  it('maps rows and appends currency/grand totals', () => {
    const calc = new InterestCalculator({ taxContext: { taxYear: 2025, localCurrencyCode: 'BGN' } })

    const rows = calc.calculate({
      interest: [
        { date: '2025-01-01', currency: 'USD', amount: '10.5' },
        { date: '2025-01-15', currency: 'USD', amount: '4.5' },
        { date: '2025-02-01', currency: 'EUR', amount: '3' },
      ],
    })

    expect(rows).toHaveLength(6)
    const usdTotal = rows.find(r => r._total && r.currency === 'USD')
    const eurTotal = rows.find(r => r._total && r.currency === 'EUR')
    const grandTotal = rows.find(r => r._total && r.currency === 'BGN')

    expect(usdTotal.amount.toNumber()).toBeCloseTo(15, 6)
    expect(usdTotal.amountLcl.toNumber()).toBeCloseTo(30, 6)
    expect(eurTotal.amount.toNumber()).toBeCloseTo(3, 6)
    expect(grandTotal.amountLcl.toNumber()).toBeCloseTo(33, 6)
  })

  it('returns only grand total for empty input', () => {
    const calc = new InterestCalculator({ taxContext: { taxYear: 2025, localCurrencyCode: 'BGN' } })
    const rows = calc.calculate({ interest: [] })

    expect(rows).toEqual([
      expect.objectContaining({ _total: true, currency: 'BGN' }),
    ])
    expect(rows[0].amountLcl.toNumber()).toBe(0)
  })
})
