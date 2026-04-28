export class WeightedAverageCostBasisStrategy {
  constructor({ csvTradeBasis, ctx, toLcl }) {
    this.csvTradeBasis = csvTradeBasis
    this.ctx = ctx
    this.toLcl = toLcl
  }

  computeSell({ pos, qtyD, date, currency, symbol }) {
    if (pos.qty.isZero()) {
      const csvBasisD = this.csvTradeBasis.get(`${symbol}|${date}|${qtyD.toFixed(0)}`)
      if (!csvBasisD) return { costBasis: null, costBasisLcl: null }
      return {
        costBasis: csvBasisD,
        costBasisLcl: this.toLcl(csvBasisD, currency, this.ctx.prevYearEndDate),
      }
    }
    return {
      costBasis:    pos.cost.div(pos.qty).times(qtyD),
      costBasisLcl: pos.costLcl.div(pos.qty).times(qtyD),
    }
  }
}
