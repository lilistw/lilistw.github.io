// TradePresenter.js
import { getInstrumentTypeLabel } from '../domain/instrument/classifier.js'
import { t } from '../localization/i18n.js'

const TRADE_COLUMNS = (lcl) => [
  { key: '#',               label: '#',                                  align: 'right', mono: true, decimals: 0 },
  { key: 'taxable',         label: t('tradeTableCols.taxable'),          editable: 'checkbox' },
  {
    key: 'taxExemptLabel',
    label: t('tradeTableCols.taxExemptLabel'),
    chip: true,
    chipColors: {
      [t('app.taxStatus.exempt')]: 'success',
      [t('app.taxStatus.taxable')]: 'default'
    }
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
// helpers
// -------------------------

function toNumberSafe(v) {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (v?.toNumber) return v.toNumber()
  return v
}

function toStringSafe(v) {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (v?.toString) return v.toString()
  return String(v)
}

function normalizeRow(obj) {
  const res = {}

  for (const [k, v] of Object.entries(obj)) {
    if (v?.toNumber) {
      res[k] = v.toNumber()
    } else {
      res[k] = v
    }
  }

  return res
}

// -------------------------
// presenter
// -------------------------

export class TradePresenter {
  constructor({ lcl }) {
    this.lcl = lcl
  }

  buildTable(rows) {
    return {
      columns: TRADE_COLUMNS(this.lcl),
      rows: this.#mapRows(rows),
    }
  }

  // -------------------------

  #mapRows(rows) {
    return rows.map(r => {
      const mapped = {
        ...r,

        // UI-specific fields
        '#': r.index,

        quantityDisplay: toStringSafe(r.quantity),

        proceeds: toNumberSafe(r.proceeds),
        commission: toNumberSafe(r.commission),
        fee: toNumberSafe(r.fee),

        totalWithFee: toNumberSafe(r.total),
        totalWithFeeLcl: toNumberSafe(r.totalLcl),
        rate: toNumberSafe(r.rate),

        costBasis: toNumberSafe(r.costBasis),
        costBasisLcl: toNumberSafe(r.costBasisLcl),

        proceedsLcl: toNumberSafe(r.proceedsLcl),
        realizedPLLcl: toNumberSafe(r.realizedPLLcl),

        instrType: getInstrumentTypeLabel({ type: r.instrType }),

        taxExemptLabel:
          r.taxable == null
            ? ''
            : r.taxable
            ? t('app.taxStatus.taxable')
            : t('app.taxStatus.exempt'),
      }

      // Final safety: ensure NO Decimal slips through
      return normalizeRow(mapped)
    })
  }
}
