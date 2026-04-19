import Decimal from 'decimal.js'
import { buildOpenPositions } from '../../parser/parseOpenPositions.js'
import { buildInstrumentInfo, expandByAliases } from '../../parser/parseInstruments.js'
import { buildCsvTradeBasis } from '../../parser/parseCsvTrades.js'
import {
  toLocalCurrency,
  getLocalCurrencyCode, getLocalCurrencyLabel,
  getYearEndDate, getPrevYearEndDate,
} from '../../fx/fxRates.js'
import { IBKR_EXCHANGES, EU_COUNTRY_CODES } from '../../constants.js'
import { isTaxable } from '../../instrument/classifier.js'
import { TaxStrategy } from './TaxStrategy.js'

const D0 = new Decimal(0)
const BG_DIVIDEND_TAX_RATE = new Decimal('0.05')

function toD(v) {
  if (v instanceof Decimal) return v
  const s = String(v ?? 0).replace(/,/g, '').trim()
  try { return new Decimal(s) } catch { return D0 }
}

function makeInstrument(trade, instrumentInfo) {
  const info = instrumentInfo[trade.symbol]
  const exch = IBKR_EXCHANGES[trade.exchange]
  return {
    name: info?.description ?? '',
    isRegulatedMarket: exch?.regulated === true && EU_COUNTRY_CODES.has(info?.country),
  }
}

function summarizeSells(sells) {
  const profits = sells.reduce((s, r) => {
    const pl = new Decimal(r.proceedsLcl ?? 0).minus(r.costBasisLcl ?? 0)
    return pl.gt(0) ? s.plus(pl) : s
  }, D0).toNumber()
  const losses = sells.reduce((s, r) => {
    const pl = new Decimal(r.proceedsLcl ?? 0).minus(r.costBasisLcl ?? 0)
    return pl.lt(0) ? s.plus(pl.abs()) : s
  }, D0).toNumber()
  return {
    totalProceedsLcl:  sells.reduce((s, r) => s.plus(r.proceedsLcl  ?? 0), D0).toNumber(),
    totalCostBasisLcl: sells.reduce((s, r) => s.plus(r.costBasisLcl ?? 0), D0).toNumber(),
    profits,
    losses,
  }
}

function matchDividends(rawDividends, rawWithholdingTax, instrumentInfo) {
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

export class TaxStrategy2026 extends TaxStrategy {
  calculate(input, priorPositions = []) {
    const { taxYear } = input

    const instrumentInfo = buildInstrumentInfo(input.instruments)
    const csvTradeBasis  = buildCsvTradeBasis(input.csvTrades)

    const localCurrencyCode  = getLocalCurrencyCode(taxYear)
    const localCurrencyLabel = getLocalCurrencyLabel(taxYear)
    const lcl                = localCurrencyLabel
    const yearEndDate        = getYearEndDate(taxYear)
    const prevYearEndDate    = getPrevYearEndDate(taxYear)

    const toLcl = (amount, currency, dateStr) =>
      toLocalCurrency(amount, currency, dateStr, taxYear)

    const sortedTrades = [...input.trades].sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
      return new Date(a.datetime) - new Date(b.datetime)
    })

    const initialPositions = {}
    for (const p of priorPositions) {
      if (!p.symbol) continue
      initialPositions[p.symbol] = {
        qty:     new Decimal(String(p.qty)),
        cost:    new Decimal(String(p.costUSD)),
        costLcl: new Decimal(String(p.costBGN)),
      }
    }

    const { positions, rows: enrichedRows } = sortedTrades.reduce(
      (acc, t, i) => {
        if (!acc.positions[t.symbol]) {
          acc.positions[t.symbol] = { qty: D0, cost: D0, costLcl: D0 }
        }
        const pos = acc.positions[t.symbol]

        const date      = t.datetime.split(/[,\s]/)[0]
        const exempt    = t.side === 'SELL' && !isTaxable(makeInstrument(t, instrumentInfo))
        const proceedsD = toD(t.proceeds)
        const commD     = toD(t.commission)
        const feeD      = toD(t.fee)
        const rawQtyD   = toD(t.quantity)
        const qtyD      = rawQtyD.abs()
        const totalD    = proceedsD.plus(commD).plus(feeD)
        const totalLclD = toLcl(totalD, t.currency, date)
        const rateD     = toLcl(new Decimal(1), t.currency, date)

        let costBasis          = null
        let costBasisLcl       = null
        let costBasisLclApprox = false

        if (t.side === 'BUY') {
          pos.qty     = pos.qty.plus(qtyD)
          pos.cost    = pos.cost.plus(totalD.neg())
          pos.costLcl = pos.costLcl.plus((totalLclD ?? D0).neg())
        }

        if (t.side === 'SELL') {
          if (pos.qty.isZero()) {
            const csvBasisD = csvTradeBasis.get(`${t.symbol}|${date}|${qtyD.toFixed(0)}`)
            if (csvBasisD) {
              costBasis          = csvBasisD.toNumber()
              costBasisLcl       = toLcl(csvBasisD, t.currency, prevYearEndDate)?.toNumber() ?? null
              costBasisLclApprox = true
            }
          } else {
            const cbD    = pos.cost.div(pos.qty).times(qtyD)
            const cbLclD = pos.costLcl.div(pos.qty).times(qtyD)
            costBasis    = cbD.toNumber()
            costBasisLcl = cbLclD.toNumber()
            pos.qty     = pos.qty.minus(qtyD)
            pos.cost    = pos.cost.minus(cbD)
            pos.costLcl = pos.costLcl.minus(cbLclD)
          }
        }

        const taxable    = t.side !== 'SELL' ? null : !exempt
        const proceedsLcl = t.side === 'SELL' && totalLclD ? totalLclD.toNumber() : null
        const realizedPLLcl = proceedsLcl != null && costBasisLcl != null
          ? new Decimal(proceedsLcl).minus(costBasisLcl).toNumber() : null

        acc.rows.push({
          symbol:          t.symbol,
          datetime:        t.datetime,
          settleDate:      t.settleDate,
          exchange:        t.exchange,
          currency:        t.currency,
          side:            t.side,
          price:           t.price,
          orderType:       t.orderType,
          code:            t.code,
          '#':             i + 1,
          date,
          quantityDisplay: qtyD.toString(),
          proceeds:        proceedsD.toNumber(),
          commission:      commD.toNumber(),
          fee:             feeD.toNumber(),
          taxable,
          taxExemptLabel:  t.side !== 'SELL' ? '' : exempt ? 'Освободен' : 'Облагаем',
          rate:            rateD ? rateD.toNumber() : null,
          totalWithFee:    totalD.toNumber(),
          totalWithFeeLcl: totalLclD ? totalLclD.toNumber() : null,
          costBasis,
          costBasisLcl,
          costBasisLclApprox,
          proceedsLcl,
          realizedPLLcl,
        })

        return acc
      },
      { positions: initialPositions, rows: [] }
    )

    const positionsCostBasis = expandByAliases(
      Object.fromEntries(
        Object.entries(positions).map(([sym, pos]) => [
          sym,
          { cost: pos.cost.toNumber(), qty: pos.qty.toNumber(), costBGN: pos.costLcl.toNumber() },
        ])
      ),
      instrumentInfo
    )
    const holdings = buildOpenPositions(input.openPositions, instrumentInfo, positionsCostBasis)

    const dataRows   = [...enrichedRows]
    const sumCols    = ['proceeds', 'commission', 'fee', 'totalWithFee']
    const sumLclCols = ['totalWithFeeLcl']

    for (const cur of ['EUR', 'USD']) {
      const subset = dataRows.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      const row = { _total: true, currency: cur }
      sumCols.forEach(k    => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      sumLclCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      enrichedRows.push(row)
    }
    enrichedRows.push({
      _total: true,
      currency: localCurrencyCode,
      ...Object.fromEntries(
        sumLclCols.map(k => [k, dataRows.reduce((s, r) => s + (r[k] ?? 0), 0)])
      ),
    })

    const sells        = dataRows.filter(r => r.side === 'SELL')
    const taxableSells = sells.filter(r => r.taxable !== false)
    const exemptSells  = sells.filter(r => r.taxable === false)

    const lastBuyDate = {}
    for (const p of priorPositions) {
      if (p.symbol && p.lastBuyDate) lastBuyDate[p.symbol] = p.lastBuyDate
    }
    for (const t of enrichedRows) {
      if (t._total || t.side !== 'BUY') continue
      if (!lastBuyDate[t.symbol] || t.date > lastBuyDate[t.symbol]) {
        lastBuyDate[t.symbol] = t.date
      }
    }
    const lastBuyDateExpanded = expandByAliases(lastBuyDate, instrumentInfo)

    const netBuyQty = {}
    for (const t of enrichedRows) {
      if (t._total) continue
      const q = Number(t.quantityDisplay) || 0
      if (t.side === 'BUY')  netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) + q
      if (t.side === 'SELL') netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) - q
    }
    const netBuyQtyExpanded = expandByAliases(netBuyQty, instrumentInfo)

    const app8Holdings = {
      columns: [
        { key: 'symbol',    label: 'Символ',                        bold: true, tooltip: 'description' },
        { key: 'type',      label: 'Вид',                           bold: true },
        { key: 'country',   label: 'Държава' },
        { key: 'quantity',  label: 'Брой',                          align: 'right', mono: true, decimals: 0 },
        { key: 'acquDate',  label: 'Дата и година на придобиване',  shortLabel: 'Дата', mono: true, maxWidth: 80 },
        { key: 'costBasis', label: 'Обща цена в съответната валута', shortLabel: 'Обща цена', align: 'right', mono: true, decimals: 2 },
        { key: 'currency',  label: 'Валута' },
        { key: 'costLcl',   label: `Обща цена в ${lcl}`,           align: 'right', mono: true, decimals: 2, nullAs: '—' },
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
              costLcl: acquDate === 'предходна година'
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

    const matchedDividends = matchDividends(input.dividends, input.withholdingTax, instrumentInfo)

    const app8Dividends = {
      columns: [
        { key: 'symbol',              label: 'Символ', bold: true, tooltip: 'description' },
        { key: 'description',         label: 'Наименование на лицето, изплатило дохода',                              shortLabel: 'Наименование',    mono: true, maxWidth: 200 },
        { key: 'countryName',         label: 'Държава' },
        { key: 'incomeCategoryCode',  label: 'Код вид доход',                                                         shortLabel: 'Код доход' },
        { key: 'methodCode',          label: 'Код за прилагане на метод за избягване на двойното данъчно облагане',   shortLabel: 'Код метод' },
        { key: 'grossAmountLcl',      label: 'Брутен размер на дохода, включително платения данък (за доходи с код 8141)', shortLabel: `Брутен доход (${lcl})`,    align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'foreignTaxPaidLcl',   label: 'Платен данък в чужбина',                                               shortLabel: `Данък в чужбина (${lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'allowableCreditLcl',  label: 'Допустим размер на данъчния кредит',                                    shortLabel: `Допустим кредит (${lcl})`, align: 'right', mono: true, decimals: 2, nullAs: '—' },
        { key: 'dueTaxLcl',           label: 'Дължим данък, подлежащ на внасяне по реда на чл. 67, ал. 4 от ЗДДФЛ', shortLabel: `Дължим данък (${lcl})`,      align: 'right', mono: true, decimals: 2, nullAs: '—' },
      ],
      rows: matchedDividends.map(d => {
        const grossD      = toLcl(d.grossAmount, d.currency, d.date)
        const withheldD   = toLcl(d.withheldTax, d.currency, d.date)
        const grossLcl    = grossD    ? grossD.toNumber()    : null
        const withheldLcl = withheldD ? withheldD.toNumber() : null
        const bgTaxLcl    = grossLcl != null
          ? new Decimal(grossLcl).times(BG_DIVIDEND_TAX_RATE).toNumber() : null

        const partialCredit = bgTaxLcl != null && withheldLcl != null && withheldLcl < bgTaxLcl
          ? withheldLcl : null
        const allowableLcl = d.taxCode === 1 ? partialCredit : null
        const dueTaxLcl    = bgTaxLcl != null && withheldLcl != null
          ? Math.max(0, new Decimal(bgTaxLcl).minus(withheldLcl).toNumber())
          : bgTaxLcl

        return {
          symbol:             d.symbol,
          description:        instrumentInfo[d.symbol]?.description ?? '',
          countryName:        d.countryName,
          incomeCategoryCode: 8141,
          methodCode:         d.taxCode,
          grossAmountLcl,
          foreignTaxPaidLcl:  withheldLcl,
          allowableCreditLcl: allowableLcl,
          dueTaxLcl,
        }
      }),
    }

    const dividends = {
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
      rows: matchedDividends,
    }

    const dataInterestRows = input.interest.map(r => ({
      ...r,
      amount:     parseFloat(r.amount) || 0,
      amountLcl:  toLcl(toD(r.amount), r.currency, r.date)?.toNumber() ?? null,
    }))
    const enrichedInterestRows = [...dataInterestRows]
    for (const cur of ['EUR', 'USD']) {
      const subset = dataInterestRows.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      enrichedInterestRows.push({
        _total: true, currency: cur, description: 'Общо',
        amount:    subset.reduce((s, r) => s + (r.amount    ?? 0), 0),
        amountLcl: subset.reduce((s, r) => s + (r.amountLcl ?? 0), 0),
      })
    }
    enrichedInterestRows.push({
      _total: true, currency: localCurrencyCode, description: 'Общо',
      amountLcl: dataInterestRows.reduce((s, r) => s + (r.amountLcl ?? 0), 0),
    })
    const interestColumns = [
      { key: 'date',        label: 'Дата',           mono: true },
      { key: 'currency',    label: 'Валута' },
      { key: 'description', label: 'Описание' },
      { key: 'amount',      label: 'Сума',           align: 'right', mono: true, decimals: 2 },
      { key: 'amountLcl',   label: `Сума (${lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ]

    const holdingSumCols      = ['quantity', 'costBasis', 'costPrice', 'value', 'unrealizedPL']
    const enrichedHoldingRows = [...holdings.rows]
    for (const cur of ['EUR', 'USD']) {
      const subset = holdings.rows.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      const row = { _total: true, currency: cur }
      holdingSumCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      enrichedHoldingRows.push(row)
    }

    const tradeColumns = [
      { key: '#',               label: '#',                              align: 'right', mono: true, decimals: 0 },
      { key: 'taxable',         label: 'Облагаем?',                     editable: 'checkbox' },
      { key: 'taxExemptLabel',  label: 'Данъчен статус',                chip: true, chipColors: { 'Освободен': 'success', 'Облагаем': 'default' } },
      { key: 'symbol',          label: 'Symbol',                        bold: true },
      { key: 'datetime',        label: 'Trade Date/Time',               mono: true },
      { key: 'exchange',        label: 'Exchange' },
      { key: 'currency',        label: 'Currency' },
      { key: 'side',            label: 'Type',                          chip: true, chipColors: { BUY: 'primary', SELL: 'secondary' } },
      { key: 'quantityDisplay', label: 'Quantity',                      align: 'right', mono: true },
      { key: 'price',           label: 'Price',                         align: 'right', mono: true },
      { key: 'proceeds',        label: 'Proceeds',                      align: 'right', mono: true, decimals: 2 },
      { key: 'commission',      label: 'Commission',                    align: 'right', mono: true, decimals: 2 },
      { key: 'fee',             label: 'Fee',                           align: 'right', mono: true, decimals: 2 },
      { key: 'totalWithFee',    label: 'Общо + такси (вал)',            align: 'right', mono: true, decimals: 2 },
      { key: 'rate',            label: `Курс (${lcl})`,                align: 'right', mono: true, decimals: 5, nullAs: '—' },
      { key: 'totalWithFeeLcl', label: `Общо + такси (${lcl})`,        align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'costBasis',       label: 'Цена на придобиване (вал)',     align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'costBasisLcl',    label: `Цена на придобиване (${lcl})`,  align: 'right', mono: true, decimals: 2, nullAs: '—' },
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
}
