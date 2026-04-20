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
  constructor({ instrumentInfo, context }) {
    this.instrumentInfo = instrumentInfo
    this.ctx = context
  }

  calculate({ dividends, withholdingTax }) {
    const matched = this.#match(dividends, withholdingTax)
    const grouped = this.#group(matched)

    return this.#computeTax(grouped)
  }

  // -------------------------
  // PRIVATE METHODS
  // -------------------------


  #group(matched) {
    return matched.reduce((acc, d) => {
      const description = this.instrumentInfo[d.symbol]?.description ?? ''

      // safer + stable key
      const key = `${d.symbol}|${d.taxCode}`

      const grossD = toLocalCurrency(toD(d.grossAmount), d.currency, d.date, this.ctx.taxYear)
      const withheldD = toLocalCurrency(toD(d.withheldTax), d.currency, d.date, this.ctx.taxYear)

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