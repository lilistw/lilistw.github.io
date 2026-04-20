import Decimal from 'decimal.js'
import { buildInstrumentInfo } from '../domain/parser/parseInstruments.js'
import { buildCsvTradeBasis } from '../domain/parser/parseCsvTrades.js'
import {
  getLocalCurrencyCode, getLocalCurrencyLabel,
  getPrevYearEndDate,
} from '../domain/fx/fxRates.js'
import { IBKR_EXCHANGES } from '../domain/constants.js'
import { DividendCalculator } from '../domain/tax/DividendCalculator.js'
import { InterestCalculator } from '../domain/tax/InterestCalculator.js'
import { TradeCalculator } from '../domain/tax/TradeCalculator.js'
import { HoldingsCalculator } from '../domain/tax/HoldingsCalculator.js'

export function calculateTax(input, priorPositions = []) {
    const { taxYear } = input

    const instrumentInfo = buildInstrumentInfo(input.instruments)
    const csvTradeBasis = buildCsvTradeBasis(input.csvTrades)

    const localCurrencyCode = getLocalCurrencyCode(taxYear)
    const localCurrencyLabel = getLocalCurrencyLabel(taxYear)

    // --- TRADES ---
    const tradeCalc = new TradeCalculator({
      instrumentInfo,
      taxYear,
      csvTradeBasis,
      prevYearEndDate: getPrevYearEndDate(taxYear),
      localCurrencyLabel
    })

    const tradeResult = tradeCalc.calculate(input.trades, priorPositions)

    // --- HOLDINGS ---
    const holdingsCalc = new HoldingsCalculator({
      instrumentInfo,
      lcl: localCurrencyLabel,
    })

    const holdingsResult = holdingsCalc.calculate({
      openPositions: input.openPositions,
      positions: tradeResult.positions,
      priorPositions,
      trades: input.trades,
    })

    // --- DIVIDENDS ---
    const dividends = new DividendCalculator({
      instrumentInfo,
      taxYear,
      lcl: localCurrencyLabel,
    }).calculate(input)

    // --- INTEREST ---
    const interest = new InterestCalculator({
      taxYear,
      localCurrencyCode,
      localCurrencyLabel,
    }).calculate(input)

    return {
      trades: tradeResult.trades,
      holdings: holdingsResult.holdings,
      dividends: dividends.dividends,
      interest,
      taxSummary: {
        app5: tradeResult.app5,
        app13: tradeResult.app13,
        app8Holdings: holdingsResult.app8Holdings,
        app8Dividends: dividends.app8Dividends,
      },
      taxYear,
      localCurrencyCode,
      localCurrencyLabel,
    }
}


