import { expandByAliases } from '../parser/parseInstruments.js'
import { buildOpenPositions } from '../parser/parseOpenPositions.js'

export class HoldingsCalculator {
  constructor({ instrumentInfo, lcl }) {
    this.instrumentInfo = instrumentInfo
    this.lcl = lcl
  }

calculate({ openPositions, positions, priorPositions = [], trades = [] }) {
  if (!openPositions || openPositions.length === 0) {
    return {
      holdings: { columns: [], rows: [] },
      app8Holdings: { columns: [], rows: [] },
    }
  }

  const positionsCostBasis = this.#mapPositions(positions)

  const holdings = buildOpenPositions(
    openPositions,
    this.instrumentInfo,
    positionsCostBasis
  )

  const enrichedRows = this.#addTotals(holdings.rows)

  const app8Holdings = this.#buildApp8Holdings({
    holdingsRows: holdings.rows,
    positionsCostBasis,
    priorPositions,
    trades,
  })

  return {
    holdings: {
      columns: holdings.columns,
      rows: enrichedRows,
    },
    app8Holdings,
  }
}

  // -------------------------
  // PRIVATE
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

    for (const cur of ['EUR', 'USD']) {
      const subset = rows.filter(r => r.currency === cur)
      if (!subset.length) continue

      const row = { _total: true, currency: cur }

      sumCols.forEach(k => {
        row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0)
      })

      result.push(row)
    }

    return result
  }

  #buildApp8Holdings({ holdingsRows, positionsCostBasis, priorPositions, trades }) {
    const lastBuyDate = this.#computeLastBuyDate(priorPositions, trades)
    const netBuyQty = this.#computeNetBuyQty(trades)

    const lastBuyDateExpanded = expandByAliases(lastBuyDate, this.instrumentInfo)
    const netBuyQtyExpanded = expandByAliases(netBuyQty, this.instrumentInfo)

    return {
      columns: [
        { key: 'symbol', label: 'Символ', bold: true, tooltip: 'description' },
        { key: 'type', label: 'Вид', bold: true },
        { key: 'country', label: 'Държава' },
        { key: 'quantity', label: 'Брой', align: 'right', mono: true, decimals: 0 },
        {
          key: 'acquDate',
          label: 'Дата и година на придобиване',
          shortLabel: 'Дата',
          mono: true,
          maxWidth: 80,
        },
        {
          key: 'costBasis',
          label: 'Обща цена в съответната валута',
          shortLabel: 'Обща цена',
          align: 'right',
          mono: true,
          decimals: 2,
        },
        { key: 'currency', label: 'Валута' },
        {
          key: 'costLcl',
          label: `Обща цена в ${this.lcl}`,
          align: 'right',
          mono: true,
          decimals: 2,
          nullAs: '—',
        },
      ],
      rows: holdingsRows
        .map(h => this.#buildApp8Row(h, positionsCostBasis, lastBuyDateExpanded, netBuyQtyExpanded))
        .sort((a, b) => (a.type === b.type ? 0 : a.type === 'Акции' ? -1 : 1)),
    }
  }

  #buildApp8Row(h, positionsCostBasis, lastBuyDateExpanded, netBuyQtyExpanded) {
    const info = this.instrumentInfo[h.symbol] || {}

    const type = info.type === 'ETF' ? 'Дялове' : 'Акции'
    const country = info.countryName || h.currency
    const description = info.description ?? ''

    const acquDate = lastBuyDateExpanded[h.symbol]
      ? lastBuyDateExpanded[h.symbol].split('-').reverse().join('.')
      : null

    const costPerShare = h.quantity ? h.costBasis / h.quantity : 0

    const cost = Math.round(h.quantity * costPerShare * 100) / 100

    return {
      symbol: h.symbol,
      type,
      country,
      description,
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