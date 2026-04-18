import Decimal from 'decimal.js'
import { parseOpenPositions } from '../domain/parser/parseOpenPositions.js'
import { expandByAliases } from '../domain/parser/parseFinancialInstrumentInfo.js'
import {
  toLocalCurrency,
  getLocalCurrencyCode, getLocalCurrencyLabel,
  getYearEndDate, getPrevYearEndDate,
} from '../domain/fx/fxRates.js'
import { IBKR_EXCHANGES, EU_COUNTRY_CODES } from '../domain/constants.js'

const D0 = new Decimal(0)
const BG_DIVIDEND_TAX_RATE = new Decimal('0.05')

function isTaxExempt(trade, instrumentInfo) {
  if (instrumentInfo[trade.symbol]?.type !== 'ETF') return false
  const exch = IBKR_EXCHANGES[trade.exchange]
  return exch?.regulated && EU_COUNTRY_CODES.has(instrumentInfo[trade.symbol]?.country)
}

function summarizeSells(sells) {
  const profits = sells.reduce((s, r) => {
    const pl = new Decimal(r.proceedsBGN ?? 0).minus(r.costBasisBGN ?? 0)
    return pl.gt(0) ? s.plus(pl) : s
  }, D0).toNumber()
  const losses = sells.reduce((s, r) => {
    const pl = new Decimal(r.proceedsBGN ?? 0).minus(r.costBasisBGN ?? 0)
    return pl.lt(0) ? s.plus(pl.abs()) : s
  }, D0).toNumber()
  return {
    totalProceedsBGN:  sells.reduce((s, r) => s.plus(r.proceedsBGN  ?? 0), D0).toNumber(),
    totalCostBasisBGN: sells.reduce((s, r) => s.plus(r.costBasisBGN ?? 0), D0).toNumber(),
    profits,
    losses,
  }
}

/**
 * Process parsed InputData and confirmed prior-year positions into a ResultData object.
 * Pure function — no file I/O.
 *
 * @param {InputData} input  — from readInput()
 * @param {PriorPosition[]} priorPositions  — user-confirmed prior-year cost basis
 * @returns {ResultData}
 */
export function calculate(input, priorPositions = []) {
  const { taxYear, instrumentInfo, trades, csvTradeBasis, dividends, interest, csvRows } = input

  const localCurrencyCode  = getLocalCurrencyCode(taxYear)
  const localCurrencyLabel = getLocalCurrencyLabel(taxYear)
  const lcl                = localCurrencyLabel
  const yearEndDate        = getYearEndDate(taxYear)
  const prevYearEndDate    = getPrevYearEndDate(taxYear)

  const toLcl = (amount, currency, dateStr) =>
    toLocalCurrency(amount, currency, dateStr, taxYear)

  // Sort by symbol then date for correct weighted-average cost tracking
  const sortedTrades = [...trades.rows].sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
    return new Date(a.dateTime) - new Date(b.dateTime)
  })

  // Seed positions from confirmed prior-year data
  const initialPositions = {}
  for (const p of priorPositions) {
    if (!p.symbol) continue
    initialPositions[p.symbol] = {
      qty:     new Decimal(String(p.qty)),
      cost:    new Decimal(String(p.costUSD)),
      costBGN: new Decimal(String(p.costBGN)),
    }
  }

  // Process each trade — BUY accumulates cost, SELL realises gain/loss
  const { positions, rows: enrichedRows } = sortedTrades.reduce(
    (acc, t, i) => {
      if (!acc.positions[t.symbol]) {
        acc.positions[t.symbol] = { qty: D0, cost: D0, costBGN: D0 }
      }
      const pos = acc.positions[t.symbol]

      const exempt    = t.type === 'SELL' && isTaxExempt(t, instrumentInfo)
      const proceedsD = t.proceeds instanceof Decimal ? t.proceeds : new Decimal(String(t.proceeds ?? 0))
      const commD     = t.comm    instanceof Decimal ? t.comm    : new Decimal(String(t.comm    ?? 0))
      const feeD      = t.fee     instanceof Decimal ? t.fee     : new Decimal(String(t.fee     ?? 0))
      const totalD    = proceedsD.plus(commD).plus(feeD)
      const totalLclD = toLcl(totalD, t.currency, t.date)
      const rateD     = toLcl(new Decimal(1), t.currency, t.date)

      let costBasis          = null
      let costBasisBGN       = null
      let costBasisBGNApprox = false

      if (t.type === 'BUY') {
        pos.qty     = pos.qty.plus(t.quantity)
        pos.cost    = pos.cost.plus(totalD.neg())
        pos.costBGN = pos.costBGN.plus((totalLclD ?? D0).neg())
      }

      if (t.type === 'SELL') {
        const qtyD = t.quantity instanceof Decimal ? t.quantity : new Decimal(String(t.quantity))

        if (pos.qty.isZero()) {
          // No BUY in current dataset — fall back to IBKR CSV basis
          const csvBasisD = csvTradeBasis.get(`${t.symbol}|${t.date}|${qtyD.toFixed(0)}`)
          if (csvBasisD) {
            costBasis          = csvBasisD.toNumber()
            costBasisBGN       = toLcl(csvBasisD, t.currency, prevYearEndDate)?.toNumber() ?? null
            costBasisBGNApprox = true
          }
        } else {
          const cbD    = pos.cost.div(pos.qty).times(qtyD)
          const cbBGND = pos.costBGN.div(pos.qty).times(qtyD)
          costBasis    = cbD.toNumber()
          costBasisBGN = cbBGND.toNumber()
          pos.qty     = pos.qty.minus(qtyD)
          pos.cost    = pos.cost.minus(cbD)
          pos.costBGN = pos.costBGN.minus(cbBGND)
        }
      }

      const taxable       = t.type !== 'SELL' ? null : !exempt
      const proceedsBGN   = t.type === 'SELL' && totalLclD ? totalLclD.toNumber() : null
      const realizedPLBGN = proceedsBGN != null && costBasisBGN != null
        ? new Decimal(proceedsBGN).minus(costBasisBGN).toNumber() : null

      acc.rows.push({
        ...t,
        '#':             i + 1,
        taxable,
        taxExemptLabel:  t.type !== 'SELL' ? '' : exempt ? 'Освободен' : 'Облагаем',
        rate:            rateD ? rateD.toNumber() : null,
        totalWithFee:    totalD.toNumber(),
        totalWithFeeBGN: totalLclD ? totalLclD.toNumber() : null,
        costBasis,
        costBasisBGN,
        costBasisBGNApprox,
        proceedsBGN,
        realizedPLBGN,
      })

      return acc
    },
    { positions: initialPositions, rows: [] }
  )

  // Rebuild holdings using calculated weighted-average cost basis
  const positionsCostBasis = expandByAliases(
    Object.fromEntries(
      Object.entries(positions).map(([sym, pos]) => [
        sym,
        { cost: pos.cost.toNumber(), qty: pos.qty.toNumber(), costBGN: pos.costBGN.toNumber() },
      ])
    ),
    instrumentInfo
  )
  const holdings = parseOpenPositions(csvRows, instrumentInfo, positionsCostBasis)

  // ── Trade totals rows ────────────────────────────────────────────────────
  const dataRows   = [...enrichedRows]
  const sumCols    = ['proceeds', 'comm', 'fee', 'totalWithFee']
  const sumLclCols = ['totalWithFeeBGN']

  for (const cur of ['EUR', 'USD']) {
    const subset = dataRows.filter(r => r.currency === cur)
    if (subset.length === 0) continue
    const row = { _total: true, currency: cur }
    sumCols.forEach(k    => { row[k] = subset.reduce((s, r) => s + (Number(r[k]) || 0), 0) })
    sumLclCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (Number(r[k]) || 0), 0) })
    enrichedRows.push(row)
  }
  enrichedRows.push({
    _total: true,
    currency: localCurrencyCode,
    ...Object.fromEntries(
      sumLclCols.map(k => [k, dataRows.reduce((s, r) => s + (Number(r[k]) || 0), 0)])
    ),
  })

  // ── App5 / App13 initial summaries ───────────────────────────────────────
  const sells        = dataRows.filter(r => r.type === 'SELL')
  const taxableSells = sells.filter(r => !isTaxExempt(r, instrumentInfo))
  const exemptSells  = sells.filter(r =>  isTaxExempt(r, instrumentInfo))

  // ── Last BUY date per symbol ─────────────────────────────────────────────
  const lastBuyDate = {}
  for (const p of priorPositions) {
    if (p.symbol && p.lastBuyDate) lastBuyDate[p.symbol] = p.lastBuyDate
  }
  for (const t of enrichedRows) {
    if (t._total || t.type !== 'BUY') continue
    if (!lastBuyDate[t.symbol] || t.date > lastBuyDate[t.symbol]) {
      lastBuyDate[t.symbol] = t.date
    }
  }
  const lastBuyDateExpanded = expandByAliases(lastBuyDate, instrumentInfo)

  // ── Net buy qty per symbol (for App8 holdings split by acquisition year) ─
  const netBuyQty = {}
  for (const t of enrichedRows) {
    if (t._total) continue
    const q = t.quantity instanceof Decimal ? t.quantity.toNumber() : Number(t.quantity)
    if (t.type === 'BUY')  netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) + q
    if (t.type === 'SELL') netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) - q
  }
  const netBuyQtyExpanded = expandByAliases(netBuyQty, instrumentInfo)

  // ── App8 Part I — year-end holdings ─────────────────────────────────────
  const app8Holdings = {
    columns: [
      { key: 'symbol',    label: 'Символ',                        bold: true, tooltip: 'description' },
      { key: 'type',      label: 'Вид',                           bold: true },
      { key: 'country',   label: 'Държава' },
      { key: 'quantity',  label: 'Брой',                          align: 'right', mono: true, decimals: 0 },
      { key: 'acquDate',  label: 'Дата и година на придобиване',  shortLabel: 'Дата', mono: true, maxWidth: 80 },
      { key: 'costBasis', label: 'Обща цена в съответната валута', shortLabel: 'Обща цена', align: 'right', mono: true, decimals: 2 },
      { key: 'currency',  label: 'Валута' },
      { key: 'costBGN',   label: `Обща цена в ${lcl}`,           align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ],
    rows: holdings.rows
      .flatMap(h => {
        const info         = instrumentInfo[h.symbol] || {}
        const type         = info.type === 'ETF' ? 'Дялове' : 'Акции'
        const country      = info.countryName || h.currency
        const description  = info.description ?? ''
        const thisYearQty  = Math.max(0, Math.min(netBuyQtyExpanded[h.symbol] ?? 0, h.quantity))
        const priorQty     = h.quantity - thisYearQty
        const costPerShare = h.costBasis / h.quantity
        const acquDateStr  = lastBuyDateExpanded[h.symbol]
          ? lastBuyDateExpanded[h.symbol].split('-').reverse().join('.')
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

        if (thisYearQty > 0 && priorQty > 0) return [
          makeRow(thisYearQty, acquDateStr ?? 'предходна година'),
          makeRow(priorQty,    'предходна година'),
        ]
        return [makeRow(h.quantity, acquDateStr ?? 'предходна година')]
      })
      .sort((a, b) => a.type === b.type ? 0 : a.type === 'Акции' ? -1 : 1),
  }

  // ── App8 Part III — dividends ────────────────────────────────────────────
  const app8Dividends = {
    columns: [
      { key: 'symbol',             label: 'Символ', bold: true, tooltip: 'description' },
      { key: 'description',        label: 'Наименование на лицето, изплатило дохода',                              shortLabel: 'Наименование',    mono: true, maxWidth: 200 },
      { key: 'countryName',        label: 'Държава' },
      { key: 'incomeCategoryCode', label: 'Код вид доход',                                                         shortLabel: 'Код доход' },
      { key: 'methodCode',         label: 'Код за прилагане на метод за избягване на двойното данъчно облагане',   shortLabel: 'Код метод' },
      { key: 'grossAmountBGN',     label: 'Брутен размер на дохода, включително платения данък (за доходи с код 8141)', shortLabel: `Брутен доход (${lcl})`,    align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'foreignTaxPaidBGN',  label: 'Платен данък в чужбина',                                               shortLabel: `Данък в чужбина (${lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'allowableCreditBGN', label: 'Допустим размер на данъчния кредит',                                    shortLabel: `Допустим кредит (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'dueTaxBGN',          label: 'Дължим данък, подлежащ на внасяне по реда на чл. 67, ал. 4 от ЗДДФЛ', shortLabel: `Дължим данък (${lcl})`,      align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ],
    rows: dividends.rows.map(d => {
      const grossD      = toLcl(d.grossAmount, d.currency, d.date)
      const withheldD   = toLcl(d.withheldTax, d.currency, d.date)
      const grossBGN    = grossD    ? grossD.toNumber()    : null
      const withheldBGN = withheldD ? withheldD.toNumber() : null
      const bgTaxBGN    = grossBGN != null
        ? new Decimal(grossBGN).times(BG_DIVIDEND_TAX_RATE).toNumber() : null

      const partialCredit = bgTaxBGN != null && withheldBGN != null && withheldBGN < bgTaxBGN
        ? withheldBGN : null
      const allowableBGN = d.taxCode === 1 ? partialCredit : null
      const dueTaxBGN    = bgTaxBGN != null && withheldBGN != null
        ? Math.max(0, new Decimal(bgTaxBGN).minus(withheldBGN).toNumber())
        : bgTaxBGN

      return {
        symbol:             d.symbol,
        description:        instrumentInfo[d.symbol]?.description ?? '',
        countryName:        d.countryName,
        incomeCategoryCode: 8141,
        methodCode:         d.taxCode,
        grossAmountBGN:     grossBGN,
        foreignTaxPaidBGN:  withheldBGN,
        allowableCreditBGN: allowableBGN,
        dueTaxBGN,
      }
    }),
  }

  // ── Interest with local-currency amounts + totals ────────────────────────
  const dataInterestRows = interest.rows.map(r => ({
    ...r,
    amountBGN: toLcl(r.amount, r.currency, r.date)?.toNumber() ?? null,
  }))
  const enrichedInterestRows = [...dataInterestRows]
  for (const cur of ['EUR', 'USD']) {
    const subset = dataInterestRows.filter(r => r.currency === cur)
    if (subset.length === 0) continue
    enrichedInterestRows.push({
      _total: true, currency: cur, description: 'Общо',
      amount:    subset.reduce((s, r) => s + (r.amount    ?? 0), 0),
      amountBGN: subset.reduce((s, r) => s + (r.amountBGN ?? 0), 0),
    })
  }
  enrichedInterestRows.push({
    _total: true, currency: localCurrencyCode, description: 'Общо',
    amountBGN: dataInterestRows.reduce((s, r) => s + (r.amountBGN ?? 0), 0),
  })
  const interestColumns = [
    ...interest.columns,
    { key: 'amountBGN', label: `Сума (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
  ]

  // ── Holdings totals rows ─────────────────────────────────────────────────
  const holdingSumCols      = ['quantity', 'costBasis', 'costPrice', 'value', 'unrealizedPL']
  const enrichedHoldingRows = [...holdings.rows]
  for (const cur of ['EUR', 'USD']) {
    const subset = holdings.rows.filter(r => r.currency === cur)
    if (subset.length === 0) continue
    const row = { _total: true, currency: cur }
    holdingSumCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
    enrichedHoldingRows.push(row)
  }

  // ── Trade column definitions ─────────────────────────────────────────────
  const tradeColumns = [
    { key: '#',              label: '#',                             align: 'right', mono: true, decimals: 0 },
    ...trades.columns,
    { key: 'totalWithFee',    label: 'Общо + такси (вал)',           align: 'right', mono: true, decimals: 2 },
    { key: 'rate',            label: `Курс (${lcl})`,               align: 'right', mono: true, decimals: 5, nullAs: '—' },
    { key: 'totalWithFeeBGN', label: `Общо + такси (${lcl})`,       align: 'right', mono: true, decimals: 2, nullAs: '—' },
    { key: 'costBasis',       label: 'Цена на придобиване (вал)',    align: 'right', mono: true, decimals: 2, nullAs: '—' },
    { key: 'costBasisBGN',    label: `Цена на придобиване (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
  ]

  return {
    trades:   { columns: tradeColumns, rows: enrichedRows },
    holdings: { columns: holdings.columns, rows: enrichedHoldingRows },
    dividends,
    interest: { columns: interestColumns, rows: enrichedInterestRows },
    taxSummary: {
      app5:         summarizeSells(taxableSells),
      app13:        summarizeSells(exemptSells),
      app8Holdings,
      app8Dividends,
    },
    taxYear,
    localCurrencyCode,
    localCurrencyLabel,
  }
}
