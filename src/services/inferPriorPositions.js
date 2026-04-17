import Decimal from 'decimal.js'
import { toBGN, PREV_YEAR_END_DATE, PREV_YEAR_DEFAULT_ACQ_DATE } from '../domain/fx/fxRates.js'

const D0 = new Decimal(0)

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return D0 }
}

/**
 * Infer prior-year open positions from current-year trade data.
 *
 * For each symbol where shares must have been held before the current tax year:
 *   priorQty     = openQty + sellQty - buyQty
 *   priorCostUSD = openCostUSD + sellBasisUSD - buyCostUSD
 *
 * @param {{ htmlTrades, openPositions, csvTradeBasis }} param0
 *   htmlTrades     – rows from parseTradesFromHtml (quantity as Decimal, type, symbol, currency,
 *                    proceeds, comm, fee as Decimal)
 *   openPositions  – rows from parseOpenPositions (IBKR year-end data; quantity and costBasis as
 *                    plain numbers parsed directly from CSV with no calculated override)
 *   csvTradeBasis  – Map<string, Decimal> from parseCsvTradeBasis
 *
 * @returns {Array<{ symbol, currency, qty, costUSD, costBGN, lastBuyDate }>}
 */
export function inferPriorPositions({ htmlTrades, openPositions, csvTradeBasis }) {
  // Aggregate per-symbol: qty bought/sold, cost of buys (positive), basis of sells (positive)
  const bySymbol = {}

  for (const t of htmlTrades) {
    if (!t.symbol || !t.type) continue

    const qtyD      = toD(t.quantity)
    const proceedsD = toD(t.proceeds)
    const commD     = toD(t.comm)
    const feeD      = toD(t.fee)
    // For BUY: proceeds is negative (cash out), totalWithFee is negative → neg() = cost paid
    const totalWithFeeD = proceedsD.plus(commD).plus(feeD)

    if (!bySymbol[t.symbol]) {
      bySymbol[t.symbol] = {
        currency: t.currency,
        buyQty:      D0,
        buyCostUSD:  D0,
        sellQty:     D0,
        sellBasisUSD: D0,
        lastBuyDate: null,
      }
    }
    const sym = bySymbol[t.symbol]

    if (t.type === 'BUY') {
      sym.buyQty     = sym.buyQty.plus(qtyD)
      sym.buyCostUSD = sym.buyCostUSD.plus(totalWithFeeD.neg())  // positive
      if (!sym.lastBuyDate || t.date > sym.lastBuyDate) sym.lastBuyDate = t.date
    }

    if (t.type === 'SELL') {
      sym.sellQty = sym.sellQty.plus(qtyD)
      const csvKey = `${t.symbol}|${t.date}|${qtyD.toFixed(0)}`
      const basisD = csvTradeBasis.get(csvKey)  // already positive from parseCsvTradeBasis
      if (basisD) sym.sellBasisUSD = sym.sellBasisUSD.plus(basisD)
    }
  }

  const result = []

  // Symbols still open at year-end
  for (const h of openPositions) {
    if (!h.symbol || !(h.quantity > 0)) continue

    const sym = bySymbol[h.symbol] ?? {
      currency: h.currency, buyQty: D0, buyCostUSD: D0,
      sellQty: D0, sellBasisUSD: D0, lastBuyDate: null,
    }

    const openQtyD  = toD(h.quantity)
    const openCostD = toD(h.costBasis)

    const priorQtyD = openQtyD.plus(sym.sellQty).minus(sym.buyQty)
    if (priorQtyD.lte(0)) continue  // all shares were bought in current year

    const priorCostD   = openCostD.plus(sym.sellBasisUSD).minus(sym.buyCostUSD)
    const priorCostBGN = toBGN(priorCostD, h.currency, PREV_YEAR_END_DATE)

    result.push({
      symbol:      h.symbol,
      currency:    h.currency,
      qty:         priorQtyD.toNumber(),
      costUSD:     priorCostD.toNumber(),
      costBGN:     priorCostBGN ? priorCostBGN.toNumber() : null,
      lastBuyDate: PREV_YEAR_DEFAULT_ACQ_DATE,
    })
  }

  // Symbols fully sold this year (not in open positions)
  for (const [symbol, sym] of Object.entries(bySymbol)) {
    if (openPositions.some(h => h.symbol === symbol)) continue
    if (sym.sellQty.lte(0)) continue

    const priorQtyD = sym.sellQty.minus(sym.buyQty)
    if (priorQtyD.lte(0)) continue

    const priorCostD   = sym.sellBasisUSD.minus(sym.buyCostUSD)
    if (priorCostD.lte(0)) continue

    const priorCostBGN = toBGN(priorCostD, sym.currency, PREV_YEAR_END_DATE)

    result.push({
      symbol,
      currency:    sym.currency,
      qty:         priorQtyD.toNumber(),
      costUSD:     priorCostD.toNumber(),
      costBGN:     priorCostBGN ? priorCostBGN.toNumber() : null,
      lastBuyDate: PREV_YEAR_DEFAULT_ACQ_DATE,
    })
  }

  return result.sort((a, b) => a.symbol.localeCompare(b.symbol))
}
