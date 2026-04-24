export class IbkrCostBasisStrategy {
  constructor({ csvTradeBasis, ctx, toLcl }) {
    this.csvTradeBasis = csvTradeBasis
    this.ctx = ctx
    this.toLcl = toLcl
  }

  computeSell({ pos, qtyD, date, currency, symbol }) {
    const csvBasisD = this.csvTradeBasis.get(`${symbol}|${date}|${qtyD.toFixed(0)}`)

    // prior-year only position: same as weighted-average fallback
    if (pos.qty.isZero()) {
      if (!csvBasisD) return { costBasis: null, costBasisLcl: null }
      return {
        costBasis:    csvBasisD,
        costBasisLcl: this.toLcl(csvBasisD, currency, this.ctx.prevYearEndDate),
      }
    }

    // CSV basis absent: fall back to weighted-average silently
    if (!csvBasisD) {
      return {
        costBasis:    pos.cost.div(pos.qty).times(qtyD),
        costBasisLcl: pos.costLcl.div(pos.qty).times(qtyD),
      }
    }

    // IBKR: original currency from CSV; LCL via position's weighted BNB rate
    const costBasisLcl = pos.cost.gt(0)
      ? csvBasisD.times(pos.costLcl.div(pos.cost))
      : this.toLcl(csvBasisD, currency, this.ctx.prevYearEndDate)

    return { costBasis: csvBasisD, costBasisLcl }
  }
}
