import { toLocalCurrency } from '../fx/fxRates.js'
import Decimal from 'decimal.js'

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return new Decimal(0) }
}

export class InterestCalculator {
  constructor({ taxYear, localCurrencyCode, localCurrencyLabel }) {
    this.taxYear = taxYear
    this.localCurrencyCode = localCurrencyCode
    this.localCurrencyLabel = localCurrencyLabel
  }

  calculate({ interest = [] }) {
    const rows = this.#mapRows(interest)
    const enriched = this.#addTotals(rows)

    return {
      columns: this.#buildColumns(),
      rows: enriched,
    }
  }

  // -------------------------
  // PRIVATE
  // -------------------------

  #buildColumns() {
    return [
      { key: 'date',        label: 'Дата', mono: true },
      { key: 'currency',    label: 'Валута' },
      { key: 'description', label: 'Описание' },
      { key: 'amount',      label: 'Сума', align: 'right', mono: true, decimals: 2 },
      {
        key: 'amountLcl',
        label: `Сума (${this.localCurrencyLabel})`,
        align: 'right',
        mono: true,
        decimals: 2,
        nullAs: '—',
      },
    ]
  }

  #mapRows(interest) {
    return interest.map(r => {
      const amount = parseFloat(r.amount) || 0

      const amountLcl = toLocalCurrency(
        toD(amount),
        r.currency,
        r.date,
        this.taxYear
      )?.toNumber() ?? null

      return {
        ...r,
        amount,
        amountLcl,
      }
    })
  }

  #addTotals(rows) {
    const result = [...rows]

    // per currency totals
    for (const cur of ['EUR', 'USD']) {
      const subset = rows.filter(r => r.currency === cur)
      if (subset.length === 0) continue

      result.push({
        _total: true,
        currency: cur,
        description: 'Общо',
        amount: subset.reduce((s, r) => s + (r.amount ?? 0), 0),
        amountLcl: subset.reduce((s, r) => s + (r.amountLcl ?? 0), 0),
      })
    }

    // grand total (local currency)
    result.push({
      _total: true,
      currency: this.localCurrencyCode,
      description: 'Общо',
      amountLcl: rows.reduce((s, r) => s + (r.amountLcl ?? 0), 0),
    })

    return result
  }
}