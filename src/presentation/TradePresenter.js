// TradePresenter.js
import { getInstrumentTypeLabel } from '../domain/instrument/classifier.js'

const TRADE_COLUMNS = (lcl) => [
  { key: '#',               label: '#',                              align: 'right', mono: true, decimals: 0 },
  { key: 'taxable',         label: 'Облагаем?',                     editable: 'checkbox' },
  { key: 'taxExemptLabel',  label: 'Данъчен статус',                chip: true, chipColors: { 'Освободен': 'success', 'Облагаем': 'default' } },
  { key: 'securityId',      shortLabel: 'ISIN',
    label: 'Отворете линка, изберете инструмента, отидете на „Trading venues“ и проверете дали типът на пазара е „Regulated market“',
    link: isin => `https://efirds.eu/search?search=${isin}&filter=Instrument%20(ISIN)` },
  { key: 'symbol',          label: 'Symbol',                        bold: true, tooltip: 'description' },
  { key: 'instrType',       label: 'Тип',                           chip: true, chipColors: { ETF: 'primary', Stock: 'default', Other: 'default' } },
  { key: 'exchange',        label: 'Exchange' },
  { key: 'datetime',        label: 'Trade Date/Time',               mono: true },
  { key: 'currency',        label: 'Currency' },
  { key: 'side',            label: 'Type',                          chip: true, chipColors: { BUY: 'primary', SELL: 'secondary' } },
  { key: 'quantityDisplay', label: 'Quantity',                      align: 'right', mono: true },
  { key: 'price',           label: 'Price',                         align: 'right', mono: true },
  { key: 'proceeds',        label: 'Proceeds',                      align: 'right', mono: true, decimals: 2 },
  { key: 'commission',      label: 'Commission',                    align: 'right', mono: true, decimals: 2 },
  { key: 'fee',             label: 'Fee',                           align: 'right', mono: true, decimals: 2 },
  { key: 'totalWithFee',    label: 'Общо + такси (вал)',            align: 'right', mono: true, decimals: 2 },
  { key: 'rate',            label: `Курс (${lcl})`,                 align: 'right', mono: true, decimals: 5, nullAs: '—' },
  { key: 'totalWithFeeLcl', label: `Общо + такси (${lcl})`,         align: 'right', mono: true, decimals: 2, nullAs: '—' },
  { key: 'costBasis',       label: 'Цена на придобиване (вал)',     align: 'right', mono: true, decimals: 2, nullAs: '—' },
  { key: 'costBasisLcl',    label: `Цена на придобиване (${lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
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
            ? 'Облагаем'
            : 'Освободен',
      }

      // Final safety: ensure NO Decimal slips through
      return normalizeRow(mapped)
    })
  }
}