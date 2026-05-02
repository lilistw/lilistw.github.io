// HoldingsCalculator.js
import { expandByAliases } from '../../../app/input/parser/parseInstruments.js'
import { buildOpenPositions } from '../../../app/input/parser/parseOpenPositions.js'
import { toDecimal, D0 } from '@util/numStr.js'

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

    return this.#buildHoldingsRows({
      holdingsRows: holdings.rows,
      positionsCostBasis,
      priorPositions,
      trades,
    })
  }

  // -------------------------

  #mapPositions(positions) {
    return expandByAliases(
      Object.fromEntries(
        Object.entries(positions).map(([sym, pos]) => [
          sym,
          {
            cost: pos.cost,
            qty: pos.qty,
            costLcl: pos.costLcl,
          },
        ])
      ),
      this.instrumentInfo
    )
  }

  #buildHoldingsRows({ holdingsRows, positionsCostBasis, priorPositions, trades }) {
    const lastBuyDate = this.#computeLastBuyDate(priorPositions, trades)
    const netBuyQty = this.#computeNetBuyQty(trades)

    const lastBuyDateExpanded = expandByAliases(lastBuyDate, this.instrumentInfo)
    const netBuyQtyExpanded = expandByAliases(netBuyQty, this.instrumentInfo)

    return holdingsRows.map(h =>
      this.#buildRow(
        h,
        positionsCostBasis,
        lastBuyDateExpanded,
        netBuyQtyExpanded
      )
    )
  }

  #buildRow(h, positionsCostBasis, lastBuyDateExpanded) {
    const info = this.instrumentInfo[h.symbol] || {}

    const acquDate = lastBuyDateExpanded[h.symbol] ?? null

    const costBasis = h.costBasis != null
      ? h.costBasis.toDecimalPlaces(2)
      : D0

    return {
      symbol: h.symbol,
      type: info.type,          // raw, not localized
      country: info.countryName || h.currency,
      description: info.description ?? '',
      quantity: h.quantity,
      acquDate,
      costBasis,
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
      const q = toDecimal(t.quantity)
      if (t.side === 'BUY')  net[t.symbol] = (net[t.symbol] ?? D0).plus(q)
      if (t.side === 'SELL') net[t.symbol] = (net[t.symbol] ?? D0).minus(q)
    }

    return net
  }
}
