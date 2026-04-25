// DividendPresenter.js
import { t } from '../localization/i18n.js'

export class DividendPresenter {
  constructor({ lcl }) {
    this.lcl = lcl
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
      rows,
    }
  }
}
