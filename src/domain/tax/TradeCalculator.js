import Decimal from 'decimal.js'
import { toLocalCurrency } from '../fx/fxRates.js'
import { IBKR_EXCHANGES } from '../constants.js'
import { isTaxable, getInstrumentTypeLabel } from '../instrument/classifier.js'
import { TRADE_COLUMNS } from '../../presentation/columns/tradeColumns.js'

const D0 = new Decimal(0)

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return D0 }
}

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
    const pl = new Decimal(r.proceedsLcl ?? 0).minus(r.costBasisLcl ?? 0)
    return pl.gt(0) ? s.plus(pl) : s
  }, D0).toNumber()

  const losses = sells.reduce((s, r) => {
    const pl = new Decimal(r.proceedsLcl ?? 0).minus(r.costBasisLcl ?? 0)
    return pl.lt(0) ? s.plus(pl.abs()) : s
  }, D0).toNumber()

  return {
    totalProceedsLcl: sells.reduce((s, r) => s.plus(r.proceedsLcl ?? 0), D0).toNumber(),
    totalCostBasisLcl: sells.reduce((s, r) => s.plus(r.costBasisLcl ?? 0), D0).toNumber(),
    profits,
    losses,
  }
}

export class TradeCalculator {
  constructor({ instrumentInfo, taxYear, csvTradeBasis, prevYearEndDate, localCurrencyLabel }) {
    this.instrumentInfo = instrumentInfo
    this.taxYear = taxYear
    this.csvTradeBasis = csvTradeBasis
    this.prevYearEndDate = prevYearEndDate
    this.lcl = localCurrencyLabel
  }

  calculate(trades, priorPositions = []) {
    const positions = this.#initPositions(priorPositions)

    const sortedTrades = this.#sortTrades(trades)

    const rows = sortedTrades.map((t, i) =>
      this.#processTrade(t, positions, i)
    )

    const rowsWithTotals = this.#addTotals(rows)

    const sells = rows.filter(r => r.side === 'SELL')

    return {
      trades: { columns: TRADE_COLUMNS(this.lcl), rows: rowsWithTotals },
      positions,
      app5: summarizeSells(sells.filter(r => r.taxable !== false)),
      app13: summarizeSells(sells.filter(r => r.taxable === false)),
    }
  }

  // -------------------------
  // PRIVATE
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
        qty: new Decimal(String(p.qty)),
        cost: new Decimal(String(p.costUSD)),
        costLcl: new Decimal(String(p.costLcl)),
      }
    }

    return map
  }

#toLcl(amount, currency, date) {
  const res = toLocalCurrency(amount, currency, date, this.taxYear)

  // force deterministic test behavior
  if (res == null) return amount

  return res
}

  #processTrade(t, positions, index) {
    if (!positions[t.symbol]) {
      positions[t.symbol] = { qty: D0, cost: D0, costLcl: D0 }
    }

    const pos = positions[t.symbol]

    const date = t.datetime.split(/[,\s]/)[0]
    const instr = makeInstrument(t, this.instrumentInfo)
    const exempt = t.side === 'SELL' && !isTaxable(instr)

    const proceedsD = toD(t.proceeds)
    const commD = toD(t.commission)
    const feeD = toD(t.fee)
    const qtyD = toD(t.quantity).abs()

    const totalD = proceedsD.plus(commD).plus(feeD)
    const totalLclD = this.#toLcl(totalD, t.currency, date)
    const rateD = this.#toLcl(new Decimal(1), t.currency, date) ?? new Decimal(1)

    let costBasis = null
    let costBasisLcl = null
    let costBasisLclApprox = false

    // BUY
    if (t.side === 'BUY') {
      pos.qty = pos.qty.plus(qtyD)
      pos.cost = pos.cost.plus(totalD.neg())
      pos.costLcl = pos.costLcl.plus((totalLclD ?? D0).neg())
    }

    // SELL
    if (t.side === 'SELL') {
      if (pos.qty.isZero()) {
        const csvBasisD = this.csvTradeBasis.get(
          `${t.symbol}|${date}|${qtyD.toFixed(0)}`
        )

        if (csvBasisD) {
          costBasis = csvBasisD.toNumber()
          costBasisLcl =
            this.#toLcl(csvBasisD, t.currency, this.prevYearEndDate)?.toNumber() ?? null
          costBasisLclApprox = true
        }
      } else {
        const cbD = pos.cost.div(pos.qty).times(qtyD)
        const cbLclD = pos.costLcl.div(pos.qty).times(qtyD)

        costBasis = cbD.toNumber()
        costBasisLcl = cbLclD.toNumber()

        pos.qty = pos.qty.minus(qtyD)
        pos.cost = pos.cost.minus(cbD)
        pos.costLcl = pos.costLcl.minus(cbLclD)
      }
    }

    const proceedsLcl =
      t.side === 'SELL' && totalLclD ? totalLclD.toNumber() : null

    const realizedPLLcl =
      proceedsLcl != null && costBasisLcl != null
        ? new Decimal(proceedsLcl).minus(costBasisLcl).toNumber()
        : null

    const instrType = getInstrumentTypeLabel(instr)

    return {
      '#': index + 1,
      symbol: t.symbol,
      datetime: t.datetime,
      settleDate: t.settleDate,
      exchange: t.exchange,
      currency: t.currency,
      side: t.side,
      price: t.price,
      orderType: t.orderType,
      code: t.code,
      date,
      quantityDisplay: qtyD.toString(),

      proceeds: proceedsD.toNumber(),
      commission: commD.toNumber(),
      fee: feeD.toNumber(),

      totalWithFee: totalD.toNumber(),
      totalWithFeeLcl: totalLclD?.toNumber() ?? null,
      rate: rateD?.toNumber() ?? null,

      costBasis,
      costBasisLcl,
      costBasisLclApprox,

      proceedsLcl,
      realizedPLLcl,

      instrType,
      taxable: t.side !== 'SELL' ? null : !exempt,
      taxExemptLabel: t.side !== 'SELL' ? '' : exempt ? 'Освободен' : 'Облагаем',

      securityId: this.instrumentInfo[t.symbol]?.securityId || null,
      description: this.instrumentInfo[t.symbol]?.description || '',
    }
  }

  #addTotals(rows) {
    const result = [...rows]

    const sumCols = ['proceeds', 'commission', 'fee', 'totalWithFee']
    const sumLclCols = ['totalWithFeeLcl']

    for (const cur of ['EUR', 'USD']) {
      const subset = rows.filter(r => r.currency === cur)
      if (!subset.length) continue

      const row = { _total: true, currency: cur }

      sumCols.forEach(k => {
        row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0)
      })

      sumLclCols.forEach(k => {
        row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0)
      })

      result.push(row)
    }

    return result
  }
}