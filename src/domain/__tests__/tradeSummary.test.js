import { describe, it, expect } from 'vitest'
import { buildTradeTotals, buildTaxSummary } from '../tradeSummary.js'

function makeSell(fields = {}) {
  return {
    side:            'SELL',
    currency:        fields.currency        ?? 'USD',
    taxable:         fields.taxable         ?? true,
    taxExemptLabel:  fields.taxExemptLabel  ?? 'Облагаем',
    proceeds:        fields.proceeds        ?? 100,
    commission:      fields.commission      ?? -2,
    fee:             fields.fee             ?? 0,
    totalWithFee:    fields.totalWithFee    ?? 98,
    totalWithFeeBGN: fields.totalWithFeeBGN ?? 191.67,
    costBasisBGN:    fields.costBasisBGN    ?? 176.03,
  }
}

function makeBuy(fields = {}) {
  return {
    side:            'BUY',
    currency:        fields.currency        ?? 'USD',
    taxable:         null,
    taxExemptLabel:  '',
    proceeds:        fields.proceeds        ?? -100,
    commission:      fields.commission      ?? -2,
    fee:             fields.fee             ?? 0,
    totalWithFee:    fields.totalWithFee    ?? -102,
    totalWithFeeBGN: fields.totalWithFeeBGN ?? -199.49,
    costBasisBGN:    fields.costBasisBGN    ?? null,
  }
}

describe('buildTradeTotals', () => {
  it('returns empty array for empty input', () => {
    expect(buildTradeTotals([])).toEqual([])
  })

  it('builds total rows grouped by taxExemptLabel and currency', () => {
    const rows = [
      makeSell({ currency: 'USD', taxExemptLabel: 'Облагаем', totalWithFee: 100, totalWithFeeBGN: 195.58 }),
      makeSell({ currency: 'EUR', taxExemptLabel: 'Облагаем', totalWithFee: 200, totalWithFeeBGN: 391.17 }),
    ]
    const totals = buildTradeTotals(rows)
    expect(totals.some(r => r.currency === 'USD' && r.taxExemptLabel === 'Облагаем')).toBe(true)
    expect(totals.some(r => r.currency === 'EUR' && r.taxExemptLabel === 'Облагаем')).toBe(true)
  })

  it('includes a BGN grand total row per group', () => {
    const rows = [makeSell({ currency: 'USD', taxExemptLabel: 'Облагаем', totalWithFeeBGN: 195.58 })]
    const totals = buildTradeTotals(rows, 'BGN')
    expect(totals.some(r => r.currency === 'BGN')).toBe(true)
  })

  it('marks all total rows with _total flag', () => {
    const rows = [makeSell()]
    const totals = buildTradeTotals(rows)
    expect(totals.every(r => r._total === true)).toBe(true)
  })

  it('sums proceeds, commission, fee and totalWithFee correctly', () => {
    const rows = [
      makeSell({ currency: 'USD', taxExemptLabel: 'Облагаем', proceeds: 100, commission: -2, fee: -1, totalWithFee: 97 }),
      makeSell({ currency: 'USD', taxExemptLabel: 'Облагаем', proceeds: 200, commission: -3, fee: -2, totalWithFee: 195 }),
    ]
    const totals = buildTradeTotals(rows)
    const usdTotal = totals.find(r => r.currency === 'USD' && r.taxExemptLabel === 'Облагаем')
    expect(usdTotal.proceeds).toBeCloseTo(300)
    expect(usdTotal.commission).toBeCloseTo(-5)
    expect(usdTotal.totalWithFee).toBeCloseTo(292)
  })

  it('handles Освободен (exempt) group separately', () => {
    const rows = [
      makeSell({ taxExemptLabel: 'Облагаем', totalWithFeeBGN: 100 }),
      makeSell({ taxExemptLabel: 'Освободен', totalWithFeeBGN: 200 }),
    ]
    const totals = buildTradeTotals(rows)
    const taxableTotal = totals.find(r => r.taxExemptLabel === 'Облагаем' && r.currency === 'BGN')
    const exemptTotal  = totals.find(r => r.taxExemptLabel === 'Освободен' && r.currency === 'BGN')
    expect(taxableTotal?.totalWithFeeBGN).toBeCloseTo(100)
    expect(exemptTotal?.totalWithFeeBGN).toBeCloseTo(200)
  })

  it('skips currency groups with no trades', () => {
    // Only USD trades — no EUR totals row should appear
    const rows = [makeSell({ currency: 'USD', taxExemptLabel: 'Облагаем' })]
    const totals = buildTradeTotals(rows)
    expect(totals.some(r => r.currency === 'EUR')).toBe(false)
  })
})

describe('buildTaxSummary', () => {
  it('returns app5 and app13 summaries', () => {
    const result = buildTaxSummary([])
    expect(result).toHaveProperty('app5')
    expect(result).toHaveProperty('app13')
  })

  it('returns zeros for empty input', () => {
    const { app5, app13 } = buildTaxSummary([])
    expect(app5.profits).toBe(0)
    expect(app5.losses).toBe(0)
    expect(app13.profits).toBe(0)
  })

  it('calculates taxable sell profits in app5', () => {
    const rows = [
      makeSell({ taxable: true, totalWithFeeBGN: 200, costBasisBGN: 150 }),
    ]
    const { app5 } = buildTaxSummary(rows)
    expect(app5.profits).toBeCloseTo(50)
    expect(app5.losses).toBe(0)
  })

  it('calculates taxable sell losses in app5', () => {
    const rows = [
      makeSell({ taxable: true, totalWithFeeBGN: 100, costBasisBGN: 150 }),
    ]
    const { app5 } = buildTaxSummary(rows)
    expect(app5.profits).toBe(0)
    expect(app5.losses).toBeCloseTo(50)
  })

  it('puts exempt sells into app13, not app5', () => {
    const rows = [
      makeSell({ taxable: false, totalWithFeeBGN: 200, costBasisBGN: 150 }),
    ]
    const { app5, app13 } = buildTaxSummary(rows)
    expect(app5.profits).toBe(0)
    expect(app13.profits).toBeCloseTo(50)
  })

  it('ignores BUY rows when calculating summaries', () => {
    const rows = [
      makeBuy({ totalWithFeeBGN: -500, costBasisBGN: null }),
    ]
    const { app5, app13 } = buildTaxSummary(rows)
    expect(app5.profits).toBe(0)
    expect(app13.profits).toBe(0)
  })

  it('handles mixed profits and losses in the same group', () => {
    const rows = [
      makeSell({ taxable: true, totalWithFeeBGN: 200, costBasisBGN: 150 }),
      makeSell({ taxable: true, totalWithFeeBGN: 80,  costBasisBGN: 100 }),
    ]
    const { app5 } = buildTaxSummary(rows)
    expect(app5.profits).toBeCloseTo(50)
    expect(app5.losses).toBeCloseTo(20)
  })

  it('calculates totalProceedsBGN and totalCostBasisBGN', () => {
    const rows = [
      makeSell({ taxable: true, totalWithFeeBGN: 200, costBasisBGN: 150 }),
      makeSell({ taxable: true, totalWithFeeBGN: 300, costBasisBGN: 200 }),
    ]
    const { app5 } = buildTaxSummary(rows)
    expect(app5.totalProceedsBGN).toBeCloseTo(500)
    expect(app5.totalCostBasisBGN).toBeCloseTo(350)
  })
})
