/**
 * Reactive trade summaries — recomputed whenever the user toggles taxable status.
 * Both functions are pure and operate on the current trade data rows from App state.
 */
import { t } from '../localization/i18n.js'

const TRADE_SUM_COLS     = ['proceeds', 'commission', 'fee', 'totalWithFee']
const TRADE_SUM_LCL_COLS = ['totalWithFeeLcl', 'costBasisLcl']

/**
 * Build per-group, per-currency total rows for the trades table.
 * Groups by taxExemptLabel ('Облагаем' / 'Освободен'), then by currency,
 * plus a local-currency grand total per group.
 */
export function buildTradeTotals(dataRows, localCurrencyCode) {
  const totals = []
  for (const label of [t('app.taxStatus.taxable'), t('app.taxStatus.exempt')]) {
    const group = dataRows.filter(r => r.taxExemptLabel === label)
    if (group.length === 0) continue
    for (const cur of ['EUR', 'USD']) {
      const subset = group.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      const row = { _total: true, taxExemptLabel: label, currency: cur }
      TRADE_SUM_COLS.forEach(k    => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      TRADE_SUM_LCL_COLS.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      totals.push(row)
    }
    const lclRow = { _total: true, taxExemptLabel: label, currency: localCurrencyCode }
    TRADE_SUM_LCL_COLS.forEach(k => { lclRow[k] = group.reduce((s, r) => s + (r[k] ?? 0), 0) })
    totals.push(lclRow)
  }
  return totals
}

/**
 * Build App5 (taxable) and App13 (exempt) summaries from the current trade rows.
 * Reflects any taxable-status toggles the user has made.
 */
export function buildTaxSummary(dataRows) {
  const sells   = dataRows.filter(r => r.side === 'SELL')
  const taxable = sells.filter(r => r.taxable === true)
  const exempt  = sells.filter(r => r.taxable === false)

  const summarize = group => {
    const profits = group.reduce((s, r) => {
      const pl = (r.totalWithFeeLcl ?? 0) - (r.costBasisLcl ?? 0)
      return pl > 0 ? s + pl : s
    }, 0)
    const losses = group.reduce((s, r) => {
      const pl = (r.totalWithFeeLcl ?? 0) - (r.costBasisLcl ?? 0)
      return pl < 0 ? s + Math.abs(pl) : s
    }, 0)
    return {
      totalProceedsLcl:  group.reduce((s, r) => s + (r.totalWithFeeLcl ?? 0), 0),
      totalCostBasisLcl: group.reduce((s, r) => s + (r.costBasisLcl    ?? 0), 0),
      profits,
      losses,
    }
  }

  return { sumTaxable: summarize(taxable), sumExempt: summarize(exempt) }
}
