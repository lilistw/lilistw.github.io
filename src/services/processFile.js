import { parseCSV } from "../infra/csvReader.js";
import { parseOpenPositions } from "../domain/parser/parseOpenPositions.js";
import { parseFinancialInstrumentInfo } from "../domain/parser/parseFinancialInstrumentInfo.js";
import { parseDividends } from "../domain/parser/parseDividends.js";
import { parseInterest } from "../domain/parser/parseInterest.js";
import { toBGN, YEAR_END_DATE } from "../domain/fx/fxRates.js";
import { processHtmlFile } from "./processHtmlFile.js";
import { IBKR_EXCHANGES } from '../domain/constants.js'
import { EU_COUNTRY_CODES } from "../domain/constants.js";

const BG_DIVIDEND_TAX_RATE = 0.05;


function isTaxExempt(trade, instrumentInfo) {
  if (instrumentInfo[trade.symbol]?.type !== 'ETF') return false
  const exch = IBKR_EXCHANGES[trade.exchange]
  const isEuEtf = EU_COUNTRY_CODES.has(instrumentInfo[trade.symbol]?.country) // ISIN starts with EU country code
  return exch?.regulated && isEuEtf
}

function summarizeSells(sells) {
  const totalProceedsBGN  = sells.reduce((s, t) => s + (t.proceedsBGN  ?? 0), 0)
  const totalCostBasisBGN = sells.reduce((s, t) => s + (t.costBasisBGN ?? 0), 0)
  const profits = sells.reduce((s, t) => t.realizedPLBGN > 0 ? s + t.realizedPLBGN : s, 0)
  const losses  = sells.reduce((s, t) => t.realizedPLBGN < 0 ? s + Math.abs(t.realizedPLBGN) : s, 0)
  return { totalProceedsBGN, totalCostBasisBGN, profits, losses }
}

export async function processFile({csvFile, htmlFile}) {
  const processedTrades = await processHtmlFile(htmlFile);
  const text = await csvFile.text();

  const rows = parseCSV(text);

  const instrumentInfo = parseFinancialInstrumentInfo(rows);
  const dividends = parseDividends(rows, instrumentInfo);
  const interest = parseInterest(rows);

const sortedTrades = [...processedTrades.rows].sort((a, b) => {
  // first by symbol
  if (a.symbol !== b.symbol) {
    return a.symbol.localeCompare(b.symbol)
  }

  // then by date
  return new Date(a.dateTime) - new Date(b.dateTime)
})

const result = sortedTrades.reduce((acc, t, i) => {
  const key = t.symbol

  if (!acc.positions[key]) {
    acc.positions[key] = { qty: 0, cost: 0, costBGN: 0 }
  }

  const pos = acc.positions[key]

  const rate = toBGN(1, t.currency, t.date)
  const totalWithFee = t.proceeds + t.comm + t.fee
  const totalWithFeeBGN = toBGN(totalWithFee, t.currency, t.date)

  const exempt = t.type === 'SELL' && isTaxExempt(t, instrumentInfo)

  let costBasis = null
  let costBasisBGN = null

  if (t.type === 'BUY') {
    pos.qty += t.quantity
    pos.cost += -totalWithFee
    pos.costBGN += -totalWithFeeBGN
  }

  if (t.type === 'SELL') {

    const avgCost = pos.cost / pos.qty
    costBasis = avgCost * t.quantity
    costBasisBGN = toBGN(costBasis, t.currency, t.date)

    pos.qty -= t.quantity
    pos.cost -= costBasis
    pos.costBGN -= costBasisBGN
  }

  // taxable: null=BUY (no tax concept), true=taxable SELL, false=exempt SELL
  const taxable = t.type !== 'SELL' ? null : exempt ? false : true

  acc.rows.push({
    ...t,
    '#': i + 1,
    taxable,
    taxExemptLabel: t.type !== 'SELL'
      ? ''
      : exempt
        ? 'Освободен'
        : 'Облагаем',
    rate,
    totalWithFee,
    totalWithFeeBGN,
    costBasis,
    costBasisBGN,
  })

  return acc
}, {
  positions: {},
  rows: []
})

const enrichedRows = result.rows
const positionsCostBasis = result.positions
console.info('Open positions:', positionsCostBasis)
  const holdings = parseOpenPositions(rows, instrumentInfo, positionsCostBasis);
  
    // ── Totals rows ────────────────────────────────────────────────────────────
    const sumCols    = ['proceeds', 'comm', 'fee', 'totalWithFee']
    const sumBgnCols = ['totalWithFeeBGN']
  
    const dataRows = [...enrichedRows];
    ['EUR', 'USD'].forEach(cur => {
      const subset = dataRows.filter(r => r.currency === cur)
      if (subset.length === 0) return
      const row = { _total: true, currency: cur }
      sumCols.forEach(k    => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      sumBgnCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      enrichedRows.push(row)
    })
    {
      const row = { _total: true, currency: 'BGN' }
      sumBgnCols.forEach(k => { row[k] = dataRows.reduce((s, r) => s + (r[k] ?? 0), 0) })
      enrichedRows.push(row)
    }
  
    // ── App5 / App13 ───────────────────────────────────────────────────────────
    const sells         = dataRows.filter(r => r.type === 'SELL')
    const taxableSells  = sells.filter(r => !isTaxExempt(r, instrumentInfo))
    const exemptSells   = sells.filter(r =>  isTaxExempt(r, instrumentInfo))
    const app5  = summarizeSells(taxableSells)
    const app13 = summarizeSells(exemptSells)
  
    // ── Column definitions ─────────────────────────────────────────────────────
    const numCol = { key: '#', label: '#', align: 'right', mono: true, decimals: 0 }
    const extraCols = [
      { key: 'totalWithFee',   label: 'Общо + такси (вал)', align: 'right', mono: true, decimals: 2 },
      { key: 'rate',           label: 'Курс (лв)',          align: 'right', mono: true, decimals: 5, nullAs: '—' },
      { key: 'totalWithFeeBGN',label: 'Общо + такси (лв)',  align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'costBasis',      label: 'Цена на придобиване (вал)', align: 'right', mono: true, decimals: 2, nullAs: '—' },
      { key: 'costBasisBGN',   label: 'Цена на придобиване (лв)',  align: 'right', mono: true, decimals: 2, nullAs: '—' },
    ]
  
    const trades = {
      columns: [numCol, ...processedTrades.columns, ...extraCols],
      rows: enrichedRows,
    };

  // Last BUY date and net bought quantity per symbol — derived from processed trades
  const lastBuyDate = {};
  const netBuyQty   = {};
  enrichedRows.forEach(t => {
    if (t.type === 'BUY') {
      if (!lastBuyDate[t.symbol] || t.date > lastBuyDate[t.symbol]) lastBuyDate[t.symbol] = t.date
      netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) + t.quantity
    } else if (t.type === 'SELL') {
      netBuyQty[t.symbol] = (netBuyQty[t.symbol] ?? 0) - t.quantity
    }
  })

  // ── App8 Part I – holdings for declaration ────────────────────────────────
  const app8Holdings = {
    title: "",
    columns: [
      { key: "symbol", label: "Символ", bold: true, tooltip: "description" },
      { key: "type", label: "Вид", bold: true },
      { key: "country", label: "Държава" },
      {
        key: "quantity",
        label: "Брой",
        align: "right",
        mono: true,
        decimals: 0,
      },
      {
        key: "acquDate",
        label: "Дата и година на придобиване",
        shortLabel: "Дата",
        mono: true,
        maxWidth: 80,
      },
      {
        key: "costBasis",
        label: "Обща цена в съответната валута",
        shortLabel: "Обща цена",
        align: "right",
        mono: true,
        decimals: 2,
      },
      { key: "currency", label: "Валута" },
      {
        key: "costBGN",
        label: "Обща цена в лева",
        align: "right",
        mono: true,
        decimals: 2,
        nullAs: "—",
      },
    ],
    rows: holdings.rows
      .flatMap((h) => {
        const info = instrumentInfo[h.symbol] || {};
        const type = info.type === "ETF" ? "Дялове" : "Акции";
        const country = info.countryName || h.currency;
        const description = info.description ?? "";
        const thisYearQty = Math.max(0, Math.min(netBuyQty[h.symbol] ?? 0, h.quantity));
        const priorQty = h.quantity - thisYearQty;
        const costPerShare = h.costBasis / h.quantity;
        const acquDateStr = lastBuyDate[h.symbol]
          ? lastBuyDate[h.symbol].split("-").reverse().join(".")
          : null;

        const makeRow = (qty, acquDate) => {
          const cost = Math.round(qty * costPerShare * 100) / 100;
          return {
            type,
            country,
            symbol: h.symbol,
            description,
            quantity: qty,
            acquDate,
            costBasis: cost,
            currency: h.currency,
            costBGN: acquDate === "предходна година" ? null : toBGN(cost, h.currency, YEAR_END_DATE),
          };
        };

        if (thisYearQty > 0 && priorQty > 0) {
          return [
            makeRow(thisYearQty, acquDateStr ?? "предходна година"),
            makeRow(priorQty, "предходна година"),
          ];
        }
        return [makeRow(h.quantity, acquDateStr ?? "предходна година")];
      })
      .sort((a, b) => (a.type === b.type ? 0 : a.type === "Акции" ? -1 : 1)),
  };

  // ── App8 Part III – dividends for declaration ─────────────────────────────
  const app8Dividends = {
    columns: [
      { key: "symbol", label: "Символ", bold: true, tooltip: "description" },
      {
        key: "description",
        label: "Наименование на лицето, изплатило дохода",
        shortLabel: "Наименование",
        mono: true,
        maxWidth: 200,
      },
      { key: "countryName", label: "Държава" },
      {
        key: "incomeCategoryCode",
        label: "Код вид доход",
        shortLabel: "Код доход",
      },
      {
        key: "methodCode",
        label:
          "Код за прилагане на метод за избягване на двойното данъчно облагане",
        shortLabel: "Код метод",
      },
      {
        key: "grossAmountBGN",
        label:
          "Брутен размер на дохода, включително платения данък (за доходи с код 8141)",
        shortLabel: "Брутен доход (лв)",
        align: "right",
        mono: true,
        decimals: 2,
        nullAs: "—",
      },
      {
        key: "foreignTaxPaidBGN",
        label: "Платен данък в чужбина",
        shortLabel: "Данък в чужбина (лв)",
        align: "right",
        mono: true,
        decimals: 2,
        nullAs: "—",
      },
      {
        key: "allowableCreditBGN",
        label: "Допустим размер на данъчния кредит",
        shortLabel: "Допустим кредит (лв)",
        align: "right",
        mono: true,
        decimals: 2,
        nullAs: "—",
      },
      {
        key: "dueTaxBGN",
        label:
          "Дължим данък, подлежащ на внасяне по реда на чл. 67, ал. 4 от ЗДДФЛ",
        shortLabel: "Дължим данък (лв)",
        align: "right",
        mono: true,
        decimals: 2,
        nullAs: "—",
      },
    ],
    rows: dividends.rows.map((d) => {
      const grossBGN = toBGN(d.grossAmount, d.currency, d.date);
      const withheldBGN = toBGN(d.withheldTax, d.currency, d.date);
      const bgTaxBGN =
        grossBGN != null ? grossBGN * BG_DIVIDEND_TAX_RATE : null;
      // Допустим кредит (col 11): only filled when foreign tax < BG tax (partial credit)
      // When foreign tax ≥ BG tax the credit covers everything → col 11 = 0, col 12 = 0
      const partialCredit =
        bgTaxBGN != null && withheldBGN != null && withheldBGN < bgTaxBGN
          ? withheldBGN
          : null;
      const allowableBGN = d.taxCode === 1 ? partialCredit : null;
      const dueTaxBGN =
        bgTaxBGN != null && withheldBGN != null
          ? Math.max(0, bgTaxBGN - (withheldBGN ?? 0))
          : bgTaxBGN;
      return {
        symbol: d.symbol,
        description: instrumentInfo[d.symbol]?.description ?? "",
        countryName: d.countryName,
        incomeCategoryCode: 8141,
        methodCode: d.taxCode,
        grossAmountBGN: grossBGN,
        foreignTaxPaidBGN: withheldBGN,
        allowableCreditBGN: allowableBGN,
        dueTaxBGN,
      };
    }),
  };

  // ── Enrich interest rows with BGN amounts ────────────────────────────────
  interest.rows.forEach((r) => {
    r.amountBGN = toBGN(r.amount, r.currency, r.date);
  });

  // ── Holdings totals rows ──────────────────────────────────────────────────
  const holdingSumCols = ['quantity', 'costBasis', 'costPrice', 'value', 'unrealizedPL'];
  ['EUR', 'USD'].forEach(cur => {
    const subset = holdings.rows.filter(r => r.currency === cur);
    if (subset.length === 0) return;
    const row = { _total: true, currency: cur };
    holdingSumCols.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0); });
    holdings.rows.push(row);
  });

  return {
    trades,
    holdings,
    dividends,
    interest,
    taxSummary: { app5, app13, app8Holdings, app8Dividends },
  };
}
