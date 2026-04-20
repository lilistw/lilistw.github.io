// InterestCalculator.js
import { toLocalCurrency } from '../fx/fxRates.js'
import Decimal from 'decimal.js'

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return new Decimal(0) }
}

export class InterestCalculator {
  constructor({ context }) {
    this.ctx = context
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
      const amount = toD(r.amount)

      const amountLcl =
        toLocalCurrency(
          amount,
          r.currency,
          r.date,
          this.ctx.taxYear
        ) ?? new Decimal(0)

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
        amount: subset.reduce((s, r) => s.plus(r.amount), new Decimal(0)),
        amountLcl: subset.reduce((s, r) => s.plus(r.amountLcl), new Decimal(0)),
      })
    }

    // grand total (local currency)
    result.push({
      _total: true,
      currency: this.ctx.localCurrencyCode,
      amountLcl: rows.reduce((s, r) => s.plus(r.amountLcl), new Decimal(0)),
    })

    return result
  }
}