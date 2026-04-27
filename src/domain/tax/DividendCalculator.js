import Decimal from 'decimal.js'
import { toLocalCurrency } from '../fx/fxRates.js'
import { toDecimal, D0 } from '../numStr.js'

const BG_DIVIDEND_TAX_RATE = new Decimal('0.05')

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

      const grossD = toLocalCurrency(d.grossAmount, d.currency, d.date, this.ctx.taxYear)
      const withheldD = toLocalCurrency(d.withheldTax, d.currency, d.date, this.ctx.taxYear)

      if (!acc[key]) {
        acc[key] = {
          symbol: d.symbol,
          description,
          countryName: d.countryName,
          incomeCategoryCode: 8141,
          methodCode: d.taxCode,
          grossAmountLcl: D0,
          foreignTaxPaidLcl: D0,
        }
      }

      acc[key].grossAmountLcl = acc[key].grossAmountLcl.plus(grossD ?? D0)
      acc[key].foreignTaxPaidLcl = acc[key].foreignTaxPaidLcl.plus(withheldD ?? D0)

      return acc
    }, {})
  }

  #computeTax(grouped) {
    return Object.values(grouped).map(d => {
      const bgTaxLcl =
        d.grossAmountLcl != null
          ? d.grossAmountLcl.times(BG_DIVIDEND_TAX_RATE)
          : null

      const partialCredit =
        bgTaxLcl != null &&
        d.foreignTaxPaidLcl != null &&
        d.foreignTaxPaidLcl.lt(bgTaxLcl)
          ? d.foreignTaxPaidLcl
          : null

      const allowableLcl = d.methodCode === 1 ? partialCredit : null

      const dueTaxLcl =
        bgTaxLcl != null && d.foreignTaxPaidLcl != null
          ? Decimal.max(D0, bgTaxLcl.minus(d.foreignTaxPaidLcl))
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
        withholding[key] = (withholding[key] ?? D0).plus(toDecimal(wt.amount))
    }

    return rawDividends.map(d => {
        const m = d.description.match(/^([^(]+)\(/)
        const symbol = m ? m[1].trim() : d.description.split(' ')[0]
        const key = `${symbol}_${d.date}`
        const grossAmount = toDecimal(d.amount)
        const withheldTax = (withholding[key] ?? D0).abs()
        const info = instrumentInfo[symbol] || {}
        return {
        symbol,
        date:        d.date,
        currency:    d.currency,
        description: d.description,
        grossAmount,
        withheldTax,
        netAmount:   grossAmount.minus(withheldTax),
        country:     info.country     || '',
        countryName: info.countryName || '',
        taxCode:     withheldTax.gt(D0) ? 1 : 3,
        }
    })
    }
}
