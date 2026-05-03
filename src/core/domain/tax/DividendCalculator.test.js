import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { DividendCalculator } from './DividendCalculator.js'

vi.mock('../fx/fxRates.js', () => ({
  toLocalCurrency: (amount) => new Decimal(amount),
}))

const ctx = { taxYear: 2025 }

const instrumentInfo = {
  AAPL: { description: 'Apple Inc.', country: 'US' },
  MSFT: { description: 'Microsoft Corp.', country: 'US' },
}

describe('DividendCalculator', () => {
  it('matches withholding by symbol/date and groups by tax method', () => {
    const calc = new DividendCalculator({ instrumentInfo, taxContext: ctx })

    const rows = calc.calculate({
      dividends: [
        { description: 'AAPL (US)', date: '2025-03-01', currency: 'USD', amount: '100' },
        { description: 'AAPL (US)', date: '2025-03-15', currency: 'USD', amount: '40' },
      ],
      withholdingTax: [
        { description: 'AAPL (US)', date: '2025-03-01', amount: '-10' },
      ],
    })

    expect(rows).toHaveLength(2)

    const taxable = rows.find(r => r.methodCode === 1)
    const exempt = rows.find(r => r.methodCode === 3)

    expect(taxable.symbol).toBe('AAPL')
    expect(taxable.grossAmountLcl.toNumber()).toBeCloseTo(100, 6)
    expect(taxable.foreignTaxPaidLcl.toNumber()).toBeCloseTo(10, 6)
    expect(taxable.allowableCreditLcl).toBeNull()
    expect(taxable.dueTaxLcl.toNumber()).toBe(0)

    expect(exempt.grossAmountLcl.toNumber()).toBeCloseTo(40, 6)
    expect(exempt.foreignTaxPaidLcl.toNumber()).toBe(0)
    expect(exempt.allowableCreditLcl).toBeNull()
    expect(exempt.dueTaxLcl.toNumber()).toBeCloseTo(2, 6)
  })

  it('falls back to first token symbol when description has no country suffix', () => {
    const calc = new DividendCalculator({ instrumentInfo, taxContext: ctx })

    const rows = calc.calculate({
      dividends: [{ description: 'MSFT CASH DIVIDEND', date: '2025-04-10', currency: 'USD', amount: '50' }],
      withholdingTax: [{ description: 'MSFT (US)', date: '2025-04-10', amount: '-7.5' }],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].symbol).toBe('MSFT')
    expect(rows[0].foreignTaxPaidLcl.toNumber()).toBeCloseTo(7.5, 6)
    expect(rows[0].dueTaxLcl.toNumber()).toBe(0)
  })
})
