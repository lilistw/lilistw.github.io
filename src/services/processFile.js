import { parseCSV } from '../infra/csvReader.js'
import { parseTrades } from '../domain/parser/ibkrParser.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'
import { parseFinancialInstrumentInfo } from '../domain/parser/parseFinancialInstrumentInfo.js'
import { parseDividends } from '../domain/parser/parseDividends.js'
import { EU_COUNTRY_CODES } from '../domain/constants.js'

const BG_DIVIDEND_TAX_RATE = 0.05

function isEuEtf(symbol, instrumentInfo) {
  const info = instrumentInfo[symbol]
  return info?.type === 'ETF' && EU_COUNTRY_CODES.has(info.country)
}

function summarizeSells(sells) {
  const totalProceeds  = sells.reduce((s, t) => s + t.proceeds, 0)
  const profits        = sells.reduce((s, t) => t.realizedPL > 0 ? s + t.realizedPL : s, 0)
  const losses         = sells.reduce((s, t) => t.realizedPL < 0 ? s + Math.abs(t.realizedPL) : s, 0)
  const totalCostBasis = totalProceeds - profits + losses
  return { totalProceeds, totalCostBasis, profits, losses }
}

export async function processFile(file) {
  const text = await file.text()
  const rows = parseCSV(text)

  const instrumentInfo = parseFinancialInstrumentInfo(rows)
  const trades         = parseTrades(rows)
  const holdings       = parseOpenPositions(rows, instrumentInfo)
  const dividends      = parseDividends(rows, instrumentInfo)

  // ── App5 / App13 tax summaries ──────────────────────────────────────────
  const sellTrades   = trades.rows.filter(t => t.type === 'SELL')
  const taxableSells = sellTrades.filter(t => !isEuEtf(t.symbol, instrumentInfo))
  const euEtfSells   = sellTrades.filter(t =>  isEuEtf(t.symbol, instrumentInfo))

  const app5  = summarizeSells(taxableSells)
  const app13 = summarizeSells(euEtfSells)

  // ── App8 Part I – holdings for declaration ──────────────────────────────
  const app8Holdings = {
    columns: [
      { key: 'type',      label: 'Вид',                  bold: true },
      { key: 'country',   label: 'Държава' },
      { key: 'symbol',    label: 'Символ',               bold: true },
      { key: 'quantity',  label: 'Брой',                 align: 'right', mono: true, decimals: 0 },
      { key: 'acquDate',  label: 'Дата на придобиване',  mono: true },
      { key: 'costBasis', label: 'Цена на придобиване',  align: 'right', mono: true, decimals: 2 },
      { key: 'currency',  label: 'Валута' },
      { key: 'costBGN',   label: 'В лева',               align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ],
    rows: holdings.rows.map(h => {
      const info = instrumentInfo[h.symbol] || {}
      return {
        type:      info.type === 'ETF' ? 'ДЯЛ' : 'АКЦИЯ',
        country:   info.countryName || h.currency,
        symbol:    h.symbol,
        quantity:  h.quantity,
        acquDate:  '—',
        costBasis: h.costBasis,
        currency:  h.currency,
        costBGN:   null,
      }
    }),
  }

  // ── App8 Part III – dividends for declaration ───────────────────────────
  const app8Dividends = {
    columns: [
      { key: 'symbol',            label: 'Наименование',        bold: true },
      { key: 'countryName',       label: 'Държава' },
      { key: 'incomeCategoryCode',label: 'Код доход' },
      { key: 'methodCode',        label: 'Код метод' },
      { key: 'grossAmount',       label: 'Брутен доход',        align: 'right', mono: true, decimals: 2 },
      { key: 'foreignTaxPaid',    label: 'Данък в чужбина',     align: 'right', mono: true, decimals: 2 },
      { key: 'allowableCredit',   label: 'Допустим кредит',     align: 'right', mono: true, decimals: 2 },
      { key: 'dueTax',            label: 'Дължим данък (5%)',   align: 'right', mono: true, decimals: 2 },
    ],
    rows: dividends.rows.map(d => {
      const bgTax           = d.grossAmount * BG_DIVIDEND_TAX_RATE
      const allowableCredit = Math.min(d.withheldTax, bgTax)
      const recognizedCredit = d.taxCode === 1 ? allowableCredit : 0
      const dueTax          = Math.max(0, bgTax - recognizedCredit)
      return {
        symbol:             d.symbol,
        countryName:        d.countryName,
        incomeCategoryCode: 8141,
        methodCode:         d.taxCode,
        grossAmount:        d.grossAmount,
        foreignTaxPaid:     d.withheldTax,
        allowableCredit,
        dueTax,
      }
    }),
  }

  return {
    trades,
    holdings,
    dividends,
    taxSummary: { app5, app13, app8Holdings, app8Dividends },
  }
}
