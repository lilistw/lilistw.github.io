// InterestPresenter.js
import { t } from '../../localization/i18n.js'
import { fmt } from './fmt.js'
import { decimalToNumber } from '../../../core/domain/numStr.js'

export class InterestPresenter {
  constructor({ lcl, mode = 'display' }) {
    this.lcl = lcl
    this.mode = mode
  }

  buildTable(rows) {
    return {
      columns: this.#buildColumns(),
      rows: this.#mapRows(rows),
    }
  }

  // -------------------------

  #fmtNum(decimal, decimals) {
    if (decimal == null) return null
    return this.mode === 'display'
      ? fmt(decimal, decimals)
      : decimalToNumber(decimal)
  }

  #buildColumns() {
    return [
      { key: 'date',        label: t('interestTableCols.date'), mono: true },
      { key: 'currency',    label: t('interestTableCols.currency') },
      { key: 'description', label: t('interestTableCols.description') },
      { key: 'amount',      label: t('interestTableCols.amount'), align: 'right', mono: true, decimals: 2 },
      {
        key: 'amountLcl',
        label: t('interestTableCols.amountLcl', { lcl: this.lcl }),
        align: 'right',
        mono: true,
        decimals: 2,
        nullAs: '—',
      },
    ]
  }

  #mapRows(rows) {
    return rows.map(r => ({
      ...r,
      amount:    this.#fmtNum(r.amount, 2),
      amountLcl: this.#fmtNum(r.amountLcl, 2),
      description: r._total ? t('interestTableCols.total') : r.description,
    }))
  }
}
