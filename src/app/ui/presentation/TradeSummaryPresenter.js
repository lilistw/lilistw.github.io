// TradeSummaryPresenter.js
import Decimal from 'decimal.js'
import { fmt } from './fmt.js'
import { toDecimal, decimalToNumber, D0 } from '../../../core/domain/numStr.js'

export class TradeSummaryPresenter {
  constructor({ t, lcl, mode = 'display' }) {
    this.t = t
    this.lcl = lcl
    this.mode = mode
  }

  // -------------------------
  // APP 5 (taxable)
  // -------------------------
  buildTaxable(summary) {
    if (!summary) return null

    const s = this.#toDecimal(summary)

    const netTaxable = s.profits.minus(s.losses)
    // чл. 33, ал. 3: 10% recognised expenses reduce the taxable base before the 10% rate
    const taxableBase = Decimal.max(D0, netTaxable).times('0.90')
    const taxDue = taxableBase.times('0.10')

    return {
      title: this.t('taxApp5.title'),
      subtitle: this.t('taxApp5.subtitle'),

      rows: [
        this.#row(this.t('taxApp5.totalProceeds', { lcl: this.lcl }), s.totalProceedsLcl),
        this.#row(this.t('taxApp5.totalCost', { lcl: this.lcl }), s.totalCostBasisLcl),
        this.#row(this.t('taxApp5.profits', { lcl: this.lcl }), s.profits, 'success.main'),
        this.#row(this.t('taxApp5.losses', { lcl: this.lcl }), s.losses, 'error.main'),
        this.#row(
          this.t('taxApp5.netIncome', { lcl: this.lcl }),
          netTaxable,
          netTaxable.gte(D0) ? 'success.main' : 'error.main'
        ),
        this.#row(this.t('taxApp5.taxableBase', { lcl: this.lcl }), taxableBase),
        this.#row(this.t('taxApp5.taxDue', { lcl: this.lcl }), taxDue, 'warning.dark'),
      ],

      info: {
        icon: 'info',
        text: [
          this.t('taxApp5.infoLine1'),
          { bold: this.t('taxApp5.infoFormula') },
          this.t('taxApp5.infoLine2'),
          { bold: this.t('taxApp5.infoLine2Bold') },
          this.t('taxApp5.infoLine3'),
        ],
      },
    }
  }

  // -------------------------
  // APP 13 (non-taxable)
  // -------------------------
  buildExempt(summary) {
    if (!summary) return null

    const s = this.#toDecimal(summary)

    return {
      title: this.t('taxApp13.title'),
      subtitle: this.t('taxApp13.subtitle'),

      rows: s.totalProceedsLcl.isZero() ? [] : (() => {
        const result = s.totalProceedsLcl.minus(s.totalCostBasisLcl)
        return [
          this.#row(this.t('taxApp13.grossIncome', { lcl: this.lcl }), s.totalProceedsLcl),
          this.#row(this.t('taxApp13.acquisitionCost', { lcl: this.lcl }), s.totalCostBasisLcl),
          this.#row(this.t('taxApp13.result', { lcl: this.lcl }), result, result.gte(D0) ? 'success.main' : 'error.main'),
        ]
      })(),
    }
  }

  // -------------------------
  // PRIVATE
  // -------------------------

  #toDecimal(summary) {
    return {
      totalProceedsLcl:  toDecimal(summary.totalProceedsLcl),
      totalCostBasisLcl: toDecimal(summary.totalCostBasisLcl),
      profits:           toDecimal(summary.profits),
      losses:            toDecimal(summary.losses),
    }
  }

  #fmtNum(decimal, decimals) {
    if (decimal == null) return null
    return this.mode === 'display'
      ? fmt(decimal, decimals)
      : decimalToNumber(decimal)
  }

  #row(label, value, color) {
    return {
      label,
      value: this.#fmtNum(value, 2),
      color,
    }
  }
}
