import Decimal from 'decimal.js'
import {
  toLocalCurrency, getPrevYearEndDate,
} from '../domain/fx/fxRates.js'
import { buildInstrumentInfo } from '../domain/parser/parseInstruments.js'
import { buildCsvTradeBasis } from '../domain/parser/parseCsvTrades.js'
import { parseTaxYear } from '../domain/parser/parseTaxYear.js'

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
 * @param {{ trades, openPositions, csvTrades, instruments, period }} param0
 *   trades        – raw array from parseTradesFromHtml (string fields, side/commission/datetime)
 *   openPositions – raw array from parseOpenPositions (string fields)
 *   csvTrades     – raw array from parseCsvTrades
 *   instruments   – raw array from parseInstruments
 *   period        – period string e.g. "January 1, 2025 - December 31, 2025"
 *
 * @returns {Array<{ symbol, currency, qty, costUSD, costLcl, lastBuyDate }>}
 */
export function inferPriorPositions({ trades, openPositions, csvTrades, instruments = [], period }) {
  const taxYear            = parseTaxYear(period)
  const instrumentInfo     = buildInstrumentInfo(instruments)
  const csvTradeBasis      = buildCsvTradeBasis(csvTrades)
  const prevYearEndDate    = getPrevYearEndDate(taxYear)

  // Aggregate per-symbol: qty bought/sold, cost of buys (positive), basis of sells (positive)
  const bySymbol = {}

  for (const t of trades) {
    if (!t.symbol || !t.side) continue

    const qtyD      = toD(t.quantity).abs()
    const proceedsD = toD(t.proceeds)
    const commD     = toD(t.commission)
    const feeD      = toD(t.fee)
    const date      = (t.datetime || '').split(/[,\s]/)[0]
    // For BUY: proceeds is negative (cash out), totalWithFee is negative → neg() = cost paid
    const totalWithFeeD = proceedsD.plus(commD).plus(feeD)

    if (!bySymbol[t.symbol]) {
      bySymbol[t.symbol] = {
        currency:     t.currency,
        buyQty:       D0,
        buyCostUSD:   D0,
        sellQty:      D0,
        sellBasisUSD: D0,
        lastBuyDate:  null,
      }
    }
    const sym = bySymbol[t.symbol]

    if (t.side === 'BUY') {
      sym.buyQty     = sym.buyQty.plus(qtyD)
      sym.buyCostUSD = sym.buyCostUSD.plus(totalWithFeeD.neg())  // positive
      if (!sym.lastBuyDate || date > sym.lastBuyDate) sym.lastBuyDate = date
    }

    if (t.side === 'SELL') {
      sym.sellQty = sym.sellQty.plus(qtyD)
      const csvKey = `${t.symbol}|${date}|${qtyD.toFixed(0)}`
      const basisD = csvTradeBasis.get(csvKey)  // already positive from buildCsvTradeBasis
      if (basisD) sym.sellBasisUSD = sym.sellBasisUSD.plus(basisD)
    }
  }

  const result = []

  // Symbols still open at year-end
  for (const h of openPositions) {
    if (!h.symbol || !parseFloat(h.quantity)) continue

    const aliases = instrumentInfo[h.symbol]?.aliases ?? []
    const sym = bySymbol[h.symbol]
      ?? aliases.map(a => bySymbol[a]).find(Boolean)
      ?? { currency: h.currency, buyQty: D0, buyCostUSD: D0, sellQty: D0, sellBasisUSD: D0, lastBuyDate: null }

    const openQtyD  = toD(h.quantity)
    const openCostD = toD(h.costBasis)

    const priorQtyD = openQtyD.plus(sym.sellQty).minus(sym.buyQty)
    if (priorQtyD.lte(0)) continue  // all shares were bought in current year

    const priorCostD   = openCostD.plus(sym.sellBasisUSD).minus(sym.buyCostUSD)
    const priorCostLcl = toLocalCurrency(priorCostD, h.currency, prevYearEndDate, taxYear)

    result.push({
      symbol:      h.symbol,
      currency:    h.currency,
      qty:         priorQtyD.toNumber(),
      costUSD:     priorCostD.toNumber(),
      costLcl:     priorCostLcl ? priorCostLcl.toNumber() : null,
      lastBuyDate: prevYearEndDate,
    })
  }

  // Symbols fully sold this year (not in open positions)
  for (const [symbol, sym] of Object.entries(bySymbol)) {
    const symAliases = new Set([symbol, ...(instrumentInfo[symbol]?.aliases ?? [])])
    if (openPositions.some(h => symAliases.has(h.symbol))) continue
    if (sym.sellQty.lte(0)) continue

    const priorQtyD = sym.sellQty.minus(sym.buyQty)
    if (priorQtyD.lte(0)) continue

    const priorCostD = sym.sellBasisUSD.minus(sym.buyCostUSD)
    if (priorCostD.lte(0)) continue

    const priorCostLcl = toLocalCurrency(priorCostD, sym.currency, prevYearEndDate, taxYear)

    result.push({
      symbol,
      currency:    sym.currency,
      qty:         priorQtyD.toNumber(),
      costUSD:     priorCostD.toNumber(),
      costLcl:     priorCostLcl ? priorCostLcl.toNumber() : null,
      lastBuyDate: prevYearEndDate,
    })
  }

  return result.sort((a, b) => a.symbol.localeCompare(b.symbol))
}
