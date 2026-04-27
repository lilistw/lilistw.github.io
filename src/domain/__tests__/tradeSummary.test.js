import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { buildTradeTotals, buildTaxSummary } from '../tradeSummary.js'

function makeSell(fields = {}) {
  return {
    side:         'SELL',
    currency:     fields.currency     ?? 'USD',
    taxable:      fields.taxable      ?? true,
    proceeds:     new Decimal(fields.proceeds     ?? 100),
    commission:   new Decimal(fields.commission   ?? -2),
    fee:          new Decimal(fields.fee          ?? 0),
    total:        new Decimal(fields.total        ?? 98),
    totalLcl:     new Decimal(fields.totalLcl     ?? 191.67),
    costBasisLcl: fields.costBasisLcl != null ? new Decimal(fields.costBasisLcl) : new Decimal(176.03),
  }
}

function makeBuy(fields = {}) {
  return {
    side:         'BUY',
    currency:     fields.currency  ?? 'USD',
    taxable:      null,
    proceeds:     new Decimal(fields.proceeds   ?? -100),
    commission:   new Decimal(fields.commission ?? -2),
    fee:          new Decimal(fields.fee        ?? 0),
    total:        new Decimal(fields.total      ?? -102),
    totalLcl:     new Decimal(fields.totalLcl   ?? -199.49),
    costBasisLcl: null,
  }
}

describe('buildTradeTotals', () => {
  it('returns empty array for empty input', () => {
    expect(buildTradeTotals([])).toEqual([])
  })

  it('builds total rows grouped by taxable and currency', () => {
    const rows = [
      makeSell({ currency: 'USD', taxable: true,  totalLcl: 195.58 }),
      makeSell({ currency: 'EUR', taxable: true,  totalLcl: 391.17 }),
    ]
    const totals = buildTradeTotals(rows)
    expect(totals.some(r => r.currency === 'USD' && r.taxExemptLabel === 'Облагаем')).toBe(true)
    expect(totals.some(r => r.currency === 'EUR' && r.taxExemptLabel === 'Облагаем')).toBe(true)
  })

  it('includes a BGN grand total row per group', () => {
    const rows = [makeSell({ currency: 'USD', taxable: true, totalLcl: 195.58 })]
    const totals = buildTradeTotals(rows, 'BGN')
    expect(totals.some(r => r.currency === 'BGN')).toBe(true)
  })

  it('marks all total rows with _total flag', () => {
    const rows = [makeSell()]
    const totals = buildTradeTotals(rows)
    expect(totals.every(r => r._total === true)).toBe(true)
  })

  it('sums proceeds, commission, fee and total correctly', () => {
    const rows = [
      makeSell({ currency: 'USD', taxable: true, proceeds: 100, commission: -2, fee: -1, total: 97 }),
      makeSell({ currency: 'USD', taxable: true, proceeds: 200, commission: -3, fee: -2, total: 195 }),
    ]
    const totals = buildTradeTotals(rows)
    const usdTotal = totals.find(r => r.currency === 'USD' && r.taxExemptLabel === 'Облагаем')
    expect(usdTotal.proceeds.toNumber()).toBeCloseTo(300)
    expect(usdTotal.commission.toNumber()).toBeCloseTo(-5)
    expect(usdTotal.total.toNumber()).toBeCloseTo(292)
  })

  it('handles exempt group separately', () => {
    const rows = [
      makeSell({ taxable: true,  totalLcl: 100 }),
      makeSell({ taxable: false, totalLcl: 200 }),
    ]
    const totals = buildTradeTotals(rows)
    const taxableTotal = totals.find(r => r.taxExemptLabel === 'Облагаем')
    const exemptTotal  = totals.find(r => r.taxExemptLabel === 'Освободен')
    expect(taxableTotal?.totalLcl.toNumber()).toBeCloseTo(100)
    expect(exemptTotal?.totalLcl.toNumber()).toBeCloseTo(200)
  })

  it('skips currency groups with no trades', () => {
    // Only USD trades — no EUR totals row should appear
    const rows = [makeSell({ currency: 'USD', taxable: true })]
    const totals = buildTradeTotals(rows)
    expect(totals.some(r => r.currency === 'EUR')).toBe(false)
  })
})

describe('buildTaxSummary', () => {
  it('returns sumTaxable and sumExempt summaries', () => {
    const result = buildTaxSummary([])
    expect(result).toHaveProperty('sumTaxable')
    expect(result).toHaveProperty('sumExempt')
  })

  it('returns Decimal zeros for empty input', () => {
    const { sumTaxable, sumExempt } = buildTaxSummary([])
    expect(sumTaxable.profits).toBeInstanceOf(Decimal)
    expect(sumTaxable.profits.toNumber()).toBe(0)
    expect(sumTaxable.losses.toNumber()).toBe(0)
    expect(sumExempt.profits.toNumber()).toBe(0)
  })

  it('calculates taxable sell profits in sumTaxable', () => {
    const rows = [
      makeSell({ taxable: true, totalLcl: 200, costBasisLcl: 150 }),
    ]
    const { sumTaxable } = buildTaxSummary(rows)
    expect(sumTaxable.profits.toNumber()).toBeCloseTo(50)
    expect(sumTaxable.losses.toNumber()).toBe(0)
  })

  it('calculates taxable sell losses in sumTaxable', () => {
    const rows = [
      makeSell({ taxable: true, totalLcl: 100, costBasisLcl: 150 }),
    ]
    const { sumTaxable } = buildTaxSummary(rows)
    expect(sumTaxable.profits.toNumber()).toBe(0)
    expect(sumTaxable.losses.toNumber()).toBeCloseTo(50)
  })

  it('puts exempt sells into sumExempt, not sumTaxable', () => {
    const rows = [
      makeSell({ taxable: false, totalLcl: 200, costBasisLcl: 150 }),
    ]
    const { sumTaxable, sumExempt } = buildTaxSummary(rows)
    expect(sumTaxable.profits.toNumber()).toBe(0)
    expect(sumExempt.profits.toNumber()).toBeCloseTo(50)
  })

  it('ignores BUY rows when calculating summaries', () => {
    const rows = [
      makeBuy({ totalLcl: -500 }),
    ]
    const { sumTaxable, sumExempt } = buildTaxSummary(rows)
    expect(sumTaxable.profits.toNumber()).toBe(0)
    expect(sumExempt.profits.toNumber()).toBe(0)
  })

  it('handles mixed profits and losses in the same group', () => {
    const rows = [
      makeSell({ taxable: true, totalLcl: 200, costBasisLcl: 150 }),
      makeSell({ taxable: true, totalLcl: 80,  costBasisLcl: 100 }),
    ]
    const { sumTaxable } = buildTaxSummary(rows)
    expect(sumTaxable.profits.toNumber()).toBeCloseTo(50)
    expect(sumTaxable.losses.toNumber()).toBeCloseTo(20)
  })

  it('calculates totalProceedsLcl and totalCostBasisLcl', () => {
    const rows = [
      makeSell({ taxable: true, totalLcl: 200, costBasisLcl: 150 }),
      makeSell({ taxable: true, totalLcl: 300, costBasisLcl: 200 }),
    ]
    const { sumTaxable } = buildTaxSummary(rows)
    expect(sumTaxable.totalProceedsLcl.toNumber()).toBeCloseTo(500)
    expect(sumTaxable.totalCostBasisLcl.toNumber()).toBeCloseTo(350)
  })
})
