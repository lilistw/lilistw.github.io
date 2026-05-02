// InterestCalculator.js
import { toLocalCurrency } from '../fx/fxRates.js'
import { toDecimal, D0 } from '@util/numStr.js'

export class InterestCalculator {
  constructor({ taxContext }) {
    this.ctx = taxContext
  }

  calculate({ interest = [] }) {
    const rows = this.#mapRows(interest)
    return this.#addTotals(rows)
  }

  // -------------------------
  // PRIVATE
  // -------------------------

  #mapRows(interest) {
    return interest.map(r => {
      const amount = toDecimal(r.amount)

      const amountLcl =
        toLocalCurrency(
          amount,
          r.currency,
          r.date,
          this.ctx.taxYear
        ) ?? D0

      return {
        ...r,
        amount,
        amountLcl,
      }
    })
  }

  #addTotals(rows) {
    const result = [...rows]

    // group by currency dynamically (not hardcoded EUR/USD)
    const byCurrency = rows.reduce((acc, r) => {
      const cur = r.currency || 'UNKNOWN'
      if (!acc[cur]) acc[cur] = []
      acc[cur].push(r)
      return acc
    }, {})

    for (const [currency, subset] of Object.entries(byCurrency)) {
      result.push({
        _total: true,
        currency,
        amount: subset.reduce((s, r) => s.plus(r.amount), D0),
        amountLcl: subset.reduce((s, r) => s.plus(r.amountLcl), D0),
      })
    }

    // grand total (local currency)
    result.push({
      _total: true,
      currency: this.ctx.localCurrencyCode,
      amountLcl: rows.reduce((s, r) => s.plus(r.amountLcl), D0),
    })

    return result
  }
}
