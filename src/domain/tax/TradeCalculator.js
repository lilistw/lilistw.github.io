// TradeCalculator.js
import Decimal from 'decimal.js'
import { toLocalCurrency } from '../fx/fxRates.js'
import { IBKR_EXCHANGES } from '../constants.js'
import { isTaxable } from '../instrument/classifier.js'
import { parseToDecimal, D0 } from '../numStr.js'
import { createCostBasisStrategy } from './costBasis/createCostBasisStrategy.js'

function makeInstrument(trade, instrumentInfo) {
  const info = instrumentInfo[trade.symbol]
  const exch = IBKR_EXCHANGES[trade.exchange]
  return {
    name: info?.description ?? '',
    type: info?.type ?? '',
    securityId: info?.securityId ?? '',
    isRegulatedMarket: exch?.regulated ?? false,
  }
}

function summarizeSells(sells) {
  const profits = sells.reduce((s, r) => {
    const pl = r.proceedsLcl.minus(r.costBasisLcl ?? D0)
    return pl.gt(0) ? s.plus(pl) : s
  }, D0)

  const losses = sells.reduce((s, r) => {
    const pl = r.proceedsLcl.minus(r.costBasisLcl ?? D0)
    return pl.lt(0) ? s.plus(pl.abs()) : s
  }, D0)

  return {
    totalProceedsLcl: sells.reduce((s, r) => s.plus(r.proceedsLcl ?? D0), D0),
    totalCostBasisLcl: sells.reduce((s, r) => s.plus(r.costBasisLcl ?? D0), D0),
    profits,
    losses,
  }
}

export class TradeCalculator {
  constructor({ instrumentInfo, csvTradeBasis, context, strategy = 'ibkr' }) {
    this.instrumentInfo = instrumentInfo
    this.csvTradeBasis = csvTradeBasis
    this.ctx = context
    this.costBasisStrategy = createCostBasisStrategy(strategy, {
      csvTradeBasis,
      ctx: context,
      toLcl: (amount, currency, date) => this.#toLcl(amount, currency, date),
    })
  }

  calculate(trades, priorPositions = []) {
    const calculatedPositions = this.#initPositions(priorPositions)
    const sorted = this.#sortTrades(trades)

    const rows = sorted.map((t, i) =>
      this.#processTrade(t, calculatedPositions, i)
    )

    const rowsWithTotals = this.#addTotals(rows)

    const sells = rows.filter(r => r.side === 'SELL')

    return {
      trades: rowsWithTotals,
      calculatedPositions,
      taxSummary: {
        sumTaxable: summarizeSells(sells.filter(r => r.taxable === true)),
        sumExempt: summarizeSells(sells.filter(r => r.taxable === false)),
      }
    }
  }

  // -------------------------

  #sortTrades(trades) {
    return [...trades].sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
      return new Date(a.datetime) - new Date(b.datetime)
    })
  }

  #initPositions(priorPositions) {
    const map = {}

    for (const p of priorPositions) {
      if (!p.symbol) continue
      map[p.symbol] = {
        qty: new Decimal(p.qty),
        cost: new Decimal(p.costUSD),
        costLcl: new Decimal(p.costLcl),
      }
    }

    return map
  }

  #toLcl(amount, currency, date) {
    return toLocalCurrency(amount, currency, date, this.ctx.taxYear) ?? amount
  }

  #processTrade(t, positions, index) {
    if (!positions[t.symbol]) {
      positions[t.symbol] = { qty: D0, cost: D0, costLcl: D0 }
    }

    const pos = positions[t.symbol]

    const date = t.datetime.split(/[,\s]/)[0]
    const instr = makeInstrument(t, this.instrumentInfo)
    const exempt = t.side === 'SELL' && !isTaxable(instr)

    const proceedsD = parseToDecimal(t.proceeds) ?? D0
    const commD = parseToDecimal(t.commission) ?? D0
    const feeD = parseToDecimal(t.fee) ?? D0
    const qtyD = (parseToDecimal(t.quantity) ?? D0).abs()

    const totalD = proceedsD.plus(commD).plus(feeD)
    const totalLclD = this.#toLcl(totalD, t.currency, date)
    const rateD = this.#toLcl(new Decimal(1), t.currency, date)

    let costBasis = null
    let costBasisLcl = null

    if (t.side === 'BUY') {
      pos.qty = pos.qty.plus(qtyD)
      pos.cost = pos.cost.plus(totalD.neg())
      pos.costLcl = pos.costLcl.plus(totalLclD.neg())
    }

    if (t.side === 'SELL') {
      const { costBasis: cbResult, costBasisLcl: cbLclResult } =
        this.costBasisStrategy.computeSell({ pos, qtyD, date, currency: t.currency, symbol: t.symbol })

      costBasis    = cbResult
      costBasisLcl = cbLclResult

      if (!pos.qty.isZero()) {
        const cbD    = pos.cost.div(pos.qty).times(qtyD)
        const cbLclD = pos.costLcl.div(pos.qty).times(qtyD)
        pos.qty     = pos.qty.minus(qtyD)
        pos.cost    = pos.cost.minus(cbD)
        pos.costLcl = pos.costLcl.minus(cbLclD)
      }
    }

    const proceedsLcl = t.side === 'SELL' ? totalLclD : null

    const realizedPLLcl =
      proceedsLcl && costBasisLcl
        ? proceedsLcl.minus(costBasisLcl)
        : null

    return {
      index: index + 1,
      symbol: t.symbol,
      datetime: t.datetime,
      exchange: t.exchange,
      currency: t.currency,
      side: t.side,
      quantity: qtyD,
      price: parseToDecimal(t.price),

      proceeds: proceedsD,
      commission: commD,
      fee: feeD,

      total: totalD,
      totalLcl: totalLclD,
      rate: rateD,

      costBasis,
      costBasisLcl,

      proceedsLcl,
      realizedPLLcl,

      instrType: this.instrumentInfo[t.symbol]?.type,
      taxable: t.side === 'SELL' ? !exempt : null,

      securityId: this.instrumentInfo[t.symbol]?.securityId ?? null,
      description: this.instrumentInfo[t.symbol]?.description ?? '',
    }
  }

  #addTotals(rows) {
    const result = [...rows]

    const byCurrency = rows.reduce((acc, r) => {
      if (!acc[r.currency]) acc[r.currency] = []
      acc[r.currency].push(r)
      return acc
    }, {})

    for (const [currency, subset] of Object.entries(byCurrency)) {
      result.push({
        _total: true,
        currency,
        proceeds: subset.reduce((s, r) => s.plus(r.proceeds), D0),
        commission: subset.reduce((s, r) => s.plus(r.commission), D0),
        fee: subset.reduce((s, r) => s.plus(r.fee), D0),
        total: subset.reduce((s, r) => s.plus(r.total), D0),
        totalLcl: subset.reduce((s, r) => s.plus(r.totalLcl), D0),
      })
    }

    return result
  }
}