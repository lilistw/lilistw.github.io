import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { WeightedAverageCostBasisStrategy } from './WeightedAverageCostBasisStrategy.js'
import { IbkrCostBasisStrategy } from './IbkrCostBasisStrategy.js'

const ctx = { prevYearEndDate: '2024-12-30' }

// simple toLcl: 2× the amount (USD→BGN placeholder)
const toLcl = (amount) => amount.times(2)

function makePos(qty, cost, costLcl) {
  return {
    qty:     new Decimal(qty),
    cost:    new Decimal(cost),
    costLcl: new Decimal(costLcl),
  }
}

function makeBasis(map) {
  return new Map(Object.entries(map))
}

describe('WeightedAverageCostBasisStrategy', () => {
  it('returns weighted-average cost when pos has qty', () => {
    const s = new WeightedAverageCostBasisStrategy({
      csvTradeBasis: makeBasis({}),
      ctx,
      toLcl,
    })
    const pos = makePos(10, 1000, 1950)
    const { costBasis, costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    expect(costBasis.toNumber()).toBeCloseTo(500)
    expect(costBasisLcl.toNumber()).toBeCloseTo(975)
  })

  it('falls back to CSV basis when pos.qty is zero', () => {
    const s = new WeightedAverageCostBasisStrategy({
      csvTradeBasis: makeBasis({ 'AAPL|2025-03-01|5': new Decimal(480) }),
      ctx,
      toLcl,
    })
    const pos = makePos(0, 0, 0)
    const { costBasis, costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    expect(costBasis.toNumber()).toBe(480)
    expect(costBasisLcl.toNumber()).toBe(960) // toLcl doubles it
  })

  it('returns null when pos.qty is zero and no CSV basis', () => {
    const s = new WeightedAverageCostBasisStrategy({
      csvTradeBasis: makeBasis({}),
      ctx,
      toLcl,
    })
    const pos = makePos(0, 0, 0)
    const { costBasis, costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    expect(costBasis).toBeNull()
    expect(costBasisLcl).toBeNull()
  })
})

describe('IbkrCostBasisStrategy', () => {
  it('uses CSV basis for original currency when pos has qty', () => {
    const s = new IbkrCostBasisStrategy({
      csvTradeBasis: makeBasis({ 'AAPL|2025-03-01|5': new Decimal(480) }),
      ctx,
      toLcl,
    })
    const pos = makePos(10, 1000, 1950)
    const { costBasis } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    // IBKR: original currency = CSV value, not weighted-average (500)
    expect(costBasis.toNumber()).toBe(480)
  })

  it('derives LCL via position weighted BNB rate', () => {
    const s = new IbkrCostBasisStrategy({
      csvTradeBasis: makeBasis({ 'AAPL|2025-03-01|5': new Decimal(480) }),
      ctx,
      toLcl,
    })
    // pos: 1000 USD cost, 1950 LCL → rate = 1.95
    const pos = makePos(10, 1000, 1950)
    const { costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    // 480 × (1950 / 1000) = 480 × 1.95 = 936
    expect(costBasisLcl.toNumber()).toBeCloseTo(936)
  })

  it('falls back to weighted-average when CSV basis is missing', () => {
    const s = new IbkrCostBasisStrategy({
      csvTradeBasis: makeBasis({}),
      ctx,
      toLcl,
    })
    const pos = makePos(10, 1000, 1950)
    const { costBasis, costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    expect(costBasis.toNumber()).toBeCloseTo(500)
    expect(costBasisLcl.toNumber()).toBeCloseTo(975)
  })

  it('prior-year only position: same result as weighted-average', () => {
    const csvBasis = makeBasis({ 'AAPL|2025-03-01|5': new Decimal(480) })
    const wa = new WeightedAverageCostBasisStrategy({ csvTradeBasis: csvBasis, ctx, toLcl })
    const ib = new IbkrCostBasisStrategy({ csvTradeBasis: csvBasis, ctx, toLcl })
    const pos = makePos(0, 0, 0)
    const args = { pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL' }

    const waResult = wa.computeSell(args)
    const ibResult = ib.computeSell(args)

    expect(ibResult.costBasis.toNumber()).toBe(waResult.costBasis.toNumber())
    expect(ibResult.costBasisLcl.toNumber()).toBe(waResult.costBasisLcl.toNumber())
  })

  it('falls back to toLcl when pos.cost is zero (no prior position entered)', () => {
    const s = new IbkrCostBasisStrategy({
      csvTradeBasis: makeBasis({ 'AAPL|2025-03-01|5': new Decimal(480) }),
      ctx,
      toLcl,
    })
    // pos.qty > 0 but pos.cost = 0 (shouldn't normally happen; defensive path)
    const pos = makePos(5, 0, 0)
    const { costBasisLcl } = s.computeSell({
      pos, qtyD: new Decimal(5), date: '2025-03-01', currency: 'USD', symbol: 'AAPL',
    })
    expect(costBasisLcl.toNumber()).toBe(960) // toLcl doubles 480
  })
})
