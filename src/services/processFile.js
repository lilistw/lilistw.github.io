import { parseCSV } from "../infra/csvReader.js";
import { parseTrades } from "../domain/parser/ibkrParser.js";
import { parseOpenPositions } from "../domain/parser/parseOpenPositions.js";
import { parseFinancialInstrumentInfo } from "../domain/parser/parseFinancialInstrumentInfo.js";
import { parseDividends } from "../domain/parser/parseDividends.js";
import { parseInterest } from "../domain/parser/parseInterest.js";
import { EU_EEA_EXCHANGE_CODES } from "../domain/constants.js";
import { toBGN, YEAR_END_DATE } from "../domain/fx/fxRates.js";

const BG_DIVIDEND_TAX_RATE = 0.05;

// ETF listed on an EU/EEA regulated exchange → gains are tax-exempt under ЗДДФЛ Art. 13(1)(3)
function isEuEtf(symbol, instrumentInfo) {
  const info = instrumentInfo[symbol];
  return info?.type === "ETF" && EU_EEA_EXCHANGE_CODES.has(info.listingExch);
}

// cost basis of a sell = Proceeds - Fee - RealizedPL
function sellCostBasis(t) {
  return t.proceeds - t.fee - t.realizedPL;
}

function summarizeSells(sells) {
  const totalProceedsBGN = sells.reduce((s, t) => s + (t.proceedsBGN ?? 0), 0);
  const totalCostBasisBGN = sells.reduce(
    (s, t) => s + (t.costBasisBGN ?? 0),
    0,
  );
  const profits = sells.reduce(
    (s, t) => (t.realizedPLBGN > 0 ? s + t.realizedPLBGN : s),
    0,
  );
  const losses = sells.reduce(
    (s, t) => (t.realizedPLBGN < 0 ? s + Math.abs(t.realizedPLBGN) : s),
    0,
  );
  return { totalProceedsBGN, totalCostBasisBGN, profits, losses };
}

export async function processFile(file) {
  const text = await file.text();
  const rows = parseCSV(text);

  const instrumentInfo = parseFinancialInstrumentInfo(rows);
  const trades = parseTrades(rows);
  const holdings = parseOpenPositions(rows, instrumentInfo);
  const dividends = parseDividends(rows, instrumentInfo);
  const interest = parseInterest(rows);

  // ── Enrich trades with BGN amounts + description for tooltips ────────────
  trades.rows.forEach((t) => {
    t.description = instrumentInfo[t.symbol]?.description ?? "";
    t.proceedsBGN = toBGN(t.proceeds, t.currency, t.date);
    t.costBasisBGN = toBGN(sellCostBasis(t), t.currency, t.date);
    t.realizedPLBGN =
      t.proceedsBGN != null && t.costBasisBGN != null
        ? t.proceedsBGN -
        t.costBasisBGN -
        (toBGN(t.fee, t.currency, t.date) ?? 0)
        : null;
  });

  // Add description tooltip to trades symbol column
  const tradesSymbolCol = trades.columns.find((c) => c.key === "symbol");
  if (tradesSymbolCol) tradesSymbolCol.tooltip = "description";

  // Add BGN columns to the trades DataTable (after realizedPL)
  trades.columns.push(
    {
      key: "proceedsBGN",
      label: "Постъпления (лв)",
      align: "right",
      mono: true,
      decimals: 2,
      nullAs: "—",
    },
    {
      key: "realizedPLBGN",
      label: "П/З (лв)",
      align: "right",
      mono: true,
      decimals: 2,
      pnl: true,
      zeroAs: "—",
      nullAs: "—",
    },
  );

  // ── App5 / App13 tax summaries ─────────────────────────────────────────────
  const sellTrades = trades.rows.filter((t) => t.type === "SELL");
  const taxableSells = sellTrades.filter(
    (t) => !isEuEtf(t.symbol, instrumentInfo),
  );
  const euEtfSells = sellTrades.filter((t) =>
    isEuEtf(t.symbol, instrumentInfo),
  );

  const app5 = summarizeSells(taxableSells);
  const app13 = summarizeSells(euEtfSells);

  // Last BUY date and net bought quantity per symbol (across aliases)
  const lastBuyDate = {};
  const netBuyQty = {};
  trades.rows.forEach((t) => {
    const aliases = instrumentInfo[t.symbol]?.aliases ?? [t.symbol];
    aliases.forEach((sym) => {
      if (t.type === "BUY") {
        if (!lastBuyDate[sym] || t.date > lastBuyDate[sym])
          lastBuyDate[sym] = t.date;
        netBuyQty[sym] = (netBuyQty[sym] ?? 0) + t.quantity;
      } else if (t.type === "SELL") {
        netBuyQty[sym] = (netBuyQty[sym] ?? 0) - t.quantity;
      }
    });
  });

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

  return {
    trades,
    holdings,
    dividends,
    interest,
    taxSummary: { app5, app13, app8Holdings, app8Dividends },
  };
}
