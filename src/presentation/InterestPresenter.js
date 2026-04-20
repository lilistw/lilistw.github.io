// InterestPresenter.js
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
      { key: 'date',        label: 'Дата', mono: true },
      { key: 'currency',    label: 'Валута' },
      { key: 'description', label: 'Описание' },
      { key: 'amount',      label: 'Сума', align: 'right', mono: true, decimals: 2 },
      {
        key: 'amountLcl',
        label: `Сума (${this.lcl})`,
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
      description: r._total ? 'Общо' : r.description,
    }))
  }
}