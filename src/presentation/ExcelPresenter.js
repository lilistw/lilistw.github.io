import { TradePresenter } from './TradePresenter.js'
import { HoldingPresenter } from './HoldingPresenter.js'
import { DividendPresenter } from './DividendPresenter.js'
import { InterestPresenter } from './InterestPresenter.js'
import { TradeSummaryPresenter } from './TradeSummaryPresenter.js'

function cellText(col, value) {
  if (value == null) return col.nullAs ?? ''
  if (col.decimals !== undefined && typeof value === 'number')
    return value.toFixed(col.decimals)
  return String(value)
}

function buildSection(name, columns, rows) {
  const header = columns.map(c => c.shortLabel ?? c.label).join('\t')
  const body = rows
    .filter(row => !row._total && !row._subtitle)
    .map(row => columns.map(col => cellText(col, row[col.key])).join('\t'))
  return [name, header, ...body].join('\n')
}

export class ExcelPresenter {
  constructor({ t, lcl }) {
    this.t = t
    this.lcl = lcl
  }

  buildTsv(result) {
    const { t, lcl } = this
    const sections = []

    const tradePresenter = new TradePresenter({ lcl })
    const trades = tradePresenter.buildTable(result.trades)
    sections.push(buildSection(t('app.tabs.trades'), trades.columns, trades.rows))

    const holdingPresenter = new HoldingPresenter({ lcl })
    const holdings = holdingPresenter.buildHoldings(result.holdings)
    sections.push(buildSection(t('app.tabs.positions'), holdings.columns, holdings.rows))

    if (result.dividends.length > 0) {
      const divPresenter = new DividendPresenter({ lcl })
      const dividends = divPresenter.buildDividendsTable(result.dividends)
      sections.push(buildSection(t('app.tabs.dividends'), dividends.columns, dividends.rows))
    }

    const realInterest = result.interest.filter(r => !r._total)
    if (realInterest.length > 0) {
      const intPresenter = new InterestPresenter({ lcl })
      const interest = intPresenter.buildTable(result.interest)
      sections.push(buildSection(t('app.tabs.interest'), interest.columns, interest.rows))
    }

    const summaryPresenter = new TradeSummaryPresenter({ t, lcl })
    sections.push(this.#summarySection(result.taxSummary, summaryPresenter))

    return sections.join('\n\n\n')
  }

  #summarySection(taxSummary, presenter) {
    const taxable = presenter.buildTaxable(taxSummary.sumTaxable)
    const exempt = presenter.buildExempt(taxSummary.sumExempt)
    const lines = [this.t('app.tabs.summary')]

    if (taxable?.rows?.length > 0) {
      lines.push(taxable.title)
      taxable.rows.forEach(r =>
        lines.push(`${r.label}\t${typeof r.value === 'number' ? r.value.toFixed(2) : r.value ?? ''}`)
      )
    }

    if (exempt?.rows?.length > 0) {
      lines.push('')
      lines.push(exempt.title)
      exempt.rows.forEach(r =>
        lines.push(`${r.label}\t${typeof r.value === 'number' ? r.value.toFixed(2) : r.value ?? ''}`)
      )
    }

    return lines.join('\n')
  }
}
