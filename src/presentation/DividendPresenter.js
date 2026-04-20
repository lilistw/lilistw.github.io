// DividendPresenter.js
export class DividendPresenter {
  constructor({ lcl }) {
    this.lcl = lcl
  }

  buildDividendsTable(rows) {
    return {
      columns: [
        { key: 'symbol',             label: 'Символ', bold: true, tooltip: 'description' },
        { key: 'description',        label: 'Наименование на лицето, изплатило дохода',                              shortLabel: 'Наименование',    mono: true, maxWidth: 200 },
        { key: 'countryName',        label: 'Държава' },
        { key: 'incomeCategoryCode', label: 'Код вид доход',                                                         shortLabel: 'Код доход' },
        { key: 'methodCode',         label: 'Код за прилагане на метод за избягване на двойното данъчно облагане',   shortLabel: 'Код метод' },
        { key: 'grossAmountLcl',     label: 'Брутен размер на дохода, включително платения данък (за доходи с код 8141)', shortLabel: `Брутен доход (${this.lcl})`,    align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'foreignTaxPaidLcl',  label: 'Платен данък в чужбина',                                               shortLabel: `Данък в чужбина (${this.lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'allowableCreditLcl', label: 'Допустим размер на данъчния кредит',                                    shortLabel: `Допустим кредит (${this.lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'dueTaxLcl',          label: 'Дължим данък, подлежащ на внасяне по реда на чл. 67, ал. 4 от ЗДДФЛ', shortLabel: `Дължим данък (${this.lcl})`,      align: 'right', mono: true, decimals: 2, nullAs: '—' },
      ],
      rows,
    }
  }
}