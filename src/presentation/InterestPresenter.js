// InterestPresenter.js
import { t } from '../localization/i18n.js'

export class InterestPresenter {
  constructor({ lcl }) {
    this.lcl = lcl
  }

  buildTable(rows) {
    return {
      columns: this.#buildColumns(),
      rows: this.#mapRows(rows),
    }
  }

  // -------------------------

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
      amount: r.amount?.toNumber?.() ?? null,
      amountLcl: r.amountLcl?.toNumber?.() ?? null,
      description: r._total ? t('interestTableCols.total') : r.description,
    }))
  }
}
