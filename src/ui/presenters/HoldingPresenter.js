// HoldingsPresenter.js
import { t } from '../../localization/i18n.js'
import { fmt } from './fmt.js'
import { decimalToNumber } from '../../core/domain/numStr.js'

export class HoldingPresenter {
  constructor({ lcl, mode = 'display' }) {
    this.lcl = t(`currencyLabels.${lcl.toLowerCase()}`)
    this.mode = mode
  }

  buildHoldings(rows) {
    const sortedRows = this.#mapRows(rows).sort((a, b) =>
      a.type === b.type ? 0 : a.type === t('taxApp8Holdings.shares') ? -1 : 1
    )
    const shares = sortedRows.filter(r => r.type === t('taxApp8Holdings.shares'))
    const funds = sortedRows.filter(r => r.type === t('taxApp8Holdings.funds'))
    const groupedRows = []

    if (shares.length > 0) {
      groupedRows.push({ _subtitle: true, label: t('taxApp8Holdings.shares') })
      groupedRows.push(...shares)
    }
    if (funds.length > 0) {
      groupedRows.push({ _subtitle: true, label: t('taxApp8Holdings.funds') })
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

  #fmtNum(decimal, decimals) {
    if (decimal == null) return null
    return this.mode === 'display'
      ? fmt(decimal, decimals)
      : decimalToNumber(decimal)
  }

  #columns() {
    return [
      { key: 'symbol', label: t('holdingTableCols.symbol'), bold: true, tooltip: 'description' },
      { key: 'type', label: t('holdingTableCols.type'), bold: true },
      { key: 'country', label: t('holdingTableCols.country') },
      { key: 'quantity', label: t('holdingTableCols.quantity'), align: 'right', mono: true, decimals: 0 },
      {
        key: 'acquDate',
        label: t('holdingTableCols.acquDate'),
        shortLabel: t('holdingTableCols.acquDateShort'),
        mono: true,
        maxWidth: 80,
      },
      {
        key: 'costBasis',
        label: t('holdingTableCols.costBasis'),
        align: 'right',
        mono: true,
        decimals: 2,
      },
      { key: 'currency', label: t('holdingTableCols.currency') },
      {
        key: 'costLcl',
        label: t('holdingTableCols.costLcl', { lcl: this.lcl }),
        align: 'right',
        mono: true,
        decimals: 2,
        nullAs: '—',
      },
    ]
  }

  #mapRows(rows) {
    return rows.map(r => {
      const countryKey = `countryNames.${r.country}`
      const countryDisplay = r.country
        ? (t(countryKey) !== countryKey ? t(countryKey) : r.country)
        : ''
      return {
        ...r,
        type: r.type === 'ETF' ? t('taxApp8Holdings.funds') : t('taxApp8Holdings.shares'),
        country: countryDisplay,
        acquDate: r.acquDate
          ? r.acquDate.split('-').reverse().join('.')
          : null,
        costBasis: this.#fmtNum(r.costBasis, 2),
        costLcl:   this.#fmtNum(r.costLcl, 2),
        quantity:  r.quantity != null ? decimalToNumber(r.quantity) : null,
      }
    })
  }
}
