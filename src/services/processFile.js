import Decimal from 'decimal.js'
import { parseCSV } from '../infra/csvReader.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'
import { parseFinancialInstrumentInfo } from '../domain/parser/parseFinancialInstrumentInfo.js'
import { parseDividends } from '../domain/parser/parseDividends.js'
import { parseInterest } from '../domain/parser/parseInterest.js'
import { parseCsvTradeBasis } from '../domain/parser/parseCsvTrades.js'
import { parseTaxYear } from '../domain/parser/parseTaxYear.js'
import {
  toLocalCurrency, toBGN,
  getLocalCurrencyCode, getLocalCurrencyLabel,
  getYearEndDate, getPrevYearEndDate,
} from '../domain/fx/fxRates.js'
import { processHtmlFile } from './processHtmlFile.js'
import { IBKR_EXCHANGES } from '../domain/constants.js'
import { EU_COUNTRY_CODES } from '../domain/constants.js'

const D0 = new Decimal(0)
const BG_DIVIDEND_TAX_RATE = new Decimal('0.05')

function isTaxExempt(trade, instrumentInfo) {
  if (instrumentInfo[trade.symbol]?.type !== 'ETF') return false
  const exch = IBKR_EXCHANGES[trade.exchange]
  const isEuEtf = EU_COUNTRY_CODES.has(instrumentInfo[trade.symbol]?.country)
  return exch?.regulated && isEuEtf
}

function summarizeSells(sells) {
  const sum = (key) => sells.reduce((s, t) => s.plus(t[key] ?? 0), D0).toNumber()
  const totalProceedsBGN  = sum('proceedsBGN')
  const totalCostBasisBGN = sum('costBasisBGN')
  const profits = sells.reduce((s, t) => {
    const pl = new Decimal(t.proceedsBGN ?? 0).minus(t.costBasisBGN ?? 0)
    return pl.gt(0) ? s.plus(pl) : s
  }, D0).toNumber()
  const losses = sells.reduce((s, t) => {
    const pl = new Decimal(t.proceedsBGN ?? 0).minus(t.costBasisBGN ?? 0)
    return pl.lt(0) ? s.plus(pl.abs()) : s
  }, D0).toNumber()
  return { totalProceedsBGN, totalCostBasisBGN, profits, losses }
}

/**
 * Parse both uploaded files without running tax calculations.
 * Used for the preliminary parse that infers prior-year positions.
 */
export async function parseFilesData({ csvFile, htmlFile }) {
  const [processedTrades, text] = await Promise.all([
    processHtmlFile(htmlFile),
    csvFile.text(),
  ])
  const rows            = parseCSV(text)
  const taxYear         = parseTaxYear(rows)
  const instrumentInfo  = parseFinancialInstrumentInfo(rows)
  const csvTradeBasis   = parseCsvTradeBasis(rows)
  const openPositions   = parseOpenPositions(rows, instrumentInfo, {})

  return { processedTrades, rows, instrumentInfo, csvTradeBasis, openPositions, taxYear }
}

/**
 * Full tax calculation.
 *
 * @param {{ csvFile, htmlFile, priorPositions? }} param0
 *   priorPositions – confirmed prior-year positions from PriorYearPositionsForm.
 *   Each entry: { symbol, currency, qty, costUSD, costBGN, lastBuyDate }
 */
export async function processFile({ csvFile, htmlFile, priorPositions = [] }) {
  const processedTrades = await processHtmlFile(htmlFile)
  const text = await csvFile.text()
  const rows = parseCSV(text)

  const taxYear            = parseTaxYear(rows)
  const localCurrencyCode  = getLocalCurrencyCode(taxYear)
  const localCurrencyLabel = getLocalCurrencyLabel(taxYear)
  const lcl                = localCurrencyLabel   // short alias for column labels
  const yearEndDate        = getYearEndDate(taxYear)
  const prevYearEndDate    = getPrevYearEndDate(taxYear)

  const toLcl = (amount, currency, dateStr) =>
    toLocalCurrency(amount, currency, dateStr, taxYear)

  const instrumentInfo = parseFinancialInstrumentInfo(rows)
  const dividends      = parseDividends(rows, instrumentInfo)
  const interest       = parseInterest(rows)
  const csvTradeBasis  = parseCsvTradeBasis(rows)

  const sortedTrades = [...processedTrades.rows].sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
    return new Date(a.dateTime) - new Date(b.dateTime)
  })

  // ── Seed positions from confirmed prior-year data ────────────────────────
  const initialPositions = {}
  for (const p of (priorPositions || [])) {
    if (!p.symbol) continue
    initialPositions[p.symbol] = {
      qty:     new Decimal(String(p.qty)),
      cost:    new Decimal(String(p.costUSD)),
      costBGN: new Decimal(String(p.costBGN)),
    }
  }

  // ── Process each trade ───────────────────────────────────────────────────
  const result = sortedTrades.reduce((acc, t, i) => {
    const key = t.symbol

    if (!acc.positions[key]) {
      acc.positions[key] = { qty: D0, cost: D0, costBGN: D0 }
    }
    const pos = acc.positions[key]

    const exempt = t.type === 'SELL' && isTaxExempt(t, instrumentInfo)

    const proceedsD = t.proceeds instanceof Decimal ? t.proceeds : new Decimal(String(t.proceeds ?? 0))
    const commD     = t.comm    instanceof Decimal ? t.comm    : new Decimal(String(t.comm    ?? 0))
    const feeD      = t.fee     instanceof Decimal ? t.fee     : new Decimal(String(t.fee     ?? 0))

    const totalWithFeeD    = proceedsD.plus(commD).plus(feeD)
    const totalWithFeeBGND = toLcl(totalWithFeeD, t.currency, t.date)
    const rateD            = toLcl(new Decimal(1), t.currency, t.date)

    let costBasis          = null
    let costBasisBGN       = null
    let costBasisBGNApprox = false

    if (t.type === 'BUY') {
      pos.qty     = pos.qty.plus(t.quantity)
      pos.cost    = pos.cost.plus(totalWithFeeD.neg())
      pos.costBGN = pos.costBGN.plus((totalWithFeeBGND ?? D0).neg())
    }

    if (t.type === 'SELL') {
      if (pos.qty.isZero()) {
        // No BUY in current dataset — fall back to IBKR CSV Basis + prev year-end rate.
        const qtyD  = t.quantity instanceof Decimal ? t.quantity : new Decimal(String(t.quantity))
        const csvKey = `${t.symbol}|${t.date}|${qtyD.toFixed(0)}`
        const csvBasisD = csvTradeBasis.get(csvKey)
        if (csvBasisD) {
          const bgnD = toLcl(csvBasisD, t.currency, prevYearEndDate)
          costBasis          = csvBasisD.toNumber()
          costBasisBGN       = bgnD ? bgnD.toNumber() : null
          costBasisBGNApprox = true
        }
      } else {
        const qtyD       = t.quantity instanceof Decimal ? t.quantity : new Decimal(String(t.quantity))
        const avgCost    = pos.cost.div(pos.qty)
        const avgCostBGN = pos.costBGN.div(pos.qty)
        const cbD        = avgCost.times(qtyD)
        const cbBGND     = avgCostBGN.times(qtyD)

        costBasis    = cbD.toNumber()
        costBasisBGN = cbBGND.toNumber()

        pos.qty     = pos.qty.minus(qtyD)
        pos.cost    = pos.cost.minus(cbD)
        pos.costBGN = pos.costBGN.minus(cbBGND)
      }
    }

    const taxable       = t.type !== 'SELL' ? null : exempt ? false : true
    const proceedsBGN   = t.type === 'SELL' && totalWithFeeBGND ? totalWithFeeBGND.toNumber() : null
    const realizedPLBGN = proceedsBGN != null && costBasisBGN != null
      ? new Decimal(proceedsBGN).minus(costBasisBGN).toNumber() : null

    acc.rows.push({
      ...t,
      '#': i + 1,
      taxable,
      taxExemptLabel: t.type !== 'SELL' ? '' : exempt ? 'Освободен' : 'Облагаем',
      rate:            rateD ? rateD.toNumber() : null,
      totalWithFee:    totalWithFeeD.toNumber(),
      totalWithFeeBGN: totalWithFeeBGND ? totalWithFeeBGND.toNumber() : null,
      costBasis,
      costBasisBGN,
      costBasisBGNApprox,
      proceedsBGN,
      realizedPLBGN,
    })

    return acc
  }, { positions: initialPositions, rows: [] })

  const enrichedRows       = result.rows
  const positionsCostBasis = {}
  for (const [sym, pos] of Object.entries(result.positions)) {
    positionsCostBasis[sym] = {
      cost:    pos.cost.toNumber(),
      qty:     pos.qty.toNumber(),
      costBGN: pos.costBGN.toNumber(),
    }
  }
  console.info('Open positions:', positionsCostBasis)
  const holdings = parseOpenPositions(rows, instrumentInfo, positionsCostBasis)

  // ── Trade totals rows ────────────────────────────────────────────────────
  const sumCols    = ['proceeds', 'comm', 'fee', 'totalWithFee']
  const sumBgnCols = ['totalWithFeeBGN']
  const dataRows   = [...enrichedRows]

  ;['EUR', 'USD'].forEach(cur => {
    const subset = dataRows.filter(r => r.currency === cur)
    if (subset.length === 0) return
    const row = { _total: true, currency: cur }
    sumCols.forEach(k    => { row[k] = subset.reduce((s, r) => s + (Number(r[k]) || 0), 0) })
    sumBgnCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (Number(r[k]) || 0), 0) })
    enrichedRows.push(row)
  })
  {
    const row = { _total: true, currency: localCurrencyCode }
    sumBgnCols.forEach(k => { row[k] = dataRows.reduce((s, r) => s + (Number(r[k]) || 0), 0) })
    enrichedRows.push(row)
  }

  // ── App5 / App13 ─────────────────────────────────────────────────────────
  const sells        = dataRows.filter(r => r.type === 'SELL')
  const taxableSells = sells.filter(r => !isTaxExempt(r, instrumentInfo))
  const exemptSells  = sells.filter(r =>  isTaxExempt(r, instrumentInfo))
  const app5  = summarizeSells(taxableSells)
  const app13 = summarizeSells(exemptSells)

  // ── Column definitions ───────────────────────────────────────────────────
  const numCol    = { key: '#', label: '#', align: 'right', mono: true, decimals: 0 }
  const extraCols = [
    { key: 'totalWithFee',    label: 'Общо + такси (вал)',           align: 'right', mono: true, decimals: 2 },
    { key: 'rate',            label: `Курс (${lcl})`,                align: 'right', mono: true, decimals: 5, nullAs: '—' },
    { key: 'totalWithFeeBGN', label: `Общо + такси (${lcl})`,        align: 'right', mono: true, decimals: 2, nullAs: '—' },
    { key: 'costBasis',       label: 'Цена на придобиване (вал)',     align: 'right', mono: true, decimals: 2, nullAs: '—' },
    { key: 'costBasisBGN',    label: `Цена на придобиване (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
  ]

  const trades = {
    columns: [numCol, ...processedTrades.columns, ...extraCols],
    rows: enrichedRows,
  }

  // ── Last BUY date per symbol ─────────────────────────────────────────────
  const lastBuyDate = {}
  for (const p of (priorPositions || [])) {
    if (p.symbol && p.lastBuyDate) lastBuyDate[p.symbol] = p.lastBuyDate
  }
  enrichedRows.forEach(t => {
    if (t.type === 'BUY' && (!lastBuyDate[t.symbol] || t.date > lastBuyDate[t.symbol])) {
      lastBuyDate[t.symbol] = t.date
    }
  })

  // ── App8 Part I – holdings ───────────────────────────────────────────────
  const netBuyQty = {}
  enrichedRows.forEach(t => {
    const q = t.quantity instanceof Decimal ? t.quantity.toNumber() : Number(t.quantity)
    if (t.type === 'BUY')  netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) + q
    if (t.type === 'SELL') netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) - q
  })

  const app8Holdings = {
    title: '',
    columns: [
      { key: 'symbol',    label: 'Символ',  bold: true, tooltip: 'description' },
      { key: 'type',      label: 'Вид',     bold: true },
      { key: 'country',   label: 'Държава' },
      { key: 'quantity',  label: 'Брой',                        align: 'right', mono: true, decimals: 0 },
      { key: 'acquDate',  label: 'Дата и година на придобиване', shortLabel: 'Дата', mono: true, maxWidth: 80 },
      { key: 'costBasis', label: 'Обща цена в съответната валута', shortLabel: 'Обща цена', align: 'right', mono: true, decimals: 2 },
      { key: 'currency',  label: 'Валута' },
      { key: 'costBGN',   label: `Обща цена в ${lcl}`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ],
    rows: holdings.rows
      .flatMap((h) => {
        const info        = instrumentInfo[h.symbol] || {}
        const type        = info.type === 'ETF' ? 'Дялове' : 'Акции'
        const country     = info.countryName || h.currency
        const description = info.description ?? ''
        const thisYearQty = Math.max(0, Math.min(netBuyQty[h.symbol] ?? 0, h.quantity))
        const priorQty    = h.quantity - thisYearQty
        const costPerShare = h.costBasis / h.quantity
        const acquDateStr = lastBuyDate[h.symbol]
          ? lastBuyDate[h.symbol].split('-').reverse().join('.')
          : null

        const makeRow = (qty, acquDate) => {
          const cost = Math.round(qty * costPerShare * 100) / 100
          return {
            type, country, symbol: h.symbol, description, quantity: qty, acquDate,
            costBasis: cost, currency: h.currency,
            costBGN: acquDate === 'предходна година'
              ? null
              : toLcl(cost, h.currency, yearEndDate)?.toNumber() ?? null,
          }
        }

        if (thisYearQty > 0 && priorQty > 0) {
          return [
            makeRow(thisYearQty, acquDateStr ?? 'предходна година'),
            makeRow(priorQty,    'предходна година'),
          ]
        }
        return [makeRow(h.quantity, acquDateStr ?? 'предходна година')]
      })
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'Акции' ? -1 : 1)),
  }

  // ── App8 Part III – dividends ─────────────────────────────────────────────
  const app8Dividends = {
    columns: [
      { key: 'symbol',             label: 'Символ', bold: true, tooltip: 'description' },
      { key: 'description',        label: 'Наименование на лицето, изплатило дохода', shortLabel: 'Наименование', mono: true, maxWidth: 200 },
      { key: 'countryName',        label: 'Държава' },
      { key: 'incomeCategoryCode', label: 'Код вид доход', shortLabel: 'Код доход' },
      { key: 'methodCode',         label: 'Код за прилагане на метод за избягване на двойното данъчно облагане', shortLabel: 'Код метод' },
      { key: 'grossAmountBGN',     label: 'Брутен размер на дохода, включително платения данък (за доходи с код 8141)', shortLabel: `Брутен доход (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'foreignTaxPaidBGN',  label: 'Платен данък в чужбина', shortLabel: `Данък в чужбина (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'allowableCreditBGN', label: 'Допустим размер на данъчния кредит', shortLabel: `Допустим кредит (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'dueTaxBGN',          label: 'Дължим данък, подлежащ на внасяне по реда на чл. 67, ал. 4 от ЗДДФЛ', shortLabel: `Дължим данък (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ],
    rows: dividends.rows.map((d) => {
      const grossD    = toLcl(d.grossAmount, d.currency, d.date)
      const withheldD = toLcl(d.withheldTax, d.currency, d.date)
      const grossBGN     = grossD    ? grossD.toNumber()    : null
      const withheldBGN  = withheldD ? withheldD.toNumber() : null
      const bgTaxBGN     = grossBGN != null ? new Decimal(grossBGN).times(BG_DIVIDEND_TAX_RATE).toNumber() : null

      const partialCredit = bgTaxBGN != null && withheldBGN != null && withheldBGN < bgTaxBGN
        ? withheldBGN : null
      const allowableBGN = d.taxCode === 1 ? partialCredit : null
      const dueTaxBGN    = bgTaxBGN != null && withheldBGN != null
        ? Math.max(0, new Decimal(bgTaxBGN).minus(withheldBGN ?? 0).toNumber())
        : bgTaxBGN

      return {
        symbol: d.symbol, description: instrumentInfo[d.symbol]?.description ?? '',
        countryName: d.countryName, incomeCategoryCode: 8141, methodCode: d.taxCode,
        grossAmountBGN: grossBGN, foreignTaxPaidBGN: withheldBGN,
        allowableCreditBGN: allowableBGN, dueTaxBGN,
      }
    }),
  }

  // ── Enrich interest with local currency + totals ─────────────────────────
  const interestDataRows = [...interest.rows]
  interest.rows.forEach((r) => {
    const d = toLcl(r.amount, r.currency, r.date)
    r.amountBGN = d ? d.toNumber() : null
  })
  // Update the amountBGN column label
  const amtLclCol = interest.columns.find(c => c.key === 'amountBGN')
  if (amtLclCol) amtLclCol.label = `Сума (${lcl})`
  // Add totals per original currency, then local-currency grand total
  ;['EUR', 'USD'].forEach(cur => {
    const subset = interestDataRows.filter(r => r.currency === cur)
    if (subset.length === 0) return
    interest.rows.push({
      _total: true, currency: cur, description: 'Общо',
      amount:    subset.reduce((s, r) => s + (r.amount    ?? 0), 0),
      amountBGN: subset.reduce((s, r) => s + (r.amountBGN ?? 0), 0),
    })
  })
  interest.rows.push({
    _total: true, currency: localCurrencyCode, description: 'Общо',
    amountBGN: interestDataRows.reduce((s, r) => s + (r.amountBGN ?? 0), 0),
  })

  // ── Holdings totals ──────────────────────────────────────────────────────
  const holdingSumCols = ['quantity', 'costBasis', 'costPrice', 'value', 'unrealizedPL']
  ;['EUR', 'USD'].forEach(cur => {
    const subset = holdings.rows.filter(r => r.currency === cur)
    if (subset.length === 0) return
    const row = { _total: true, currency: cur }
    holdingSumCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
    holdings.rows.push(row)
  })

  return {
    trades,
    holdings,
    dividends,
    interest,
    taxSummary: { app5, app13, app8Holdings, app8Dividends },
    taxYear,
    localCurrencyCode,
    localCurrencyLabel,
  }
}
