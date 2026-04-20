// HoldingsCalculator.js
import { expandByAliases } from '../parser/parseInstruments.js'
import { buildOpenPositions } from '../parser/parseOpenPositions.js'

export class HoldingsCalculator {
  constructor({ instrumentInfo }) {
    this.instrumentInfo = instrumentInfo
  }

  calculate({ openPositions, positions, priorPositions = [], trades = [] }) {
    if (!openPositions?.length) {
      return {
        holdingsRows: [],
        app8Rows: [],
      }
    }

    const positionsCostBasis = this.#mapPositions(positions)

    const holdings = buildOpenPositions(
      openPositions,
      this.instrumentInfo,
      positionsCostBasis
    )

    const holdingsRows = this.#addTotals(holdings.rows)

    const app8Rows = this.#buildApp8Rows({
      holdingsRows: holdings.rows,
      positionsCostBasis,
      priorPositions,
      trades,
    })

    return app8Rows
  }

  // -------------------------

  #mapPositions(positions) {
    return expandByAliases(
      Object.fromEntries(
        Object.entries(positions).map(([sym, pos]) => [
          sym,
          {
            cost: pos.cost.toNumber(),
            qty: pos.qty.toNumber(),
            costLcl: pos.costLcl.toNumber(),
          },
        ])
      ),
      this.instrumentInfo
    )
  }

  #addTotals(rows) {
    const result = [...rows]
    const sumCols = ['quantity', 'costBasis', 'costPrice', 'value', 'unrealizedPL']

    const byCurrency = rows.reduce((acc, r) => {
      if (!acc[r.currency]) acc[r.currency] = []
      acc[r.currency].push(r)
      return acc
    }, {})

    for (const [currency, subset] of Object.entries(byCurrency)) {
      const row = { _total: true, currency }

      sumCols.forEach(k => {
        row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0)
      })

      result.push(row)
    }

    return result
  }

  #buildApp8Rows({ holdingsRows, positionsCostBasis, priorPositions, trades }) {
    const lastBuyDate = this.#computeLastBuyDate(priorPositions, trades)
    const netBuyQty = this.#computeNetBuyQty(trades)

    const lastBuyDateExpanded = expandByAliases(lastBuyDate, this.instrumentInfo)
    const netBuyQtyExpanded = expandByAliases(netBuyQty, this.instrumentInfo)

    return holdingsRows.map(h =>
      this.#buildApp8Row(
        h,
        positionsCostBasis,
        lastBuyDateExpanded,
        netBuyQtyExpanded
      )
    )
  }

  #buildApp8Row(h, positionsCostBasis, lastBuyDateExpanded) {
    const info = this.instrumentInfo[h.symbol] || {}

    const acquDate = lastBuyDateExpanded[h.symbol] ?? null

    const costPerShare = h.quantity ? h.costBasis / h.quantity : 0
    const cost = Math.round(h.quantity * costPerShare * 100) / 100

    return {
      symbol: h.symbol,
      type: info.type,          // raw, not localized
      country: info.countryName || h.currency,
      description: info.description ?? '',
      quantity: h.quantity,
      acquDate,
      costBasis: cost,
      currency: h.currency,
      costLcl: positionsCostBasis[h.symbol]?.costLcl ?? null,
    }
  }

  #computeLastBuyDate(priorPositions, trades) {
    const lastBuyDate = {}

    for (const p of priorPositions) {
      if (p.symbol && p.lastBuyDate) {
        lastBuyDate[p.symbol] = p.lastBuyDate
      }
    }

    for (const t of trades) {
      if (t.side !== 'BUY') continue

      const date = t.datetime.split(/[,\s]/)[0]

      if (!lastBuyDate[t.symbol] || date > lastBuyDate[t.symbol]) {
        lastBuyDate[t.symbol] = date
      }
    }

    return lastBuyDate
  }

  #computeNetBuyQty(trades) {
    const net = {}

    for (const t of trades) {
      const q = Number(t.quantity) || 0

      if (t.side === 'BUY') net[t.symbol] = (net[t.symbol] ?? 0) + q
      if (t.side === 'SELL') net[t.symbol] = (net[t.symbol] ?? 0) - q
    }

    return net
  }
}