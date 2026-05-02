import { buildInstrumentInfo } from '@core/parser/parsers/parseInstruments.js'
import { buildCsvTradeBasis } from '@core/parser/parsers/parseCsvTrades.js'

import { DividendCalculator } from '../domain/tax/DividendCalculator.js'
import { InterestCalculator } from '../domain/tax/InterestCalculator.js'
import { TradeCalculator } from '../domain/tax/TradeCalculator.js'
import { HoldingsCalculator } from '../domain/tax/HoldingsCalculator.js'

// -------------------------
// SERVICE
// -------------------------
export function calculateTax(input, priorPositions = [], { strategy = 'ibkr' } = {}) {
  const { taxContext } = input

  const instrumentInfo = buildInstrumentInfo(input.instruments)
  const csvTradeBasis = buildCsvTradeBasis(input.csvTrades)

  // --- TRADES ---
  const tradeCalc = new TradeCalculator({ instrumentInfo, csvTradeBasis, taxContext, strategy })
  const { trades, calculatedPositions, taxSummary } = tradeCalc.calculate(input.trades, priorPositions)

  // --- HOLDINGS ---
  const holdingsCalc = new HoldingsCalculator({ instrumentInfo })

  const holdings = holdingsCalc.calculate({
    openPositions: input.openPositions,
    positions: calculatedPositions,
    priorPositions,
    trades: input.trades,
  })

  // --- DIVIDENDS (domain) ---
  const dividends = new DividendCalculator({
    instrumentInfo,
    taxContext,
  }).calculate(input)

  // --- INTEREST ---
  const interest = new InterestCalculator({
    taxContext,
  }).calculate(input)

  // --- RESULT ---
  return {
    trades,
    taxSummary,
    holdings,
    dividends,
    interest,
    taxContext
  }
}