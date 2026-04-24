// TradeSummaryPresenter.js

function toNumberSafe(v) {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (v?.toNumber) return v.toNumber()
  return Number(v) || 0
}

export class TradeSummaryPresenter {
  constructor({ t, lcl }) {
    this.t = t
    this.lcl = lcl
  }

  // -------------------------
  // APP 5 (taxable)
  // -------------------------
  buildTaxable(summary) {
    if (!summary) return null

    const s = this.#normalize(summary)

    const netTaxable = s.profits - s.losses
    // чл. 33, ал. 3: 10% recognised expenses reduce the taxable base before the 10% rate
    const taxableBase = Math.max(netTaxable, 0) * 0.90
    const taxDue = taxableBase * 0.10

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
          netTaxable >= 0 ? 'success.main' : 'error.main'
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

    const s = this.#normalize(summary)

    return {
      title: this.t('taxApp13.title'),
      subtitle: this.t('taxApp13.subtitle'),

      rows: (s.totalProceedsLcl === 0) ? [] : (() => {
        const profit = s.totalProceedsLcl - s.totalCostBasisLcl
        return [
          this.#row(this.t('taxApp13.grossIncome', { lcl: this.lcl }), s.totalProceedsLcl),
          this.#row(this.t('taxApp13.acquisitionCost', { lcl: this.lcl }), s.totalCostBasisLcl),
          this.#row(this.t('taxApp13.profit', { lcl: this.lcl }), profit, profit >= 0 ? 'success.main' : 'error.main'),
        ]
      })(),
    }
  }

  // -------------------------
  // PRIVATE
  // -------------------------

  #normalize(summary) {
    return {
      totalProceedsLcl: toNumberSafe(summary.totalProceedsLcl),
      totalCostBasisLcl: toNumberSafe(summary.totalCostBasisLcl),
      profits: toNumberSafe(summary.profits),
      losses: toNumberSafe(summary.losses),
    }
  }

  #row(label, value, color) {
    return {
      label,
      value,
      color,
    }
  }
}