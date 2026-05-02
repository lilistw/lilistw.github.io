/**
 * Reactive trade summaries — recomputed whenever the user toggles taxable status.
 * Both functions are pure and operate on the current trade data rows from App state.
 */
import { D0 } from '@util/numStr.js'

const TRADE_SUM_COLS     = ['proceeds', 'commission', 'fee', 'total']
const TRADE_SUM_LCL_COLS = ['totalLcl', 'costBasisLcl']

/**
 * Build per-group, per-currency total rows for the trades table.
 * Groups by taxable boolean (true = taxable, false = exempt), then by currency,
 * plus a local-currency grand total per group.
 */
function buildTradeTotals(dataRows, localCurrencyCode) {
  const totals = []
  const groups = [
    { taxable: true,  label: 'TAXABLE' },
    { taxable: false, label: 'EXEMPT' },
  ]

  for (const { taxable, label } of groups) {
    const group = dataRows.filter(r => r.taxable === taxable)
    if (group.length === 0) continue
    for (const cur of ['EUR', 'USD']) {
      const subset = group.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      const row = { _total: true, taxExemptLabel: label, currency: cur }
      TRADE_SUM_COLS.forEach(k    => { row[k] = subset.reduce((s, r) => s.plus(r[k] ?? D0), D0) })
      TRADE_SUM_LCL_COLS.forEach(k => { row[k] = subset.reduce((s, r) => s.plus(r[k] ?? D0), D0) })
      totals.push(row)
    }
    const lclRow = { _total: true, taxExemptLabel: label, currency: localCurrencyCode }
    TRADE_SUM_LCL_COLS.forEach(k => { lclRow[k] = group.reduce((s, r) => s.plus(r[k] ?? D0), D0) })
    totals.push(lclRow)
  }
  return totals
}

/**
 * Build App5 (taxable) and App13 (exempt) summaries from the current trade rows.
 * Reflects any taxable-status toggles the user has made.
 */
function buildTaxSummary(dataRows) {
  const sells   = dataRows.filter(r => r.side === 'SELL')
  const taxable = sells.filter(r => r.taxable === true)
  const exempt  = sells.filter(r => r.taxable === false)

  const summarize = group => {
    const profits = group.reduce((s, r) => {
      const pl = (r.totalLcl ?? D0).minus(r.costBasisLcl ?? D0)
      return pl.gt(D0) ? s.plus(pl) : s
    }, D0)
    const losses = group.reduce((s, r) => {
      const pl = (r.totalLcl ?? D0).minus(r.costBasisLcl ?? D0)
      return pl.lt(D0) ? s.plus(pl.abs()) : s
    }, D0)
    return {
      totalProceedsLcl:  group.reduce((s, r) => s.plus(r.totalLcl    ?? D0), D0),
      totalCostBasisLcl: group.reduce((s, r) => s.plus(r.costBasisLcl ?? D0), D0),
      profits,
      losses,
    }
  }

  return { sumTaxable: summarize(taxable), sumExempt: summarize(exempt) }
}

export function calculateTotals(rawRows, currency) {
  const totals = buildTradeTotals(rawRows, currency)
  const taxSummary = buildTaxSummary(rawRows)

  return {
    totals,
    taxSummary,
  }
}