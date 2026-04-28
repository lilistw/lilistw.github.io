// TradePresenter.js
import { getInstrumentTypeLabel } from '../core/domain/instrument/classifier.js'
import { t } from '../localization/i18n.js'
import { fmt } from './fmt.js'
import { decimalToNumber } from '../core/domain/numStr.js'

const TRADE_COLUMNS = (lcl) => [
  { key: '#',               label: '#',                                  align: 'right', mono: true, decimals: 0 },
  { key: 'taxable',         label: t('tradeTableCols.taxable'),          editable: 'checkbox' },
  {
    key: 'taxExemptLabel',
    label: t('tradeTableCols.taxExemptLabel'),
    chip: true,
    chipColors: {
      [t('app.taxStatus.exempt')]: 'success',
      [t('app.taxStatus.taxable')]: 'default',
    },
  },
  { key: 'securityId',      shortLabel: 'ISIN',
    label: t('tradeTableCols.securityIdHelp'),
    link: isin => `https://efirds.eu/search?search=${isin}&filter=Instrument%20(ISIN)` },
  { key: 'symbol',          label: t('tradeTableCols.symbol'),          bold: true, tooltip: 'description' },
  { key: 'instrType',       label: t('tradeTableCols.instrType'),       chip: true, chipColors: { ETF: 'primary', Stock: 'default', Other: 'default' } },
  { key: 'exchange',        label: t('tradeTableCols.exchange') },
  { key: 'datetime',        label: t('tradeTableCols.datetime'),        mono: true },
  { key: 'currency',        label: t('tradeTableCols.currency') },
  { key: 'side',            label: t('tradeTableCols.side'),            chip: true, chipColors: { BUY: 'primary', SELL: 'secondary' } },
  { key: 'quantityDisplay', label: t('tradeTableCols.quantityDisplay'), align: 'right', mono: true },
  { key: 'price',           label: t('tradeTableCols.price'),           align: 'right', mono: true },
  { key: 'proceeds',        label: t('tradeTableCols.proceeds'),        align: 'right', mono: true, decimals: 2 },
  { key: 'commission',      label: t('tradeTableCols.commission'),      align: 'right', mono: true, decimals: 2 },
  { key: 'fee',             label: t('tradeTableCols.fee'),             align: 'right', mono: true, decimals: 2 },
  { key: 'totalWithFee',    label: t('tradeTableCols.totalWithFee'),    align: 'right', mono: true, decimals: 2 },
  { key: 'rate',            label: t('tradeTableCols.rate', { lcl }),   align: 'right', mono: true, decimals: 5, nullAs: '—' },
  { key: 'totalWithFeeLcl', label: t('tradeTableCols.totalWithFeeLcl', { lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
  { key: 'costBasis',       label: t('tradeTableCols.costBasis'),       align: 'right', mono: true, decimals: 2, nullAs: '—' },
  { key: 'costBasisLcl',    label: t('tradeTableCols.costBasisLcl', { lcl }), align: 'right', mono: true, decimals: 2, nullAs: '—' },
]

// -------------------------
// presenter
// -------------------------

export class TradePresenter {
  constructor({ lcl, mode = 'display' }) {
    this.lcl = t(`currencyLabels.${lcl.toLowerCase()}`)
    this.mode = mode
  }

  buildTable(rows) {
    return {
      columns: TRADE_COLUMNS(this.lcl),
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

      // UI-specific fields
      '#': r.index,

      quantityDisplay: r.quantity?.toString() ?? null,

      price:       this.#fmtNum(r.price, 4),
      proceeds:    this.#fmtNum(r.proceeds, 2),
      commission:  this.#fmtNum(r.commission, 2),
      fee:         this.#fmtNum(r.fee, 2),

      totalWithFee:    this.#fmtNum(r.total, 2),
      totalWithFeeLcl: this.#fmtNum(r.totalLcl, 2),
      rate:            this.#fmtNum(r.rate, 5),

      costBasis:    this.#fmtNum(r.costBasis, 2),
      costBasisLcl: this.#fmtNum(r.costBasisLcl, 2),

      proceedsLcl:   this.#fmtNum(r.proceedsLcl, 2),
      realizedPLLcl: this.#fmtNum(r.realizedPLLcl, 2),

      instrType: r._total ? r.instrType : getInstrumentTypeLabel({ type: r.instrType }),

      taxExemptLabel: r._total
        ? t(`app.taxStatus.${r.taxExemptLabel.toLowerCase()}`)
        : r.taxable == null
          ? ''
          : r.taxable
            ? t('app.taxStatus.taxable')
            : t('app.taxStatus.exempt'),
    }))
  }
}
