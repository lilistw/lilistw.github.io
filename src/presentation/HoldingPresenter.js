// HoldingsPresenter.js
export class HoldingPresenter {
  constructor({ lcl }) {
    this.lcl = lcl
  }

  buildHoldings(rows) {
    const sortedRows = this.#mapRows(rows).sort((a, b) =>
      a.type === b.type ? 0 : a.type === 'Акции' ? -1 : 1
    )
    const shares = sortedRows.filter(r => r.type === 'Акции')
    const funds = sortedRows.filter(r => r.type === 'Дялове')
    const groupedRows = []

    if (shares.length > 0) {
      groupedRows.push({ _subtitle: true, label: 'Акции' })
      groupedRows.push(...shares)
    }
    if (funds.length > 0) {
      groupedRows.push({ _subtitle: true, label: 'Дялове' })
      groupedRows.push(...funds)
    }

    return {
      columns: this.#columns(),
      rows: groupedRows,
    }
  }

  // -------------------------
  // PRIVATE
  // -------------------------

  #columns() {
    return [
      { key: 'symbol', label: 'Символ', bold: true, tooltip: 'description' },
      { key: 'type', label: 'Вид', bold: true },
      { key: 'country', label: 'Държава' },
      { key: 'quantity', label: 'Брой', align: 'right', mono: true, decimals: 0 },
      {
        key: 'acquDate',
        label: 'Дата и година на придобиване',
        shortLabel: 'Дата',
        mono: true,
        maxWidth: 80,
      },
      {
        key: 'costBasis',
        label: 'Обща цена в съответната валута',
        align: 'right',
        mono: true,
        decimals: 2,
      },
      { key: 'currency', label: 'Валута' },
      {
        key: 'costLcl',
        label: `Обща цена в ${this.lcl}`,
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
      type: r.type === 'ETF' ? 'Дялове' : 'Акции',
      acquDate: r.acquDate
        ? r.acquDate.split('-').reverse().join('.')
        : null,
    }))
  }
}
