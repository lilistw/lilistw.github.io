// DividendPresenter.js
import { t } from '../../localization/i18n.js'
import { fmt } from './fmt.js'
import { decimalToNumber } from '../../core/domain/numStr.js'

export class DividendPresenter {
  constructor({ lcl, mode = 'display' }) {
    this.lcl = lcl
    this.mode = mode
  }

  buildDividendsTable(rows) {
    return {
      columns: [
        { key: 'symbol',             label: t('dividendTableCols.symbol'), bold: true, tooltip: 'description' },
        { key: 'description',        label: t('dividendTableCols.description'), shortLabel: t('dividendTableCols.descriptionShort'), mono: true, maxWidth: 200 },
        { key: 'countryName',        label: t('dividendTableCols.countryName') },
        { key: 'incomeCategoryCode', label: t('dividendTableCols.incomeCategoryCode'), shortLabel: t('dividendTableCols.incomeCategoryCodeShort') },
        { key: 'methodCode',         label: t('dividendTableCols.methodCode'), shortLabel: t('dividendTableCols.methodCodeShort') },
        { key: 'grossAmountLcl',     label: t('dividendTableCols.grossAmountLcl'), shortLabel: t('dividendTableCols.grossAmountLclShort', { lcl: this.lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'foreignTaxPaidLcl',  label: t('dividendTableCols.foreignTaxPaidLcl'), shortLabel: t('dividendTableCols.foreignTaxPaidLclShort', { lcl: this.lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'allowableCreditLcl', label: t('dividendTableCols.allowableCreditLcl'), shortLabel: t('dividendTableCols.allowableCreditLclShort', { lcl: this.lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'dueTaxLcl',          label: t('dividendTableCols.dueTaxLcl'), shortLabel: t('dividendTableCols.dueTaxLclShort', { lcl: this.lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
      ],
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

  #mapRows(rows) {
    return rows.map(r => ({
      ...r,
      grossAmountLcl:     this.#fmtNum(r.grossAmountLcl, 2),
      foreignTaxPaidLcl:  this.#fmtNum(r.foreignTaxPaidLcl, 2),
      allowableCreditLcl: this.#fmtNum(r.allowableCreditLcl, 2),
      dueTaxLcl:          this.#fmtNum(r.dueTaxLcl, 2),
    }))
  }
}
