import Decimal from 'decimal.js'
import {
  toLocalCurrency
} from '../fx/fxRates.js'


const BG_DIVIDEND_TAX_RATE = new Decimal('0.05')

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return new Decimal(0) }
}

export class DividendCalculator {
  constructor({ instrumentInfo, taxYear, lcl }) {
    this.instrumentInfo = instrumentInfo
    this.taxYear = taxYear
    this.lcl = lcl
  }

  calculate({ dividends, withholdingTax }) {
    const matched = this.#match(dividends, withholdingTax)
    const grouped = this.#group(matched)
    const app8Rows = this.#computeTax(grouped)

    return {
      dividends: this.#buildDividendsTable(matched),
      app8Dividends: this.#buildApp8Table(app8Rows),
    }
  }

  // -------------------------
  // PRIVATE METHODS
  // -------------------------


  #group(matched) {
    return matched.reduce((acc, d) => {
      const description = this.instrumentInfo[d.symbol]?.description ?? ''

      // safer + stable key
      const key = `${d.symbol}|${d.taxCode}`

      const grossD = toLocalCurrency(toD(d.grossAmount), d.currency, d.date, this.taxYear)
      const withheldD = toLocalCurrency(toD(d.withheldTax), d.currency, d.date, this.taxYear)

      const grossLcl = grossD ? grossD.toNumber() : 0
      const withheldLcl = withheldD ? withheldD.toNumber() : 0

      if (!acc[key]) {
        acc[key] = {
          symbol: d.symbol,
          description,
          countryName: d.countryName,
          incomeCategoryCode: 8141,
          methodCode: d.taxCode,
          grossAmountLcl: 0,
          foreignTaxPaidLcl: 0,
        }
      }

      acc[key].grossAmountLcl += grossLcl
      acc[key].foreignTaxPaidLcl += withheldLcl

      return acc
    }, {})
  }

  #computeTax(grouped) {
    return Object.values(grouped).map(d => {
      const bgTaxLcl =
        d.grossAmountLcl != null
          ? new Decimal(d.grossAmountLcl).times(BG_DIVIDEND_TAX_RATE).toNumber()
          : null

      const partialCredit =
        bgTaxLcl != null &&
        d.foreignTaxPaidLcl != null &&
        d.foreignTaxPaidLcl < bgTaxLcl
          ? d.foreignTaxPaidLcl
          : null

      const allowableLcl = d.methodCode === 1 ? partialCredit : null

      const dueTaxLcl =
        bgTaxLcl != null && d.foreignTaxPaidLcl != null
          ? Math.max(0, bgTaxLcl - d.foreignTaxPaidLcl)
          : bgTaxLcl

      return {
        ...d,
        allowableCreditLcl: allowableLcl,
        dueTaxLcl,
      }
    })
  }

  #buildApp8Table(rows) {
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

  #buildDividendsTable(rows) {
    return {
      columns: [
        { key: 'date',        label: 'Дата',           mono: true },
        { key: 'symbol',      label: 'Символ',         bold: true },
        { key: 'countryName', label: 'Държава' },
        { key: 'currency',    label: 'Валута' },
        { key: 'grossAmount', label: 'Брутна сума',    align: 'right', mono: true, decimals: 2 },
        { key: 'withheldTax', label: 'Удържан данък',  align: 'right', mono: true, decimals: 2 },
        { key: 'netAmount',   label: 'Нетна сума',     align: 'right', mono: true, decimals: 2 },
        { key: 'taxCode',     label: 'Код' },
      ],
      rows,
    }
  }

  #match(rawDividends, rawWithholdingTax) {
     
     
  const instrumentInfo = this.instrumentInfo
  const withholding = {}
  for (const wt of rawWithholdingTax) {
    const m = wt.description.match(/^([^(]+)\(/)
    const symbol = m ? m[1].trim() : null
    if (!symbol || !wt.date) continue
    const key = `${symbol}_${wt.date}`
    withholding[key] = (withholding[key] || 0) + parseFloat(wt.amount || '0')
  }

  return rawDividends.map(d => {
    const m = d.description.match(/^([^(]+)\(/)
    const symbol = m ? m[1].trim() : d.description.split(' ')[0]
    const key = `${symbol}_${d.date}`
    const grossAmount = parseFloat(d.amount || '0')
    const withheldTax = Math.abs(withholding[key] || 0)
    const info = instrumentInfo[symbol] || {}
    return {
      symbol,
      date:        d.date,
      currency:    d.currency,
      description: d.description,
      grossAmount,
      withheldTax,
      netAmount:   grossAmount - withheldTax,
      country:     info.country     || '',
      countryName: info.countryName || '',
      taxCode:     withheldTax > 0 ? 1 : 3,
    }
  })
}
}